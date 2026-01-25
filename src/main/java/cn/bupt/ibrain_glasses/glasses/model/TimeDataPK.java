package cn.bupt.ibrain_glasses.glasses.model;

import lombok.Data;

import java.io.Serializable;

@Data
public class TimeDataPK implements Serializable {

    private static final long serialVersionUID = 1L;

    private String subjectPhone;
    private String glassesMac;

    public TimeDataPK() {}

    public TimeDataPK(String subjectPhone, String glassesMac) {
        this.subjectPhone = subjectPhone;
        this.glassesMac = glassesMac;
    }
}
