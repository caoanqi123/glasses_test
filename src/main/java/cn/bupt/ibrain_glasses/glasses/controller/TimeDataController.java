package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.OrgDataShare;
import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import cn.bupt.ibrain_glasses.glasses.model.TimeDataPK;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import cn.bupt.ibrain_glasses.glasses.service.TimeDataService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@RestController
@RequestMapping("/time-data")
public class TimeDataController {
    private final TimeDataService timeDataService;
    private final UserService userService;
    private final OrgDataShareService orgDataShareService;
    private static final Logger logger = LoggerFactory.getLogger(TimeDataController.class);

    public TimeDataController(TimeDataService tdService,
                              UserService userService,
                              OrgDataShareService shareService) {
        this.timeDataService = tdService;
        this.userService = userService;
        this.orgDataShareService = shareService;
    }

    /**
     * 批量上传 TimeData
     */
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse> uploadTimeData(@RequestBody List<TimeData> timeDataList) {
        if (timeDataList == null || timeDataList.isEmpty()) {
            logger.error("Upload time data failed: empty list");
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "参数错误：上传为空列表");
        }

        List<String> invalidKeys = new ArrayList<>();
        List<String> duplicateKeys = new ArrayList<>();

        // 用于检测“同一批请求体内部”的重复 key
        Set<String> seenKeys = new HashSet<>();

        for (TimeData record : timeDataList) {
            String sp = (record == null ? null : record.getSubjectPhone());
            String gm = (record == null ? null : record.getGlassesMac());
            String u  = (record == null ? null : record.getUsername());
            String key = "(" + sp + "," + gm + ")";

            boolean ok =
                    record != null
                            && sp != null && sp.matches("\\d{11}")
                            && gm != null && !gm.trim().isEmpty()               // 如需严格 17 位，可改成 gm.length()==17
                            && u  != null && u.matches("\\d{11}")
                            && record.getStartTime() != null
                            && record.getDuration() != null && record.getDuration() > 0
                            && record.getSubjectName() != null && !record.getSubjectName().trim().isEmpty()
                            && record.getSubjectGender() != null && isValidGender(record.getSubjectGender())
                            && record.getSubjectAge() != null && record.getSubjectAge() > 0
                            && record.getFrequency() != null && record.getFrequency() >= 0
                            && (record.getLightBrightness() == null || record.getLightBrightness() >= 0)
                            && (record.getSoundVolume() == null || record.getSoundVolume() >= 0)
                            && (record.getSyncBrightness() == null || record.getSyncBrightness() >= 0)
                            && (record.getSyncVolume() == null || record.getSyncVolume() >= 0);

            if (!ok) {
                invalidKeys.add(key);
                logger.error("Invalid time data: key={}, username={}, start_time={}, duration={}, name={}, gender={}, age={}",
                        key, u,
                        (record == null ? null : record.getStartTime()),
                        (record == null ? null : record.getDuration()),
                        (record == null ? null : record.getSubjectName()),
                        (record == null ? null : record.getSubjectGender()),
                        (record == null ? null : record.getSubjectAge()));
                continue;
            }

            // 请求体内重复
            if (!seenKeys.add(key)) {
                duplicateKeys.add(key);
                logger.warn("Duplicate in request list: key={}, username={}", key, u);
                continue;
            }

            // 入库，捕获数据库重复
            try {
                // 二选一：按你项目实际情况使用
                timeDataService.save(record);          // MyBatis-Plus 单条插入
                // timeDataMapper.insertTimeData(record); // 自定义 mapper 插入

                logger.info("Inserted time data: key={}, username={}, start_time={}, duration={}",
                        key, u, record.getStartTime(), record.getDuration());
            } catch (org.springframework.dao.DuplicateKeyException ex) {
                duplicateKeys.add(key);
                logger.warn("Duplicate in DB: key={}, username={}", key, u);
            }
        }

        // 全部成功
        if (invalidKeys.isEmpty() && duplicateKeys.isEmpty()) {
            logger.info("Batch insert success: total={}, invalid=0, duplicate=0", timeDataList.size());
            return ApiResponse.createResponse(HttpStatus.OK.value(), "全部保存成功");
        }

        // 只返回 msg（不带 data）
        String msg = (invalidKeys.isEmpty() ? "" : "格式错误：" + String.join("、", invalidKeys))
                + (!invalidKeys.isEmpty() && !duplicateKeys.isEmpty() ? "；" : "")
                + (duplicateKeys.isEmpty() ? "" : "重复：" + String.join("、", duplicateKeys));

        logger.error("Batch insert rejected: total={}, invalid={}, duplicate={}, msg={}",
                timeDataList.size(), invalidKeys.size(), duplicateKeys.size(), msg);

        return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), msg);
    }

    /**
     * 获取当前用户有权限查看的 TimeData 列表
     */
    @GetMapping
    public ResponseEntity<ApiResponse> listTimeData(@RequestParam String username) {
        User currentUser = userService.getById(username);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "未授权的访问");
        }
        String authType = currentUser.getAuthorityType();
        String orgId = currentUser.getOrganizationId();
        // 根据权限确定可查看的用户名集合
        Set<String> allowedUsernames = new HashSet<>();
        if ("个人".equals(authType)) {
            allowedUsernames.add(currentUser.getUsername());
        } else if ("组织".equals(authType) && orgId != null) {
            List<User> orgUsers = userService.list(
                    new QueryWrapper<User>().eq("organization_id", orgId));
            for (User u : orgUsers) {
                allowedUsernames.add(u.getUsername());
            }
        } else if ("管理员".equals(authType) || "超管".equals(authType)) {
            List<User> allUsers = userService.list();
            for (User u : allUsers) {
                allowedUsernames.add(u.getUsername());
            }
        }
        // 添加授权共享的其他组织数据用户名
        List<OrgDataShare> shares = orgDataShareService.list(
                new QueryWrapper<OrgDataShare>().eq("grantee_username", currentUser.getUsername()));
        for (OrgDataShare share : shares) {
            String sharedOrgId = share.getOrgDataSharePK().getOwnerOrganizationId();
            List<User> sharedOrgUsers = userService.list(
                    new QueryWrapper<User>().eq("organization_id", sharedOrgId));
            for (User u : sharedOrgUsers) {
                allowedUsernames.add(u.getUsername());
            }
        }
        if (allowedUsernames.isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", Collections.emptyList());
        }
        // 查询所有 username 属于 allowedUsernames 集合的时间数据
        List<TimeData> results = timeDataService.list(
                new QueryWrapper<TimeData>().in("username", allowedUsernames));
        List<TimeDataSummary> summaries = new ArrayList<>();
        for (TimeData record : results) {
            TimeDataSummary summary = new TimeDataSummary();
            summary.setTimeDataPK(record.getTimeDataPK());
            summary.setSubjectName(record.getSubjectName());
            summary.setSubjectGender(record.getSubjectGender());
            summary.setSubjectAge(record.getSubjectAge());
            summary.setUsername(record.getUsername());
            summary.setStartTime(record.getStartTime());
            summary.setDuration(record.getDuration());
            summaries.add(summary);
        }
        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", summaries);
    }

    /**
     * 修改 TimeData 记录
     */
    @PutMapping("/{subjectPhone}/{glassesMac}")
    public ResponseEntity<ApiResponse> updateTimeData(@PathVariable String subjectPhone,
                                                      @PathVariable String glassesMac,
                                                      @RequestParam String startTime,
                                                      @RequestBody UpdateTimeDataDto dto) {
        LocalDateTime startKey = parseStartTime(startTime);
        if (startKey == null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "开始时间格式不正确");
        }
        // 根据复合主键定位记录
        QueryWrapper<TimeData> query = new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac)
                .eq("start_time", startKey);
        TimeData record = timeDataService.getOne(query);
        if (record == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "记录不存在");
        }
        // 如提供新的账号，则校验其存在性并更新
        if (dto.getUsername() != null) {
            User user = userService.getById(dto.getUsername());
            if (user == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "账号不存在");
            }
            record.setUsername(dto.getUsername());
        }
        // 如提供新的持续时间，则校验非负整数并更新
        if (dto.getDuration() != null) {
            if (dto.getDuration() <= 0) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "持续时间必须为正整数");
            }
            record.setDuration(dto.getDuration());
        }
        // 如提供新的开始时间，则校验格式并更新
        if (dto.getStartTime() != null) {
            LocalDateTime newStart = parseStartTime(dto.getStartTime());
            if (newStart == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "开始时间格式不正确");
            }
            record.setStartTime(newStart);
        }
        if (dto.getSubjectName() != null) {
            if (dto.getSubjectName().trim().isEmpty()) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "被试姓名不能为空");
            }
            record.setSubjectName(dto.getSubjectName().trim());
        }
        if (dto.getSubjectGender() != null) {
            if (!isValidGender(dto.getSubjectGender())) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "被试性别必须为男或女");
            }
            record.setSubjectGender(dto.getSubjectGender());
        }
        if (dto.getSubjectAge() != null) {
            if (dto.getSubjectAge() <= 0) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "被试年龄必须为正整数");
            }
            record.setSubjectAge(dto.getSubjectAge());
        }
        // 执行更新
        timeDataService.update(record, query);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "修改成功");
    }

    /**
     * 删除 TimeData 记录
     */
    @DeleteMapping("/{subjectPhone}/{glassesMac}")
    public ResponseEntity<ApiResponse> deleteTimeData(@PathVariable String subjectPhone,
                                                      @PathVariable String glassesMac,
                                                      @RequestParam String startTime,
                                                      @RequestParam String username) {
        User currentUser = userService.getById(username);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "未授权的访问");
        }
        LocalDateTime startKey = parseStartTime(startTime);
        if (startKey == null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "开始时间格式不正确");
        }
        // 查找要删除的记录
        QueryWrapper<TimeData> query = new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac)
                .eq("start_time", startKey);
        TimeData record = timeDataService.getOne(query);
        if (record == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "记录未找到或已删除");
        }
        // 权限校验：个人用户只能删除自己的记录；组织用户只能删除本组织用户的记录（共享的数据不可删除）；管理员/超管可删除任意记录
        String authType = currentUser.getAuthorityType();
        if ("个人".equals(authType)) {
            if (!record.getUsername().equals(currentUser.getUsername())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限删除该记录");
            }
        } else if ("组织".equals(authType)) {
            User recordUser = userService.getById(record.getUsername());
            if (recordUser == null || !Objects.equals(recordUser.getOrganizationId(), currentUser.getOrganizationId())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限删除该记录");
            }
        }
        // 执行删除
        timeDataService.remove(query);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "删除成功");
    }

    @PostMapping("/export")
    public ResponseEntity<byte[]> exportTimeData(@RequestBody List<TimeDataKey> keys) throws IOException {
        if (keys == null || keys.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        QueryWrapper<TimeData> query = new QueryWrapper<>();
        boolean hasValid = false;
        for (TimeDataKey key : keys) {
            if (key == null || key.getSubjectPhone() == null || key.getGlassesMac() == null || key.getStartTime() == null) {
                continue;
            }
            LocalDateTime startKey = parseStartTime(key.getStartTime());
            if (startKey == null) {
                continue;
            }
            if (!hasValid) {
                query.eq("subject_phone", key.getSubjectPhone())
                        .eq("glasses_mac", key.getGlassesMac())
                        .eq("start_time", startKey);
                hasValid = true;
            } else {
                query.or()
                        .eq("subject_phone", key.getSubjectPhone())
                        .eq("glasses_mac", key.getGlassesMac())
                        .eq("start_time", startKey);
            }
        }
        if (!hasValid) {
            return ResponseEntity.badRequest().build();
        }
        List<TimeData> records = timeDataService.list(query);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("time_data");
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        CellStyle bodyStyle = workbook.createCellStyle();
        bodyStyle.setAlignment(HorizontalAlignment.CENTER);
        bodyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        int rowIndex = 0;
        Row header = sheet.createRow(rowIndex++);
        String[] headers = {
                "subjectPhone", "MAC", "startTime", "duration", "subjectName",
                "subjectGender", "subjectAge", "frequency", "light_brightness",
                "soound_volume", "sync_brightness", "sync_volume"
        };
        int[] maxWidths = new int[headers.length];
        for (int i = 0; i < headers.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            maxWidths[i] = headers[i].length();
        }
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (TimeData record : records) {
            Row row = sheet.createRow(rowIndex++);
            String[] values = {
                    defaultString(record.getSubjectPhone()),
                    defaultString(record.getGlassesMac()),
                    record.getStartTime() == null ? "" : record.getStartTime().format(fmt),
                    formatDuration(record.getDuration()),
                    defaultString(record.getSubjectName()),
                    defaultString(record.getSubjectGender()),
                    record.getSubjectAge() == null ? "" : String.valueOf(record.getSubjectAge()),
                    record.getFrequency() == null ? "" : String.valueOf(record.getFrequency()),
                    record.getLightBrightness() == null ? "" : String.valueOf(record.getLightBrightness()),
                    record.getSoundVolume() == null ? "" : String.valueOf(record.getSoundVolume()),
                    record.getSyncBrightness() == null ? "" : String.valueOf(record.getSyncBrightness()),
                    record.getSyncVolume() == null ? "" : String.valueOf(record.getSyncVolume())
            };
            for (int i = 0; i < values.length; i++) {
                Cell cell = row.createCell(i);
                cell.setCellValue(values[i]);
                cell.setCellStyle(bodyStyle);
                if (values[i] != null) {
                    maxWidths[i] = Math.max(maxWidths[i], values[i].length());
                }
            }
        }
        for (int i = 0; i < headers.length; i++) {
            int width = Math.min(255, maxWidths[i] + 8);
            sheet.setColumnWidth(i, width * 256);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header("Content-Disposition", "attachment; filename=\"time_data.xlsx\"")
                .body(outputStream.toByteArray());
    }

    // DTO 类：用于更新 TimeData 接收的数据
    static class UpdateTimeDataDto {
        private String username;
        private String startTime;
        private Integer duration;
        private String subjectName;
        private String subjectGender;
        private Integer subjectAge;
        public String getUsername() { return username; }
        public void setUsername(String u) { this.username = u; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String s) { this.startTime = s; }
        public Integer getDuration() { return duration; }
        public void setDuration(Integer d) { this.duration = d; }
        public String getSubjectName() { return subjectName; }
        public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
        public String getSubjectGender() { return subjectGender; }
        public void setSubjectGender(String subjectGender) { this.subjectGender = subjectGender; }
        public Integer getSubjectAge() { return subjectAge; }
        public void setSubjectAge(Integer subjectAge) { this.subjectAge = subjectAge; }
    }

    static class TimeDataSummary {
        private TimeDataPK timeDataPK;
        private String subjectName;
        private String subjectGender;
        private Integer subjectAge;
        private String username;
        private LocalDateTime startTime;
        private Integer duration;
        public TimeDataPK getTimeDataPK() { return timeDataPK; }
        public void setTimeDataPK(TimeDataPK timeDataPK) { this.timeDataPK = timeDataPK; }
        public String getSubjectName() { return subjectName; }
        public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
        public String getSubjectGender() { return subjectGender; }
        public void setSubjectGender(String subjectGender) { this.subjectGender = subjectGender; }
        public Integer getSubjectAge() { return subjectAge; }
        public void setSubjectAge(Integer subjectAge) { this.subjectAge = subjectAge; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        public Integer getDuration() { return duration; }
        public void setDuration(Integer duration) { this.duration = duration; }
    }

    static class TimeDataKey {
        private String subjectPhone;
        private String glassesMac;
        private String startTime;
        public String getSubjectPhone() { return subjectPhone; }
        public void setSubjectPhone(String subjectPhone) { this.subjectPhone = subjectPhone; }
        public String getGlassesMac() { return glassesMac; }
        public void setGlassesMac(String glassesMac) { this.glassesMac = glassesMac; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
    }

    private boolean isValidGender(String gender) {
        return "男".equals(gender) || "女".equals(gender);
    }

    private static String formatDuration(Integer seconds) {
        if (seconds == null || seconds < 0) {
            return "";
        }
        int minutes = seconds / 60;
        int remainingSeconds = seconds % 60;
        return String.format("%02d:%02d", minutes, remainingSeconds);
    }

    private static String defaultString(String value) {
        return value == null ? "" : value;
    }

    private LocalDateTime parseStartTime(String startStr) {
        if (startStr == null || startStr.trim().isEmpty()) {
            return null;
        }
        try {
            if (startStr.length() <= 16) {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
                return LocalDateTime.parse(startStr, fmt);
            }
            if (startStr.length() <= 19 && !startStr.contains("T")) {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                return LocalDateTime.parse(startStr, fmt);
            }
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
            return LocalDateTime.parse(startStr, fmt);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
