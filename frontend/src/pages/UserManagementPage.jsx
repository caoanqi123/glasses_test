import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Select, Popconfirm, message } from 'antd';

function UserManagementPage({ currentUser }) {
    const [userList, setUserList] = useState([]);      // 用户列表数据
    const [orgOptions, setOrgOptions] = useState([]);  // 组织选项列表
    const [editingUser, setEditingUser] = useState(null);  // 当前正在编辑的用户对象
    const [newAuthority, setNewAuthority] = useState('');   // 编辑表单中选定的新权限
    const [newOrgId, setNewOrgId] = useState('');           // 编辑表单中选定的新组织ID

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
    };

    // 取消编辑，重置弹窗状态
    const cancelEditUser = () => {
        setEditingUser(null);
        setNewAuthority('');
        setNewOrgId('');
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
        const payload = { authorityType: newAuthority, organizationId: newOrgId };
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
        if (user.username === currentUser.username) {
            message.warn("不能删除自己");
            return;
        }
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
                    <Button size="small" onClick={() => startEditUser(record)}>编辑</Button>
                    <Popconfirm
                        title={`确认删除用户 ${record.username} 吗？`}
                        onConfirm={() => deleteUser(record)}
                        okText="确认" cancelText="取消"
                    >
                        <Button size="small" danger style={{ marginLeft: 8 }}>删除</Button>
                    </Popconfirm>
                </>
            )
        },
    ];

    return (
        <div className="user-management-page">
            <h2>用户管理</h2>
            {/* 用户列表表格 */}
            <Table
                className="data-table"
                columns={columns}
                dataSource={userList}
                rowKey="username"
                pagination={{ pageSize: 8 }}
            />
            {/* 编辑用户弹窗 */}
            {editingUser && (
                <Modal
                    title={`编辑用户: ${editingUser.username}`}
                    visible={!!editingUser}
                    onOk={submitUserEdit}
                    onCancel={cancelEditUser}
                    okText="保存"
                    cancelText="取消"
                >
                    <p><b>姓名:</b> {editingUser.name}</p>
                    <div style={{ marginBottom: 16 }}>
                        <b>权限类型:</b>{' '}
                        <Select
                            value={newAuthority}
                            onChange={val => setNewAuthority(val)}
                            style={{ width: 160 }}
                        >
                            <Select.Option value="个人">个人</Select.Option>
                            <Select.Option value="组织">组织</Select.Option>
                            <Select.Option value="管理员">管理员</Select.Option>
                            <Select.Option value="超管">超管</Select.Option>
                        </Select>
                    </div>
                    <div>
                        <b>所属组织:</b>{' '}
                        <Select
                            value={newOrgId}
                            onChange={val => setNewOrgId(val)}
                            style={{ width: 160 }}
                            placeholder="--选择组织--"
                        >
                            {orgOptions.map(org => (
                                <Select.Option key={org.organizationId} value={org.organizationId}>
                                    {org.organizationName}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default UserManagementPage;
