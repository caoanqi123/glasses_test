package cn.bupt.ibrain_glasses.glasses.service.impl;

import cn.bupt.ibrain_glasses.glasses.mapper.OrgDataShareMapper;
import cn.bupt.ibrain_glasses.glasses.model.OrgDataShare;
import cn.bupt.ibrain_glasses.glasses.service.OrgDataShareService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OrgDataShareServiceImpl extends ServiceImpl<OrgDataShareMapper, OrgDataShare> implements OrgDataShareService {

    private static final Logger logger = LoggerFactory.getLogger(OrgDataShareServiceImpl.class);
}
