package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.Organization;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrganizationService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final OrganizationService organizationService;

    public UserController(UserService userService, OrganizationService orgService) {
        this.userService = userService;
        this.organizationService = orgService;
    }

    /**
     * 获取用户列表（统一响应体）
     */
    @GetMapping
    public ResponseEntity<ApiResponse> listUsers(@RequestParam String username) {
        User currentUser = userService.getById(username);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "未授权访问");
        }

        String auth = currentUser.getAuthorityType();
        List<User> users;

        if ("管理员".equals(auth) || "超管".equals(auth)) {
            users = userService.list();
        } else if ("组织".equals(auth) && currentUser.getOrganizationId() != null) {
            users = userService.list(new QueryWrapper<User>()
                    .eq("organization_id", currentUser.getOrganizationId()));
        } else {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限查看用户列表");
        }

        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", users);
    }

    /**
     * 修改用户信息（仅 authorityType、organizationId）
     */
    @PutMapping("/{username}")
    public ResponseEntity<ApiResponse> updateUser(@PathVariable String username,
                                                  @RequestParam String currentUsername,
                                                  @RequestBody UpdateUserDto dto) {

        User currentUser = userService.getById(currentUsername);
        if (currentUser == null || "个人".equals(currentUser.getAuthorityType())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }

        User target = userService.getById(username);
        if (target == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }

        if ("组织".equals(currentUser.getAuthorityType())) {
            if (!currentUser.getOrganizationId().equals(target.getOrganizationId())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能修改非本组织的用户");
            }
            if ("管理员".equals(dto.getAuthorityType()) || "超管".equals(dto.getAuthorityType())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能赋予更高的权限级别");
            }
        }

        String newAuth = dto.getAuthorityType();
        if (newAuth != null) {
            if (!(newAuth.equals("个人") || newAuth.equals("组织")
                    || newAuth.equals("管理员") || newAuth.equals("超管"))) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "权限类型不合法");
            }
        } else {
            newAuth = target.getAuthorityType();
        }

        String newOrgId = dto.getOrganizationId();

        if (newAuth.equals("个人") || newAuth.equals("组织")) {
            if (newOrgId == null || newOrgId.trim().isEmpty()) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "该用户需要所属组织");
            }
            Organization org = organizationService.getById(newOrgId);
            if (org == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "指定的组织不存在");
            }
            target.setOrganizationId(newOrgId);
        } else {
            if (newOrgId == null || newOrgId.trim().isEmpty()) {
                target.setOrganizationId(null);
            } else {
                Organization org = organizationService.getById(newOrgId);
                if (org == null) {
                    return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "指定的组织不存在");
                }
                target.setOrganizationId(newOrgId);
            }
        }

        target.setAuthorityType(newAuth);
        userService.updateById(target);

        return ApiResponse.createResponse(HttpStatus.OK.value(), "用户信息已更新");
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/{username}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable String username,
                                                  @RequestParam String currentUsername) {

        User currentUser = userService.getById(currentUsername);
        if (currentUser == null || "个人".equals(currentUser.getAuthorityType())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }

        User target = userService.getById(username);
        if (target == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }

        if ("组织".equals(currentUser.getAuthorityType())
                && !currentUser.getOrganizationId().equals(target.getOrganizationId())) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能删除非本组织的用户");
        }

        userService.removeById(username);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "用户已删除");
    }

    static class UpdateUserDto {
        private String authorityType;
        private String organizationId;

        public String getAuthorityType() { return authorityType; }
        public void setAuthorityType(String a) { this.authorityType = a; }
        public String getOrganizationId() { return organizationId; }
        public void setOrganizationId(String o) { this.organizationId = o; }
    }
}
