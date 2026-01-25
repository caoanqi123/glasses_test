package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.Organization;
import cn.bupt.ibrain_glasses.glasses.model.User;
import cn.bupt.ibrain_glasses.glasses.service.OrganizationService;
import cn.bupt.ibrain_glasses.glasses.service.UserService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserService userService;
    private final OrganizationService organizationService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UserService userService, OrganizationService organizationService) {
        this.userService = userService;
        this.organizationService = organizationService;
    }

    /**
     * 登录接口
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(@RequestParam String username,
                                             @RequestParam String password) {

        // 后端兜底校验（建议保留）
        if (username == null || !username.matches("\\d{11}")) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "账号必须为11位数字");
        }
        if (password == null || password.length() < 8) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "密码长度至少8位");
        }

        User user = userService.getById(username);
        if (user == null) {
            // 你需求：账号不存在/密码错误都可以返回“账号或密码错误”（更安全），也可保留“账号不存在”
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "账号或密码错误");
        }

        if (!encoder.matches(password, user.getPassword())) {
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "账号或密码错误");
        }

        // 登录成功返回数据（不要返回密码）
        LoginResp data = new LoginResp(user.getUsername(), user.getName(), user.getAuthorityType());
        return ApiResponse.createResponse(HttpStatus.OK.value(), "登录成功", data);
    }

    /**
     * 注册接口: 后端提供，前端不暴露入口
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody User newUser) {
        String username = newUser.getUsername();
        String rawPassword = newUser.getPassword();
        String name = newUser.getName();
        String authority = newUser.getAuthorityType();
        String orgId = newUser.getOrganizationId();

        // 1. 参数基本校验
        if (username == null || !username.matches("\\d{11}")) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "用户名必须为11位数字");
        }
        if (rawPassword == null || rawPassword.length() < 8) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "密码长度至少8位");
        }
        if (name == null || name.trim().isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "姓名不能为空");
        }
        if (authority == null ||
                !(authority.equals("个人") || authority.equals("组织")
                        || authority.equals("管理员") || authority.equals("超管"))) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "权限类型不合法");
        }

        // 2. 检查用户是否已存在
        if (userService.getById(username) != null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "该账号已存在");
        }

        // 3. 校验组织存在性（个人/组织必须有组织）
        if (orgId == null || orgId.trim().isEmpty()) {
            if (authority.equals("个人") || authority.equals("组织")) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "个人/组织用户必须指定所属组织");
            }
            orgId = null;
        } else {
            Organization org = organizationService.getById(orgId);
            if (org == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织ID不存在，请先注册组织再注册账号");
            }
        }

        // 4. 加密密码并保存新用户
        String encodedPwd = encoder.encode(rawPassword);
        User user = new User();
        user.setUsername(username);
        user.setPassword(encodedPwd);
        user.setName(name);
        user.setAuthorityType(authority);
        user.setOrganizationId(orgId);
        userService.save(user);

        return ApiResponse.createResponse(HttpStatus.OK.value(), "注册成功");
    }

    public static class LoginResp {
        private String username;
        private String name;
        private String authorityType;

        public LoginResp(String username, String name, String authorityType) {
            this.username = username;
            this.name = name;
            this.authorityType = authorityType;
        }

        public String getUsername() { return username; }
        public String getName() { return name; }
        public String getAuthorityType() { return authorityType; }
    }
}
