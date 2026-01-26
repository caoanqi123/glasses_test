import React from 'react';
import { Form, Input, Button, message } from 'antd';

function LoginPage({ onLoginSuccess }) {
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
                localStorage.setItem('username', user.username);
                localStorage.setItem('name', user.name || '');
                localStorage.setItem('authorityType', user.authorityType);
                onLoginSuccess(user);
                message.success("登录成功");
            }
        } catch (error) {
            console.error("Login request failed:", error);
            message.error("登录请求失败，请检查网络");
        }
    };

    return (
        <div className="login-page" style={{ maxWidth: 300, margin: '100px auto', textAlign: 'center' }}>
            <h2>用户登录</h2>
            <Form onFinish={handleFinish}>
                <Form.Item
                    name="username"
                    rules={[
                        { required: true, message: '请输入账号' },
                        { pattern: /^\d{11}$/, message: '账号必须为11位数字' }
                    ]}
                >
                    <Input placeholder="11位手机号" maxLength={11} allowClear />
                </Form.Item>
                <Form.Item
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
    );
}

export default LoginPage;
