package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.model.Organization;
import cn.bupt.ibrain_glasses.glasses.service.OrganizationService;
import cn.bupt.ibrain_glasses.glasses.utils.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 组织管理接口
 */
@RestController
@RequestMapping("/organizations")
public class OrganizationController {
    private final OrganizationService service;
    public OrganizationController(OrganizationService service) {
        this.service = service;
    }

    /**
     * 获取组织列表
     */
    @GetMapping
    public ResponseEntity<ApiResponse> listOrganizations() {
        List<Organization> orgs = service.list();
        return ApiResponse.createResponse(HttpStatus.OK.value(), "查询成功", orgs);
    }

    // （如需的话，可以在此添加组织新增、删除等接口）
}
