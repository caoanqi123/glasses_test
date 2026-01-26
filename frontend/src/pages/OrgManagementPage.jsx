import React, { useState, useEffect } from 'react';
import { Table, message } from 'antd';

function OrgManagementPage() {
    const [orgList, setOrgList] = useState([]);

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const res = await fetch('/organizations');
                const data = await res.json();
                if (!data.success) {
                    message.error(data.message || "无法获取组织列表");
                } else {
                    setOrgList(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch organizations:", err);
                message.error("获取组织列表失败");
            }
        };
        fetchOrgs();
    }, []);

    const columns = [
        { title: '组织ID', dataIndex: 'organizationId', key: 'organizationId' },
        { title: '组织名称', dataIndex: 'organizationName', key: 'organizationName' },
    ];

    return (
        <div className="org-management-page">
            <h2>组织列表</h2>
            <Table
                className="data-table"
                columns={columns}
                dataSource={orgList}
                rowKey="organizationId"
                pagination={false}
            />
        </div>
    );
}

export default OrgManagementPage;
