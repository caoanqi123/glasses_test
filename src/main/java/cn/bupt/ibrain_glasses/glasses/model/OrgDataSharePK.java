package cn.bupt.ibrain_glasses.glasses.model;

import lombok.Data;

import java.io.Serializable;

@Data
public class OrgDataSharePK implements Serializable {

    private static final long serialVersionUID = 1L;

    private String ownerOrganizationId;
    private String granteeUsername;

    public OrgDataSharePK() {}

    public OrgDataSharePK(String ownerOrganizationId, String granteeUsername) {
        this.ownerOrganizationId = ownerOrganizationId;
        this.granteeUsername = granteeUsername;
    }
}
