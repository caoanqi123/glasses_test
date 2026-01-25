package cn.bupt.ibrain_glasses.glasses.mapper;

import cn.bupt.ibrain_glasses.glasses.model.TimeData;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

public interface TimeDataMapper extends BaseMapper<TimeData> {

    int insertTimeData(@Param("timeData") TimeData timeData);
}
