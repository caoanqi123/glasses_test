import React, { useState, useEffect } from 'react';
import { Table, message, Card, Button, Modal, Input, Popconfirm, Space, Form } from 'antd';

function OrgManagementPage({ currentUser }) {
    const [orgList, setOrgList] = useState([]);
    const [editingOrg, setEditingOrg] = useState(null);
    const [newOrgName, setNewOrgName] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createOrgId, setCreateOrgId] = useState('');
    const [createOrgName, setCreateOrgName] = useState('');

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

    const startEditOrg = (org) => {
        setEditingOrg(org);
        setNewOrgName(org.organizationName || '');
    };

    const cancelEditOrg = () => {
        setEditingOrg(null);
        setNewOrgName('');
    };

    const submitOrgEdit = async () => {
        if (!newOrgName.trim()) {
            message.error("组织名称不能为空");
            return;
        }
        try {
            const res = await fetch(`/organizations/${encodeURIComponent(editingOrg.organizationId)}?currentUsername=${currentUser.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationName: newOrgName.trim() }),
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "修改失败");
            } else {
                setOrgList(prev => prev.map(org => (
                    org.organizationId === editingOrg.organizationId
                        ? { ...org, organizationName: newOrgName.trim() }
                        : org
                )));
                message.success("组织信息已更新");
                cancelEditOrg();
            }
        } catch (err) {
            console.error("Update organization failed:", err);
            message.error("修改请求失败");
        }
    };

    const deleteOrg = async (org) => {
        try {
            const res = await fetch(`/organizations/${encodeURIComponent(org.organizationId)}?currentUsername=${currentUser.username}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "删除失败");
            } else {
                setOrgList(prev => prev.filter(item => item.organizationId !== org.organizationId));
                message.success("组织已删除");
            }
        } catch (err) {
            console.error("Delete organization failed:", err);
            message.error("删除请求失败");
        }
    };

    const openCreateOrg = () => {
        setIsCreateOpen(true);
    };

    const cancelCreateOrg = () => {
        setIsCreateOpen(false);
    };

    const submitCreateOrg = async () => {
        if (!createOrgId.trim()) {
            message.error("组织ID不能为空");
            return;
        }
        if (!createOrgName.trim()) {
            message.error("组织名称不能为空");
            return;
        }
        try {
            const res = await fetch(`/organizations?currentUsername=${currentUser.username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: createOrgId.trim(),
                    organizationName: createOrgName.trim(),
                }),
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "新增失败");
            } else {
                setOrgList(prev => [
                    ...prev,
                    { organizationId: createOrgId.trim(), organizationName: createOrgName.trim() },
                ]);
                message.success("组织已新增");
                setCreateOrgId('');
                setCreateOrgName('');
                setIsCreateOpen(false);
            }
        } catch (err) {
            console.error("Create organization failed:", err);
            message.error("新增请求失败");
        }
    };

    const columns = [
        { title: '组织ID', dataIndex: 'organizationId', key: 'organizationId' },
        { title: '组织名称', dataIndex: 'organizationName', key: 'organizationName' },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => startEditOrg(record)}>修改</Button>
                    <Popconfirm
                        title={`确认删除组织 ${record.organizationId} 吗？`}
                        description="将把组织内所有用户的数据迁移到账号 18459898778，并删除组织及其用户。"
                        onConfirm={() => deleteOrg(record)}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button size="small" danger>删除</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div className="org-management-page page-container">
            <div className="page-header">
                <div>
                    <div className="page-title">组织管理</div>
                </div>
            </div>
            <div style={{ marginBottom: 12 }}>
                <Button type="primary" onClick={openCreateOrg}>
                    新增组织
                </Button>
            </div>
            <Card className="table-card" bordered={false}>
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={orgList}
                    rowKey="organizationId"
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
            {editingOrg && (
                <Modal
                    title="修改组织"
                    open={!!editingOrg}
                    onOk={submitOrgEdit}
                    onCancel={cancelEditOrg}
                    okText="保存"
                    cancelText="取消"
                >
                    <div style={{ marginBottom: 12 }}>
                        <b>组织ID:</b> {editingOrg.organizationId}
                    </div>
                    <div>
                        <b>组织名称:</b>
                        <Input
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="请输入组织名称"
                        />
                    </div>
                </Modal>
            )}
            <Modal
                title="新增组织"
                open={isCreateOpen}
                onOk={submitCreateOrg}
                onCancel={cancelCreateOrg}
                okText="提交"
                cancelText="取消"
            >
                <Form layout="vertical">
                    <Form.Item label="组织ID">
                        <Input
                            value={createOrgId}
                            onChange={(e) => setCreateOrgId(e.target.value)}
                            placeholder="请输入组织ID"
                        />
                    </Form.Item>
                    <Form.Item label="组织名称">
                        <Input
                            value={createOrgName}
                            onChange={(e) => setCreateOrgName(e.target.value)}
                            placeholder="请输入组织名称"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default OrgManagementPage;
