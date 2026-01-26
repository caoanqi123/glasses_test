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

import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户相关接口（包括登录、注册、用户管理）
 */
@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;
    private final OrganizationService organizationService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UserController(UserService userService, OrganizationService orgService) {
        this.userService = userService;
        this.organizationService = orgService;
    }

    /**
     * 登录接口：验证账号和密码，返回用户基本信息
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(@RequestParam String username,
                                             @RequestParam String password) {
        // 参数格式校验
        if (username == null || !username.matches("\\d{11}")) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "账号必须为11位数字");
        }
        if (password == null || password.length() < 8) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "密码长度至少8位");
        }
        // 验证用户是否存在
        User user = userService.getById(username);
        if (user == null || !encoder.matches(password, user.getPassword())) {
            // 账号不存在或密码错误，统一返回提示
            return ApiResponse.createResponse(HttpStatus.UNAUTHORIZED.value(), "账号或密码错误");
        }
        // 登录成功，不返回密码，只返回必要信息
        LoginResp data = new LoginResp(user.getUsername(), user.getName(), user.getAuthorityType());
        return ApiResponse.createResponse(HttpStatus.OK.value(), "登录成功", data);
    }

    /**
     * 注册接口：校验输入并保存新用户
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody User newUser) {
        String username = newUser.getUsername();
        String rawPassword = newUser.getPassword();
        String name = newUser.getName();
        String authority = newUser.getAuthorityType();
        String orgId = newUser.getOrganizationId();
        // 1. 基本字段校验
        if (username == null || !username.matches("\\d{11}")) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "用户名必须为11位数字");
        }
        if (rawPassword == null || rawPassword.length() < 8) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "密码长度至少8位");
        }
        if (name == null || name.trim().isEmpty()) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "姓名不能为空");
        }
        if (authority == null || !(authority.equals("个人") || authority.equals("组织")
                || authority.equals("管理员") || authority.equals("超管"))) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "权限类型不合法");
        }
        // 2. 检查账号是否存在
        if (userService.getById(username) != null) {
            return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "该账号已存在");
        }
        // 3. 校验组织有效性（authority 为个人/组织时必须提供组织ID）
        if (authority.equals("个人") || authority.equals("组织")) {
            if (orgId == null || orgId.trim().isEmpty()) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "个人/组织用户必须指定所属组织");
            }
            Organization org = organizationService.getById(orgId);
            if (org == null) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "组织ID不存在，请先注册组织再注册账号");
            }
        } else {
            // 管理员/超管无需组织
            orgId = null;
        }
        // 4. 保存新用户（密码加密存储）
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

    /**
     * 获取用户列表，根据当前登录用户权限筛选
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
            users = userService.list();  // 管理员/超管：获取所有用户
        } else if ("组织".equals(auth) && currentUser.getOrganizationId() != null) {
            // 组织管理员：获取本组织的所有用户
            users = userService.list().stream()
                    .filter(u -> currentUser.getOrganizationId().equals(u.getOrganizationId()))
                    .collect(Collectors.toList());
        } else {
            users = Collections.singletonList(currentUser); // 个人用户仅查看自己
        }
        // 将组织名称附加到每个用户的数据中
        List<Organization> orgs = organizationService.list();
        Map<String, String> orgNameMap = orgs.stream()
                .collect(Collectors.toMap(Organization::getOrganizationId, Organization::getOrganizationName));
        List<Map<String, Object>> resultList = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> item = new HashMap<>();
            item.put("username", u.getUsername());
            item.put("name", u.getName());
            item.put("authorityType", u.getAuthorityType());
            item.put("organizationId", u.getOrganizationId());
            // 获取组织名称（如果有）
            String orgName = null;
            if (u.getOrganizationId() != null) {
                orgName = orgNameMap.get(u.getOrganizationId());
            }
            item.put("organizationName", orgName);
            resultList.add(item);
        }
        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", resultList);
    }

    /**
     * 修改用户信息（只能修改权限类型和所属组织）
     */
    @PutMapping("/{username}")
    public ResponseEntity<ApiResponse> updateUser(@PathVariable String username,
                                                  @RequestParam String currentUsername,
                                                  @RequestBody UpdateUserDto dto) {
        User currentUser = userService.getById(currentUsername);
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }
        User target = userService.getById(username);
        if (target == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }
        String currentAuth = currentUser.getAuthorityType();
        String targetAuth = target.getAuthorityType();
        if ("个人".equals(currentAuth)) {
            if (!Objects.equals(currentUser.getUsername(), target.getUsername())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
            }
        } else if ("组织".equals(currentAuth)) {
            if (!Objects.equals(currentUser.getOrganizationId(), target.getOrganizationId())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能修改非本组织的用户");
            }
            if (!"个人".equals(targetAuth)) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能修改该用户权限");
            }
        } else if ("管理员".equals(currentAuth)) {
            if ("管理员".equals(targetAuth) || "超管".equals(targetAuth)) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能修改该用户权限");
            }
        }
        // 验证新的权限类型是否合法，如为空则保留原值
        String newAuth = dto.getAuthorityType();
        if (newAuth != null) {
            if (!(newAuth.equals("个人") || newAuth.equals("组织")
                    || newAuth.equals("管理员") || newAuth.equals("超管"))) {
                return ApiResponse.createResponse(HttpStatus.BAD_REQUEST.value(), "权限类型不合法");
            }
        } else {
            newAuth = target.getAuthorityType();
        }
        if ("个人".equals(currentAuth) && !"个人".equals(newAuth)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能提升权限");
        }
        if ("组织".equals(currentAuth) && !"个人".equals(newAuth)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能提升权限");
        }
        if ("管理员".equals(currentAuth) && "超管".equals(newAuth)) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能提升权限");
        }
        String newOrgId = dto.getOrganizationId();
        // 根据权限类型处理组织ID要求
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
            // 管理员/超管角色，如果传了组织则校验，否则设为空
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
        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            target.setName(dto.getName().trim());
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
        if (currentUser == null) {
            return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
        }
        User target = userService.getById(username);
        if (target == null) {
            return ApiResponse.createResponse(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }
        String currentAuth = currentUser.getAuthorityType();
        String targetAuth = target.getAuthorityType();
        if ("个人".equals(currentAuth)) {
            if (!Objects.equals(currentUser.getUsername(), target.getUsername())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "无权限执行此操作");
            }
        } else if ("组织".equals(currentAuth)) {
            if (!Objects.equals(currentUser.getOrganizationId(), target.getOrganizationId())) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能删除非本组织的用户");
            }
            if (!"个人".equals(targetAuth)) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能删除该用户权限");
            }
        } else if ("管理员".equals(currentAuth)) {
            if ("管理员".equals(targetAuth) || "超管".equals(targetAuth)) {
                return ApiResponse.createResponse(HttpStatus.FORBIDDEN.value(), "不能删除该用户权限");
            }
        }
        userService.removeById(username);
        return ApiResponse.createResponse(HttpStatus.OK.value(), "用户已删除");
    }

    // 静态内部类：定义登录接口返回的数据结构
    static class LoginResp {
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

    // DTO 类：用于更新用户接口接收的数据
    static class UpdateUserDto {
        private String authorityType;
        private String organizationId;
        private String name;
        public String getAuthorityType() { return authorityType; }
        public void setAuthorityType(String a) { this.authorityType = a; }
        public String getOrganizationId() { return organizationId; }
        public void setOrganizationId(String o) { this.organizationId = o; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
}
