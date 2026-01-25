package cn.bupt.ibrain_glasses.glasses.model;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("org_data_share")
public class OrgDataShare implements Serializable {

    private static final long serialVersionUID = 1L;

    private OrgDataSharePK orgDataSharePK;

    public OrgDataShare(OrgDataSharePK orgDataSharePK) {
        this.orgDataSharePK = orgDataSharePK;
    }

    public OrgDataShare() {}

    public OrgDataSharePK getOrgDataSharePK() {
        return orgDataSharePK;
    }

    public void setOrgDataSharePK(OrgDataSharePK orgDataSharePK) {
        this.orgDataSharePK = orgDataSharePK;
    }
}
