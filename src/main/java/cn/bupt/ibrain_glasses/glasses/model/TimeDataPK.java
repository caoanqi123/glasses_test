package cn.bupt.ibrain_glasses.glasses.model;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
public class TimeDataPK implements Serializable {

    private static final long serialVersionUID = 1L;

    private String subjectPhone;
    private String glassesMac;
    private LocalDateTime startTime;

    public TimeDataPK() {}

    public TimeDataPK(String subjectPhone, String glassesMac, LocalDateTime startTime) {
        this.subjectPhone = subjectPhone;
        this.glassesMac = glassesMac;
        this.startTime = startTime;
    }
}
