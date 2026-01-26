import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
    UserOutlined,
    DatabaseOutlined,
    TeamOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
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
        const savedOrgId = localStorage.getItem('organizationId');
        if (savedUsername && savedAuth) {
            setCurrentUser({
                username: savedUsername,
                name: savedName,
                authorityType: savedAuth,
                organizationId: savedOrgId || '',
            });
        }
    }, []);

    // 退出登录
    const handleLogout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('name');
        localStorage.removeItem('authorityType');
        localStorage.removeItem('organizationId');
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
    const { name } = currentUser;
    const menuItems = [
        { key: 'timeData', icon: <DatabaseOutlined />, label: '时间数据' },
        { key: 'orgManage', icon: <TeamOutlined />, label: '组织管理' },
        { key: 'userManage', icon: <UserOutlined />, label: '用户管理' },
    ];

    const pageTitleMap = {
        timeData: '时间数据管理',
        orgManage: '组织管理',
        userManage: '用户管理',
    };

    const [collapsed, setCollapsed] = useState(false);
    const userMenu = {
        items: [
            {
                key: 'logout',
                label: '退出登录',
                onClick: handleLogout,
            },
        ],
    };

    return (
        <Layout className="app-layout">
            {/* 左侧侧边栏菜单 */}
            <Sider width={220} collapsedWidth={72} collapsed={collapsed} className="app-sider">
                <div className="app-logo">
                    <DatabaseOutlined />
                    {!collapsed && <span>眼镜数据管理系统</span>}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[currentPage]}
                    onClick={(e) => setCurrentPage(e.key)}
                    items={menuItems}
                />
                <div className="sider-toggle">
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                    />
                </div>
            </Sider>
            {/* 右侧主内容区 */}
            <Layout className="app-main">
                <Header className="app-header">
                    <div className="header-title">{pageTitleMap[currentPage]}</div>
                    <div className="header-user">
                        <span>{currentUser.username}</span>
                        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                            <Avatar style={{ backgroundColor: '#3b82f6', cursor: 'pointer' }}>
                                {(name || currentUser.username).slice(0, 1)}
                            </Avatar>
                        </Dropdown>
                    </div>
                </Header>
                <Content className="app-content">
                    {currentPage === 'timeData' && <TimeDataPage currentUser={currentUser} />}
                    {currentPage === 'orgManage' && <OrgManagementPage currentUser={currentUser} />}
                    {currentPage === 'userManage' && <UserManagementPage currentUser={currentUser} />}
                </Content>
            </Layout>
        </Layout>
    );
}

export default App;
