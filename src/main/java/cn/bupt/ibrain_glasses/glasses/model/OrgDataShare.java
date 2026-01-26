package cn.bupt.ibrain_glasses.glasses.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("org_data_share")
public class OrgDataShare implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableField("owner_organization_id")
    private String ownerOrganizationId;

    @TableField("grantee_username")
    private String granteeUsername;

    // 复合主键对象不是表字段，必须 exist=false，否则会生成 org_data_share_p_k
    @TableField(exist = false)
    private OrgDataSharePK orgDataSharePK;

    // 保持旧 JSON 结构：仍然能让前端/旧代码通过 orgDataSharePK.ownerOrganizationId 访问
    public OrgDataSharePK getOrgDataSharePK() {
        if (orgDataSharePK == null) {
            orgDataSharePK = new OrgDataSharePK(ownerOrganizationId, granteeUsername);
        }
        return orgDataSharePK;
    }

    public void setOrgDataSharePK(OrgDataSharePK pk) {
        this.orgDataSharePK = pk;
        if (pk != null) {
            this.ownerOrganizationId = pk.getOwnerOrganizationId();
            this.granteeUsername = pk.getGranteeUsername();
        }
    }
}
