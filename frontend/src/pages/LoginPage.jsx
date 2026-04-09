import React, { useState } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';
import { authApi } from '../api';
import { getErrorMessage } from '../api/request';

function LoginPage({ onLoginSuccess }) {
    const [showFirstLogin, setShowFirstLogin] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const handleFinish = async ({ username, password }) => {
        if (!/^\d{11}$/.test(username)) {
            message.error('账号必须为11位数字');
            return;
        }
        if (password.length < 8) {
            message.error('密码长度不能少于8位');
            return;
        }

        try {
            const data = await authApi.login({ username, password });
            if (!data.success) {
                message.error(data.message || '登录失败');
                return;
            }

            const user = data.data;
            if (user.firstLogin) {
                setPendingUser(user);
                setShowFirstLogin(true);
                return;
            }

            onLoginSuccess(user);
            message.success('登录成功');
        } catch (error) {
            message.error(getErrorMessage(error, '登录请求失败，请检查网络'));
        }
    };

    const submitFirstLoginPassword = async () => {
        if (!pendingUser) {
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            message.error('新密码长度不能少于8位');
            return;
        }

        try {
            const data = await authApi.updatePassword({
                username: pendingUser.username,
                currentUsername: pendingUser.username,
                newPassword,
            });

            if (!data.success) {
                message.error(data.message || '修改密码失败');
                return;
            }

            onLoginSuccess(pendingUser);
            setShowFirstLogin(false);
            setPendingUser(null);
            setNewPassword('');
            message.success('密码修改成功，登录成功');
        } catch (error) {
            message.error(getErrorMessage(error, '修改密码请求失败'));
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-title">用户登录</div>
                <Form layout="vertical" onFinish={handleFinish}>
                    <Form.Item
                        label="手机号"
                        name="username"
                        rules={[
                            { required: true, message: '请输入账号' },
                            { pattern: /^\d{11}$/, message: '账号必须为11位数字' },
                        ]}
                    >
                        <Input placeholder="11位手机号" maxLength={11} allowClear />
                    </Form.Item>
                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 8, message: '密码长度不能少于8位' },
                        ]}
                    >
                        <Input.Password placeholder="至少8位密码" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </div>
            <Modal
                title="首次登录请修改密码"
                open={showFirstLogin}
                onOk={submitFirstLoginPassword}
                onCancel={() => {}}
                okText="提交"
                cancelButtonProps={{ style: { display: 'none' } }}
            >
                <Form layout="vertical">
                    <Form.Item label="新密码">
                        <Input.Password
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="至少8位密码"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default LoginPage;
