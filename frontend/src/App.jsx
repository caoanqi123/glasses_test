import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar } from 'antd';
import {
    UserOutlined,
    DatabaseOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import './App.css';
import LoginPage from './pages/LoginPage';
import TimeDataPage from './pages/TimeDataPage';
import OrgManagementPage from './pages/OrgManagementPage';
import UserManagementPage from './pages/UserManagementPage';

const { Sider, Content, Header } = Layout;

function App() {
    // 当前登录用户信息（null 表示未登录）
    const [currentUser, setCurrentUser] = useState(null);
    // 当前显示的页面标识: 'timeData' | 'orgManage' | 'userManage'
    const [currentPage, setCurrentPage] = useState('timeData');

    // 组件挂载时尝试从 localStorage 恢复登录状态
    useEffect(() => {
        const savedUsername = localStorage.getItem('username');
        const savedName = localStorage.getItem('name');
        const savedAuth = localStorage.getItem('authorityType');
        if (savedUsername && savedAuth) {
            setCurrentUser({
                username: savedUsername,
                name: savedName,
                authorityType: savedAuth,
            });
        }
    }, []);

    // 退出登录
    const handleLogout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('name');
        localStorage.removeItem('authorityType');
        setCurrentUser(null);
        setCurrentPage('timeData');
    };

    // 未登录时渲染登录页
    if (!currentUser) {
        return (
            <LoginPage onLoginSuccess={(user) => {
                setCurrentUser(user);
                setCurrentPage('timeData');
            }} />
        );
    }

    // 根据当前用户权限控制菜单项显示
    const { authorityType, name } = currentUser;
    const isOrgAdmin = authorityType === '组织';
    const isSysAdmin = authorityType === '管理员' || authorityType === '超管';
    const menuItems = [
        { key: 'timeData', icon: <DatabaseOutlined />, label: '时间数据' },
        ...(isSysAdmin ? [{ key: 'orgManage', icon: <TeamOutlined />, label: '组织管理' }] : []),
        ...(isOrgAdmin || isSysAdmin ? [{ key: 'userManage', icon: <UserOutlined />, label: '用户管理' }] : []),
    ];

    return (
        <Layout className="app-layout">
            {/* 左侧侧边栏菜单 */}
            <Sider width={220} className="app-sider">
                <div className="app-logo">
                    <DatabaseOutlined />
                    <span>神经心理评估系统</span>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[currentPage]}
                    onClick={(e) => setCurrentPage(e.key)}
                    items={menuItems}
                />
                <div style={{ position: 'absolute', bottom: 24, left: 20, right: 20, color: '#cbd5f5' }}>
                    <div style={{ marginBottom: 8 }}>当前用户：{name || currentUser.username}</div>
                    <Button type="primary" ghost size="small" onClick={handleLogout}>
                        退出登录
                    </Button>
                </div>
            </Sider>
            {/* 右侧主内容区 */}
            <Layout>
                <Header className="app-header">
                    <div className="header-title">量表数据管理</div>
                    <div className="header-user">
                        <span>{name || currentUser.username}</span>
                        <Avatar style={{ backgroundColor: '#3b82f6' }}>
                            {(name || currentUser.username).slice(0, 1)}
                        </Avatar>
                    </div>
                </Header>
                <Content className="app-content">
                    {currentPage === 'timeData' && <TimeDataPage currentUser={currentUser} />}
                    {currentPage === 'orgManage' && <OrgManagementPage />}
                    {currentPage === 'userManage' && <UserManagementPage currentUser={currentUser} />}
                </Content>
            </Layout>
        </Layout>
    );
}

export default App;
