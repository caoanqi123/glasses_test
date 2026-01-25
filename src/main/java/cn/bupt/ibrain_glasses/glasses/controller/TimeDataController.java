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
@RequestMapping("/api/time-data")
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
     * 获取当前用户有权限查看的 time_data 列表（统一响应体）
     */
    @GetMapping
    public ResponseEntity<ApiResponse> listTimeData(@RequestParam String username) {

        User currentUser = userService.getById(username);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "未授权的访问");
        }

        String authType = currentUser.getAuthorityType();
        String orgId = currentUser.getOrganizationId();

        Set<String> allowedUsernames = new HashSet<String>();

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

        // 授权组织共享数据
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

        List<TimeData> results = timeDataService.list(
                new QueryWrapper<TimeData>().in("username", allowedUsernames));

        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", results);
    }

    /**
     * 修改 time_data
     */
    @PutMapping("/{subjectPhone}/{glassesMac}")
    public ResponseEntity<ApiResponse> updateTimeData(@PathVariable String subjectPhone,
                                                      @PathVariable String glassesMac,
                                                      @RequestBody UpdateTimeDataDto dto) {

        QueryWrapper<TimeData> query = new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac);
        TimeData record = timeDataService.getOne(query);

        if (record == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "记录不存在");
        }

        if (dto.getUsername() != null) {
            User user = userService.getById(dto.getUsername());
            if (user == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "指定的账号不存在");
            }
            record.setUsername(dto.getUsername());
        }

        if (dto.getDuration() != null) {
            if (dto.getDuration() < 0) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "持续时间不能为负数");
            }
            record.setDuration(dto.getDuration());
        }

        if (dto.getStartTime() != null) {
            LocalDateTime newStart;
            try {
                String startStr = dto.getStartTime();
                if (startStr.length() <= 16) {
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
                    newStart = LocalDateTime.parse(startStr, fmt);
                } else {
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
                    newStart = LocalDateTime.parse(startStr, fmt);
                }
            } catch (DateTimeParseException e) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "开始时间格式不正确");
            }
            record.setStartTime(newStart);
        }

        timeDataService.update(record, query);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "修改成功");
    }

    /**
     * 删除 time_data
     */
    @DeleteMapping("/{subjectPhone}/{glassesMac}")
    public ResponseEntity<ApiResponse> deleteTimeData(@PathVariable String subjectPhone,
                                                      @PathVariable String glassesMac) {

        boolean removed = timeDataService.remove(new QueryWrapper<TimeData>()
                .eq("subject_phone", subjectPhone)
                .eq("glasses_mac", glassesMac));

        if (!removed) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "记录未找到或已删除");
        }
        return ApiResponse.createResponse(HttpStatus.OK.value(), "删除成功");
    }

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
