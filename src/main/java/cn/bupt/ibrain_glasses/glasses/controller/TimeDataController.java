package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.mapper.TimeDataMapper;
import cn.bupt.ibrain_glasses.glasses.model.OrgDataShare;
import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import cn.bupt.ibrain_glasses.glasses.model.TimeDataPK;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import cn.bupt.ibrain_glasses.glasses.service.TimeDataService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private static final Logger logger = LoggerFactory.getLogger(TimeDataController.class);

    @Autowired
    private TimeDataMapper timeDataMapper;
    public TimeDataController(TimeDataService tdService,
                              UserService userService,
                              OrgDataShareService shareService) {
        this.timeDataService = tdService;
        this.userService = userService;
        this.orgDataShareService = shareService;
    }


    @PostMapping("/batch")
    public ResponseEntity<ApiResponse> uploadTimeData(@RequestBody List<TimeData> timeDataList) {
        if (CollectionUtils.isEmpty(timeDataList)) {
            logger.error("Upload time data failed: empty list");
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "参数错误：上传为空列表");
        }

        List<String> invalidKeys = new ArrayList<>();
        List<String> duplicateKeys = new ArrayList<>();

        for (TimeData t : timeDataList) {
            TimeDataPK k = (t == null) ? null : t.getTimeDataPK();
            String sp = (k == null) ? null : k.getSubjectPhone();
            String gm = (k == null) ? null : k.getGlassesMac();
            String u  = (t == null) ? null : t.getUsername();
            String key = "(" + sp + "," + gm + ")";

            boolean ok =
                    t != null &&
                            sp != null && sp.length() == 11 &&
                            gm != null && gm.length() == 17 &&
                            u  != null && u.length()  == 11 &&
                            t.getStartTime() != null &&
                            t.getDuration() != null && t.getDuration() > 0;

            if (!ok) {
                invalidKeys.add(key);
                logger.error("Invalid time data: key={}, username={}, start_time={}, duration={}",
                        key, u, (t == null ? null : t.getStartTime()), (t == null ? null : t.getDuration()));
                continue;
            }

            try {
                timeDataMapper.insertTimeData(t);
                logger.info("Inserted time data: key={}, username={}, start_time={}, duration={}",
                        key, u, t.getStartTime(), t.getDuration());
            } catch (org.springframework.dao.DuplicateKeyException ex) {
                duplicateKeys.add(key);
                logger.warn("Duplicate time data: key={}, username={}", key, u);
            }
        }

        if (invalidKeys.isEmpty() && duplicateKeys.isEmpty()) {
            logger.info("Batch insert success: total={}, invalid=0, duplicate=0", timeDataList.size());
            return ApiResponse.createResponse(HttpStatus.OK.value(), "全部保存成功");
        }

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
        public String getUsername() { return username; }
        public void setUsername(String u) { this.username = u; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String s) { this.startTime = s; }
        public Integer getDuration() { return duration; }
        public void setDuration(Integer d) { this.duration = d; }
    }
}
