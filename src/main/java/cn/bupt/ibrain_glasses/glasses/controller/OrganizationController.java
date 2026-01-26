package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.OrgDataShare;
import cn.bupt.ibrain_glasses.glasses.model.Organization;
import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import cn.bupt.ibrain_glasses.glasses.service.OrganizationService;
import cn.bupt.ibrain_glasses.glasses.service.TimeDataService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 组织管理接口
 */
@RestController
@RequestMapping("/organizations")
public class OrganizationController {
    private final OrganizationService service;
    private final UserService userService;
    private final TimeDataService timeDataService;
    private final OrgDataShareService orgDataShareService;

    public OrganizationController(OrganizationService service,
                                  UserService userService,
                                  TimeDataService timeDataService,
                                  OrgDataShareService orgDataShareService) {
        this.service = service;
        this.userService = userService;
        this.timeDataService = timeDataService;
        this.orgDataShareService = orgDataShareService;
    }

    /**
     * 获取组织列表
     */
    @GetMapping
    public ResponseEntity<ApiResponse> listOrganizations() {
        List<Organization> orgs = service.list();
        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", orgs);
    }

    /**
     * 新增组织
     */
    @PostMapping
    public ResponseEntity<ApiResponse> createOrganization(@RequestParam String currentUsername,
                                                          @RequestBody Organization org) {
        User currentUser = userService.getById(currentUsername);
        if (currentUser == null || "个人".equals(currentUser.getAuthorityType())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }
        if (org.getOrganizationId() == null || org.getOrganizationId().trim().isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织ID不能为空");
        }
        if (org.getOrganizationName() == null || org.getOrganizationName().trim().isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织名称不能为空");
        }
        if (service.getById(org.getOrganizationId()) != null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织ID已存在");
        }
        Organization newOrg = new Organization();
        newOrg.setOrganizationId(org.getOrganizationId().trim());
        newOrg.setOrganizationName(org.getOrganizationName().trim());
        service.save(newOrg);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "组织创建成功");
    }

    /**
     * 修改组织名称（组织ID不可变）
     */
    @PutMapping("/{orgId}")
    public ResponseEntity<ApiResponse> updateOrganization(@PathVariable String orgId,
                                                          @RequestParam String currentUsername,
                                                          @RequestBody UpdateOrgDto dto) {
        User currentUser = userService.getById(currentUsername);
        if (currentUser == null || "个人".equals(currentUser.getAuthorityType())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }
        if ("001".equals(orgId)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "该组织不可修改");
        }
        if ("组织".equals(currentUser.getAuthorityType())
                && !Objects.equals(currentUser.getOrganizationId(), orgId)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "只能修改本组织");
        }
        Organization org = service.getById(orgId);
        if (org == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "组织不存在");
        }
        if (dto.getOrganizationName() == null || dto.getOrganizationName().trim().isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织名称不能为空");
        }
        org.setOrganizationName(dto.getOrganizationName().trim());
        service.updateById(org);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "组织信息已更新");
    }

    /**
     * 删除组织：迁移数据 -> 删除组织用户 -> 删除组织
     */
    @DeleteMapping("/{orgId}")
    @Transactional
    public ResponseEntity<ApiResponse> deleteOrganization(@PathVariable String orgId,
                                                          @RequestParam String currentUsername) {
        User currentUser = userService.getById(currentUsername);
        if (currentUser == null || "个人".equals(currentUser.getAuthorityType())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }
        if ("001".equals(orgId)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "该组织不可删除");
        }
        if ("组织".equals(currentUser.getAuthorityType())
                && !Objects.equals(currentUser.getOrganizationId(), orgId)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "只能删除本组织");
        }
        Organization org = service.getById(orgId);
        if (org == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "组织不存在");
        }
        String fallbackUsername = "18459898778";
        User fallbackUser = userService.getById(fallbackUsername);
        if (fallbackUser == null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "默认关联账号不存在");
        }
        if (orgId.equals(fallbackUser.getOrganizationId())) {
            fallbackUser.setOrganizationId("");
            userService.updateById(fallbackUser);
        }
        List<User> orgUsers = userService.list(new QueryWrapper<User>().eq("organization_id", orgId));
        List<String> usernames = orgUsers.stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .filter(username -> !fallbackUsername.equals(username))
                .collect(Collectors.toList());
        if (!usernames.isEmpty()) {
            timeDataService.update(
                    new UpdateWrapper<TimeData>().set("username", fallbackUsername).in("username", usernames));
            orgDataShareService.update(
                    new UpdateWrapper<OrgDataShare>().set("grantee_username", fallbackUsername).in("grantee_username", usernames));
            userService.remove(new QueryWrapper<User>().in("username", usernames));
        }
        service.removeById(orgId);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "组织已删除");
    }

    static class UpdateOrgDto {
        private String organizationName;
        public String getOrganizationName() { return organizationName; }
        public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    }
}
