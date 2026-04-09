import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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
import { clearStoredUser, readStoredUser, storeUser } from './utils/authStorage';

const { Sider, Content, Header } = Layout;

function HomeLayout({ currentUser, onLogout }) {
    const [currentPage, setCurrentPage] = useState('timeData');
    const [collapsed, setCollapsed] = useState(false);

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

    const userMenu = {
        items: [
            {
                key: 'logout',
                label: '退出登录',
                onClick: onLogout,
            },
        ],
    };

    return (
        <Layout className="app-layout">
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

function App() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(() => readStoredUser());

    const handleLoginSuccess = (user) => {
        storeUser(user);
        setCurrentUser(user);
        navigate('/home', { replace: true });
    };

    const handleLogout = () => {
        clearStoredUser();
        setCurrentUser(null);
        navigate('/login', { replace: true });
    };

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route
                path="/login"
                element={
                    currentUser
                        ? <Navigate to="/home" replace />
                        : <LoginPage onLoginSuccess={handleLoginSuccess} />
                }
            />
            <Route
                path="/home"
                element={
                    currentUser
                        ? <HomeLayout currentUser={currentUser} onLogout={handleLogout} />
                        : <Navigate to="/login" replace />
                }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    );
}

export default App;
