import React, { useState } from 'react';

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        // 前端验证账号和密码格式
        if (!/^\d{11}$/.test(username)) {
            alert("账号必须为11位数字");
            return;
        }
        if (password.length < 8) {
            alert("密码长度不能少于8位");
            return;
        }
        try {
            // 调用后端登录接口
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username, password })
            });
            const data = await res.json();
            if (data.success === false) {
                // 登录失败，提示错误信息
                alert(data.message || "登录失败");
            } else {
                // 登录成功，保存登录状态到 localStorage，并通知上层组件
                localStorage.setItem('username', data.username);
                localStorage.setItem('name', data.name);
                localStorage.setItem('authorityType', data.authorityType);
                onLoginSuccess({
                    username: data.username,
                    name: data.name,
                    authorityType: data.authorityType
                });
            }
        } catch (error) {
            console.error("Login request failed:", error);
            alert("登录请求失败，请检查网络");
        }
    };

    return (
        <div className="login-page">
            <h2>用户登录</h2>
            <div>
                <label>账号：</label>
                <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="11位手机号"
                    maxLength={11}
                />
            </div>
            <div>
                <label>密码：</label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="至少8位密码"
                />
            </div>
            <button onClick={handleLogin}>登录</button>
        </div>
    );
}

export default LoginPage;
