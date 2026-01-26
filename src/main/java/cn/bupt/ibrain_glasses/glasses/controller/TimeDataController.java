package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.OrgDataShare;
import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import cn.bupt.ibrain_glasses.glasses.service.TimeDataService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/time-data")
public class TimeDataController {
    private final TimeDataService timeDataService;
    private final UserService userService;
    private final OrgDataShareService orgDataShareService;

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
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "上传数据不能为空");
        }
        List<TimeData> validRecords = new ArrayList<>();
        List<TimeData> invalidRecords = new ArrayList<>();
        for (TimeData record : timeDataList) {
            if (record == null
                    || record.getSubjectPhone() == null
                    || !record.getSubjectPhone().matches("\\d{11}")
                    || record.getGlassesMac() == null
                    || record.getGlassesMac().trim().isEmpty()
                    || record.getUsername() == null
                    || !record.getUsername().matches("\\d{11}")
                    || record.getStartTime() == null
                    || record.getDuration() == null
                    || record.getDuration() <= 0
                    || record.getSubjectName() == null
                    || record.getSubjectName().trim().isEmpty()
                    || record.getSubjectGender() == null
                    || !isValidGender(record.getSubjectGender())
                    || record.getSubjectAge() == null
                    || record.getSubjectAge() <= 0) {
                invalidRecords.add(record);
            } else {
                validRecords.add(record);
            }
        }
        if (!validRecords.isEmpty()) {
            timeDataService.saveBatch(validRecords);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("successCount", validRecords.size());
        result.put("failedCount", invalidRecords.size());
        result.put("failedRecords", invalidRecords);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "上传完成", result);
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
        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", results);
    }

    /**
     * 修改 TimeData 记录
     */
    @PutMapping("/{subjectPhone}/{glassesMac}")
    public ResponseEntity<ApiResponse> updateTimeData(@PathVariable String subjectPhone,
                                                      @PathVariable String glassesMac,
                                                      @RequestBody UpdateTimeDataDto dto) {
        // 根据复合主键定位记录
        QueryWrapper<TimeData> query = new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac);
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
            LocalDateTime newStart;
            try {
                String startStr = dto.getStartTime();
                if (startStr.length() <= 16) {
                    // 格式：yyyy-MM-dd'T'HH:mm
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
                    newStart = LocalDateTime.parse(startStr, fmt);
                } else {
                    // 格式：yyyy-MM-dd'T'HH:mm:ss
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
                    newStart = LocalDateTime.parse(startStr, fmt);
                }
            } catch (DateTimeParseException e) {
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
                                                      @RequestParam String username) {
        User currentUser = userService.getById(username);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "未授权的访问");
        }
        // 查找要删除的记录
        QueryWrapper<TimeData> query = new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac);
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

    private boolean isValidGender(String gender) {
        return "男".equals(gender) || "女".equals(gender);
    }
}
