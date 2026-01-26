import React, { useState } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';

function LoginPage({ onLoginSuccess }) {
    const [showFirstLogin, setShowFirstLogin] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // 表单提交成功时触发
    const handleFinish = async ({ username, password }) => {
        try {
            // 前端再次校验账号和密码格式
            if (!/^\d{11}$/.test(username)) {
                message.error("账号必须为11位数字");
                return;
            }
            if (password.length < 8) {
                message.error("密码长度不能少于8位");
                return;
            }
            // 调用后端登录接口
            const res = await fetch('/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username, password }).toString()
            });
            const data = await res.json();
            if (!data.success) {
                // 登录失败，提示错误信息
                message.error(data.message || "登录失败");
            } else {
                // 登录成功，保存登录信息到 localStorage，并通知父组件
                const user = data.data;
                if (user.firstLogin) {
                    setPendingUser(user);
                    setShowFirstLogin(true);
                } else {
                    localStorage.setItem('username', user.username);
                    localStorage.setItem('name', user.name || '');
                    localStorage.setItem('authorityType', user.authorityType);
                    localStorage.setItem('organizationId', user.organizationId || '');
                    onLoginSuccess(user);
                    message.success("登录成功");
                }
            }
        } catch (error) {
            console.error("Login request failed:", error);
            message.error("登录请求失败，请检查网络");
        }
    };

    const submitFirstLoginPassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            message.error("新密码长度不能少于8位");
            return;
        }
        try {
            const res = await fetch(`/users/${encodeURIComponent(pendingUser.username)}/password?currentUsername=${pendingUser.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "修改密码失败");
                return;
            }
            localStorage.setItem('username', pendingUser.username);
            localStorage.setItem('name', pendingUser.name || '');
            localStorage.setItem('authorityType', pendingUser.authorityType);
            localStorage.setItem('organizationId', pendingUser.organizationId || '');
            onLoginSuccess(pendingUser);
            setShowFirstLogin(false);
            setPendingUser(null);
            setNewPassword('');
            message.success("密码修改成功，登录成功");
        } catch (error) {
            console.error("Update password failed:", error);
            message.error("修改密码请求失败");
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
                            { pattern: /^\d{11}$/, message: '账号必须为11位数字' }
                        ]}
                    >
                        <Input placeholder="11位手机号" maxLength={11} allowClear />
                    </Form.Item>
                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 8, message: '密码长度不能少于8位' }
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
