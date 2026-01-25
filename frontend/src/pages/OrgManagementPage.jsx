import React, { useState, useEffect } from 'react';

function OrgManagementPage() {
    const [orgList, setOrgList] = useState([]);

    useEffect(() => {
        // 获取组织列表
        const fetchOrgs = async () => {
            try {
                const res = await fetch('/api/organizations');
                const data = await res.json();
                if (data.success === false) {
                    alert(data.message || "无法获取组织列表");
                } else {
                    setOrgList(data);
                }
            } catch (err) {
                console.error("Failed to fetch organizations:", err);
            }
        };
        fetchOrgs();
    }, []);

    return (
        <div className="org-management-page">
            <h2>组织列表</h2>
            <table className="data-table">
                <thead>
                <tr><th>组织ID</th><th>组织名称</th></tr>
                </thead>
                <tbody>
                {orgList.map(org => (
                    <tr key={org.organizationId}>
                        <td>{org.organizationId}</td>
                        <td>{org.organizationName}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default OrgManagementPage;
