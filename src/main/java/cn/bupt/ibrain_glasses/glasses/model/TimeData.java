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

    @TableField("subject_phone")
    private String subjectPhone;

    @TableField("subject_name")
    private String subjectName;

    @TableField("subject_gender")
    private String subjectGender;

    @TableField("subject_age")
    private Integer subjectAge;

    @TableField("glasses_mac")
    private String glassesMac;

    @TableField("username")
    private String username;

    @TableField("start_time")
    private LocalDateTime startTime;

    @TableField("duration")
    private Integer duration;

    @TableField("frequency")
    private Integer frequency;

    @TableField("light_brightness")
    private Integer lightBrightness;

    @TableField("sound_volume")
    private Integer soundVolume;

    @TableField("sync_brightness")
    private Integer syncBrightness;

    @TableField("sync_volume")
    private Integer syncVolume;

    // 复合主键对象不是表字段，必须 exist=false，否则会生成 time_data_p_k
    @TableField(exist = false)
    private TimeDataPK timeDataPK;

    // 保持旧 JSON 结构：前端仍然可以用 timeDataPK.subjectPhone / glassesMac
    public TimeDataPK getTimeDataPK() {
        if (timeDataPK == null) {
            timeDataPK = new TimeDataPK(subjectPhone, glassesMac, startTime);
        }
        return timeDataPK;
    }

    public void setTimeDataPK(TimeDataPK pk) {
        this.timeDataPK = pk;
        if (pk != null) {
            this.subjectPhone = pk.getSubjectPhone();
            this.glassesMac = pk.getGlassesMac();
            this.startTime = pk.getStartTime();
        }
    }
}
