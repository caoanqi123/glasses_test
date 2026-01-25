import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage'
import TimeDataPage from './pages/TimeDataPage'
import OrgManagementPage from './pages/OrgManagementPage'
import UserManagementPage from './pages/UserManagementPage'

function App() {
    // 当前登录用户信息状态（null表示未登录）
    const [currentUser, setCurrentUser] = useState(null);
    // 当前显示的菜单页标识: 'timeData' | 'orgManage' | 'userManage'
    const [currentPage, setCurrentPage] = useState('timeData');

    useEffect(() => {
        // 组件挂载时，从 localStorage 恢复登录状态
        const savedUsername = localStorage.getItem('username');
        const savedName = localStorage.getItem('name');
        const savedAuth = localStorage.getItem('authorityType');
        if (savedUsername && savedAuth) {
            setCurrentUser({
                username: savedUsername,
                name: savedName,
                authorityType: savedAuth
            });
        }
    }, []);

    const handleLogout = () => {
        // 清除本地保存的登录信息并重置状态
        localStorage.removeItem('username');
        localStorage.removeItem('name');
        localStorage.removeItem('authorityType');
        setCurrentUser(null);
    };

    if (!currentUser) {
        // 未登录，显示登录页
        return <LoginPage onLoginSuccess={user => {
            setCurrentUser(user);
            setCurrentPage('timeData');
        }} />;
    }

    // 已登录，显示主界面布局
    const { authorityType } = currentUser;
    const isOrgAdmin = authorityType === '组织';        // 组织管理员
    const isSysAdmin = authorityType === '管理员' || authorityType === '超管';  // 系统管理员或超管
    const showUserManage = isOrgAdmin || isSysAdmin;    // 组织管理员或以上可见用户管理
    const showOrgManage = isSysAdmin;                   // 仅系统管理员/超管可见组织管理（可根据需求调整）

    return (
        <div className="app-container">
            {/* 左侧菜单栏 */}
            <div className="sidebar">
                <h3>菜单</h3>
                <ul>
                    <li
                        className={currentPage === 'timeData' ? 'active' : ''}
                        onClick={() => setCurrentPage('timeData')}
                    >
                        时间数据
                    </li>
                    { showOrgManage && (
                        <li
                            className={currentPage === 'orgManage' ? 'active' : ''}
                            onClick={() => setCurrentPage('orgManage')}
                        >
                            组织管理
                        </li>
                    )}
                    { showUserManage && (
                        <li
                            className={currentPage === 'userManage' ? 'active' : ''}
                            onClick={() => setCurrentPage('userManage')}
                        >
                            用户管理
                        </li>
                    )}
                </ul>
                <div className="logout-section">
                    <p>当前用户: {currentUser.name || currentUser.username}</p>
                    <button onClick={handleLogout}>退出登录</button>
                </div>
            </div>

            {/* 右侧内容区，根据 currentPage 切换显示 */}
            <div className="main-content">
                { currentPage === 'timeData' &&
                    <TimeDataPage currentUser={currentUser} /> }
                { currentPage === 'orgManage' &&
                    <OrgManagementPage /> }
                { currentPage === 'userManage' &&
                    <UserManagementPage currentUser={currentUser} /> }
            </div>
        </div>
    );
}

export default App;
