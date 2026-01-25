package cn.bupt.ibrain_glasses.glasses.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("time_data")
public class TimeData implements Serializable {

    private static final long serialVersionUID = 1L;

    private TimeDataPK timeDataPK;

    @TableField("username")
    private String username;

    @TableField("start_time")
    private LocalDateTime startTime;

    @TableField("duration")
    private Integer duration;

    public TimeData(TimeDataPK timeDataPK) {
        this.timeDataPK = timeDataPK;
    }

    public TimeData() {}

    public TimeDataPK getTimeDataPK() {
        return timeDataPK;
    }

    public void setTimeDataPK(TimeDataPK timeDataPK) {
        this.timeDataPK = timeDataPK;
    }
}
