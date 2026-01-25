package cn.bupt.ibrain_glasses.glasses.controller;

import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/orgDataShares")
public class OrgDataShareController {

    private static final Logger logger = LoggerFactory.getLogger(OrgDataShareController.class);

    private final OrgDataShareService service;

    public OrgDataShareController(OrgDataShareService service) {
        this.service = service;
    }
}
