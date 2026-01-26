import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Select, Popconfirm, message, Card, Form, Input } from 'antd';

function UserManagementPage({ currentUser }) {
    const [userList, setUserList] = useState([]);      // 用户列表数据
    const [orgOptions, setOrgOptions] = useState([]);  // 组织选项列表
    const [editingUser, setEditingUser] = useState(null);  // 当前正在编辑的用户对象
    const [newAuthority, setNewAuthority] = useState('');   // 编辑表单中选定的新权限
    const [newOrgId, setNewOrgId] = useState('');           // 编辑表单中选定的新组织ID
    const [newName, setNewName] = useState('');             // 编辑表单中姓名

    // 组件加载时获取用户列表和组织列表
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`/users?username=${currentUser.username}`);
                const data = await res.json();
                if (!data.success) {
                    message.error(data.message || "无法获取用户列表");
                } else {
                    setUserList(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
                message.error("获取用户列表失败");
            }
        };
        const fetchOrgs = async () => {
            try {
                const res = await fetch('/organizations');
                const data = await res.json();
                if (!data.success) {
                    message.error(data.message || "无法获取组织列表");
                } else {
                    setOrgOptions(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch organizations:", err);
            }
        };
        fetchUsers();
        fetchOrgs();
    }, [currentUser.username]);

    // 点击“编辑”按钮，打开编辑弹窗并初始化表单字段
    const startEditUser = (user) => {
        setEditingUser(user);
        setNewAuthority(user.authorityType);
        setNewOrgId(user.organizationId || '');  // 若无组织则设为空字符串
        setNewName(user.name || '');
    };

    // 取消编辑，重置弹窗状态
    const cancelEditUser = () => {
        setEditingUser(null);
        setNewAuthority('');
        setNewOrgId('');
        setNewName('');
    };

    // 提交编辑，更改用户信息
    const submitUserEdit = async () => {
        if (!newAuthority) {
            message.error("请选择权限类型");
            return;
        }
        // 若设置为个人/组织用户，则必须选择所属组织
        if ((newAuthority === '个人' || newAuthority === '组织') && !newOrgId) {
            message.error("个人/组织用户必须选择所属组织");
            return;
        }
        // 组织选项对于管理员/超管用户可为空，无需特别校验
        const payload = { authorityType: newAuthority, organizationId: newOrgId, name: newName };
        try {
            const res = await fetch(`/users/${encodeURIComponent(editingUser.username)}?currentUsername=${currentUser.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "更新失败");
            } else {
                // 更新本地 userList 数据
                setUserList(prevList => prevList.map(u => {
                    if (u.username === editingUser.username) {
                        // 获取组织名用于更新显示
                        let newOrgName = '';
                        if (newOrgId) {
                            const org = orgOptions.find(org => org.organizationId === newOrgId);
                            newOrgName = org ? org.organizationName : '';
                        }
                        return {
                            ...u,
                            name: newName,
                            authorityType: newAuthority,
                            organizationId: newOrgId,
                            organizationName: newOrgName,
                        };
                    }
                    return u;
                }));
                message.success("用户信息已更新");
                cancelEditUser();
            }
        } catch (err) {
            console.error("User update failed:", err);
            message.error("更新请求失败");
        }
    };

    // 删除用户
    const deleteUser = async (user) => {
        try {
            const res = await fetch(`/users/${encodeURIComponent(user.username)}?currentUsername=${currentUser.username}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "删除失败");
            } else {
                setUserList(prevList => prevList.filter(u => u.username !== user.username));
                message.success("用户已删除");
            }
        } catch (err) {
            console.error("Delete user failed:", err);
            message.error("删除请求失败");
        }
    };

    const getAuthorityOptions = () => {
        if (currentUser.authorityType === '超管') {
            return ['个人', '组织', '管理员', '超管'];
        }
        if (currentUser.authorityType === '管理员') {
            return ['个人', '组织', '管理员'];
        }
        if (currentUser.authorityType === '组织') {
            return ['个人', '组织'];
        }
        return ['个人'];
    };

    const canManageTarget = (target) => {
        if (currentUser.authorityType === '超管') {
            return true;
        }
        if (currentUser.authorityType === '管理员') {
            return target.authorityType === '个人' || target.authorityType === '组织';
        }
        if (currentUser.authorityType === '组织') {
            return target.authorityType === '个人';
        }
        return target.username === currentUser.username;
    };

    // 定义表格列
    const columns = [
        { title: '账号', dataIndex: 'username', key: 'username' },
        { title: '姓名', dataIndex: 'name', key: 'name' },
        { title: '权限', dataIndex: 'authorityType', key: 'authorityType' },
        { title: '组织', dataIndex: 'organizationName', key: 'organizationName',
            render: (text) => text || '' },
        { title: '操作', key: 'actions',
            render: (_, record) => (
                <>
                    <Button
                        size="small"
                        onClick={() => startEditUser(record)}
                        disabled={!canManageTarget(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title={`确认删除用户 ${record.username} 吗？`}
                        onConfirm={() => deleteUser(record)}
                        okText="确认" cancelText="取消"
                    >
                        <Button
                            size="small"
                            danger
                            style={{ marginLeft: 8 }}
                            disabled={!canManageTarget(record)}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </>
            )
        },
    ];

    return (
        <div className="user-management-page page-container">
            <div className="page-header">
                <div>
                    <div className="page-title">用户管理</div>
                </div>
            </div>
            {/* 用户列表表格 */}
            <Card className="table-card" bordered={false}>
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={userList}
                    rowKey="username"
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
            {/* 编辑用户弹窗 */}
            {editingUser && (
                <Modal
                    title={`编辑用户: ${editingUser.username}`}
                    open={!!editingUser}
                    onOk={submitUserEdit}
                    onCancel={cancelEditUser}
                    okText="保存"
                    cancelText="取消"
                >
                    <Form layout="vertical">
                        <Form.Item label="账号">
                            <Input value={editingUser.username} disabled />
                        </Form.Item>
                        <Form.Item label="姓名">
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="请输入姓名"
                            />
                        </Form.Item>
                        <Form.Item label="权限类型">
                            <Select
                                value={newAuthority}
                                onChange={val => setNewAuthority(val)}
                            >
                                {getAuthorityOptions().map(option => (
                                    <Select.Option key={option} value={option}>
                                        {option}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label="组织">
                            <Select
                                value={newOrgId}
                                onChange={val => setNewOrgId(val)}
                                placeholder="--选择组织--"
                                allowClear
                            >
                                {orgOptions.map(org => (
                                    <Select.Option key={org.organizationId} value={org.organizationId}>
                                        {org.organizationName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </div>
    );
}

export default UserManagementPage;
