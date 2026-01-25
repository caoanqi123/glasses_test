package cn.bupt.ibrain_glasses.glasses.service.impl;

import cn.bupt.ibrain_glasses.glasses.mapper.TimeDataMapper;
import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import cn.bupt.ibrain_glasses.glasses.service.TimeDataService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TimeDataServiceImpl extends ServiceImpl<TimeDataMapper, TimeData> implements TimeDataService {

    private static final Logger logger = LoggerFactory.getLogger(TimeDataServiceImpl.class);
}
