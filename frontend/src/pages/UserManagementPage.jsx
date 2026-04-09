import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Select, Popconfirm, message, Card, Form, Input, Space } from 'antd';
import { organizationApi, userApi } from '../api';
import { getErrorMessage } from '../api/request';

function UserManagementPage({ currentUser }) {
    const [userList, setUserList] = useState([]);
    const [orgOptions, setOrgOptions] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [newAuthority, setNewAuthority] = useState('');
    const [newOrgId, setNewOrgId] = useState('');
    const [newName, setNewName] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createUsername, setCreateUsername] = useState('');
    const [createName, setCreateName] = useState('');
    const [createAuthority, setCreateAuthority] = useState('');
    const [createOrgId, setCreateOrgId] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await userApi.list(currentUser.username);
                if (!data.success) {
                    message.error(data.message || '无法获取用户列表');
                    return;
                }
                setUserList(data.data);
            } catch (error) {
                message.error(getErrorMessage(error, '获取用户列表失败'));
            }
        };

        const fetchOrgs = async () => {
            try {
                const data = await organizationApi.list();
                if (!data.success) {
                    message.error(data.message || '无法获取组织列表');
                    return;
                }
                setOrgOptions(data.data);
            } catch (error) {
                message.error(getErrorMessage(error, '获取组织列表失败'));
            }
        };

        fetchUsers();
        fetchOrgs();
    }, [currentUser.username]);

    const startEditUser = (user) => {
        setEditingUser(user);
        setNewAuthority(user.authorityType);
        setNewOrgId(user.organizationId || '');
        setNewName(user.name || '');
    };

    const cancelEditUser = () => {
        setEditingUser(null);
        setNewAuthority('');
        setNewOrgId('');
        setNewName('');
    };

    const submitUserEdit = async () => {
        if (!newAuthority) {
            message.error('请选择权限类型');
            return;
        }
        if ((newAuthority === '个人' || newAuthority === '组织') && !newOrgId) {
            message.error('个人/组织用户必须选择所属组织');
            return;
        }

        const payload = { authorityType: newAuthority, organizationId: newOrgId, name: newName };

        try {
            const data = await userApi.update(editingUser.username, currentUser.username, payload);
            if (!data.success) {
                message.error(data.message || '更新失败');
                return;
            }

            setUserList((prevList) => prevList.map((user) => {
                if (user.username !== editingUser.username) {
                    return user;
                }

                let newOrgName = '';
                if (newOrgId) {
                    const org = orgOptions.find((item) => item.organizationId === newOrgId);
                    newOrgName = org ? org.organizationName : '';
                }

                return {
                    ...user,
                    name: newName,
                    authorityType: newAuthority,
                    organizationId: newOrgId,
                    organizationName: newOrgName,
                };
            }));

            message.success('用户信息已更新');
            cancelEditUser();
        } catch (error) {
            message.error(getErrorMessage(error, '更新请求失败'));
        }
    };

    const deleteUser = async (user) => {
        try {
            const data = await userApi.remove(user.username, currentUser.username);
            if (!data.success) {
                message.error(data.message || '删除失败');
                return;
            }

            setUserList((prevList) => prevList.filter((item) => item.username !== user.username));
            message.success('用户已删除');
        } catch (error) {
            message.error(getErrorMessage(error, '删除请求失败'));
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
        if (target.username === currentUser.username) {
            return true;
        }
        if (currentUser.authorityType === '超管') {
            return true;
        }
        if (currentUser.authorityType === '管理员') {
            return target.authorityType === '个人' || target.authorityType === '组织';
        }
        if (currentUser.authorityType === '组织') {
            return target.authorityType === '个人';
        }
        return false;
    };

    const availableOrgs = currentUser.authorityType === '组织'
        ? orgOptions.filter((org) => org.organizationId === currentUser.organizationId)
        : orgOptions;

    const openCreateUser = () => {
        setIsCreateOpen(true);
        setCreateAuthority('');
        setCreateOrgId(currentUser.authorityType === '组织' ? currentUser.organizationId : '');
    };

    const cancelCreateUser = () => {
        setIsCreateOpen(false);
        setCreateUsername('');
        setCreateName('');
        setCreateAuthority('');
        setCreateOrgId('');
    };

    const submitCreateUser = async () => {
        if (!/^\d{11}$/.test(createUsername)) {
            message.error('账号必须为11位数字');
            return;
        }
        if (!createName.trim()) {
            message.error('姓名不能为空');
            return;
        }
        if (!createAuthority) {
            message.error('请选择权限类型');
            return;
        }
        if ((createAuthority === '个人' || createAuthority === '组织') && !createOrgId) {
            message.error('个人/组织用户必须选择所属组织');
            return;
        }

        try {
            const data = await userApi.create(currentUser.username, {
                username: createUsername,
                name: createName,
                authorityType: createAuthority,
                organizationId: createOrgId || null,
            });

            if (!data.success) {
                message.error(data.message || '注册失败');
                return;
            }

            const orgName = orgOptions.find((org) => org.organizationId === createOrgId)?.organizationName || '';
            setUserList((prev) => ([
                ...prev,
                {
                    username: createUsername,
                    name: createName,
                    authorityType: createAuthority,
                    organizationId: createOrgId || null,
                    organizationName: orgName,
                },
            ]));
            message.success(data.message || '注册成功');
            cancelCreateUser();
        } catch (error) {
            message.error(getErrorMessage(error, '注册请求失败'));
        }
    };

    const columns = [
        { title: '账号', dataIndex: 'username', key: 'username' },
        { title: '姓名', dataIndex: 'name', key: 'name' },
        { title: '权限', dataIndex: 'authorityType', key: 'authorityType' },
        {
            title: '组织',
            dataIndex: 'organizationName',
            key: 'organizationName',
            render: (text) => text || '',
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space className="action-buttons">
                    <Button
                        type="link"
                        size="small"
                        onClick={() => startEditUser(record)}
                        disabled={!canManageTarget(record)}
                    >
                        修改
                    </Button>
                    <Popconfirm
                        title={`确认删除用户 ${record.username} 吗？`}
                        onConfirm={() => deleteUser(record)}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            disabled={!canManageTarget(record)}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="user-management-page page-container">
            {currentUser.authorityType !== '个人' && (
                <div style={{ marginBottom: 12 }}>
                    <Button type="primary" onClick={openCreateUser}>
                        注册
                    </Button>
                </div>
            )}
            <Card className="table-card" bordered={false}>
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={userList}
                    rowKey="username"
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
            {editingUser && (
                <Modal
                    title={null}
                    open={!!editingUser}
                    onOk={submitUserEdit}
                    onCancel={cancelEditUser}
                    okText="保存"
                    cancelText="取消"
                >
                    <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
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
                            <Select value={newAuthority} onChange={(val) => setNewAuthority(val)}>
                                {getAuthorityOptions().map((option) => (
                                    <Select.Option key={option} value={option}>
                                        {option}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label="组织">
                            <Select
                                value={newOrgId}
                                onChange={(val) => setNewOrgId(val)}
                                placeholder="--选择组织--"
                                allowClear
                            >
                                {availableOrgs.map((org) => (
                                    <Select.Option key={org.organizationId} value={org.organizationId}>
                                        {org.organizationName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            )}
            <Modal
                title="新增用户"
                open={isCreateOpen}
                onOk={submitCreateUser}
                onCancel={cancelCreateUser}
                okText="提交"
                cancelText="取消"
            >
                <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
                    <Form.Item label="手机号">
                        <Input
                            value={createUsername}
                            onChange={(e) => setCreateUsername(e.target.value)}
                            placeholder="11位手机号"
                            maxLength={11}
                        />
                    </Form.Item>
                    <Form.Item label="姓名">
                        <Input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="请输入姓名"
                        />
                    </Form.Item>
                    <Form.Item label="权限">
                        <Select
                            value={createAuthority}
                            onChange={(val) => {
                                setCreateAuthority(val);
                                if (currentUser.authorityType === '组织') {
                                    setCreateOrgId(currentUser.organizationId || '');
                                }
                            }}
                        >
                            {getAuthorityOptions().map((option) => (
                                <Select.Option key={option} value={option}>
                                    {option}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="组织">
                        <Select
                            value={createOrgId}
                            onChange={(val) => setCreateOrgId(val)}
                            placeholder="--选择组织--"
                            allowClear
                            disabled={currentUser.authorityType === '组织'}
                        >
                            {availableOrgs.map((org) => (
                                <Select.Option key={org.organizationId} value={org.organizationId}>
                                    {org.organizationName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default UserManagementPage;
