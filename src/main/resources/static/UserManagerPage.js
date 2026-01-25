import React, { useState, useEffect } from 'react';

function UserManagementPage({ currentUser }) {
    const [userList, setUserList] = useState([]);
    const [orgOptions, setOrgOptions] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [newAuthority, setNewAuthority] = useState('');
    const [newOrgId, setNewOrgId] = useState('');

    useEffect(() => {
        // 获取用户列表（根据当前用户权限由后端过滤）
        const fetchUsers = async () => {
            try {
                const res = await fetch(`/api/users?username=${currentUser.username}`);
                const data = await res.json();
                if (data.success === false) {
                    alert(data.message || "无法获取用户列表");
                } else {
                    setUserList(data);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        // 获取组织列表供编辑时选择
        const fetchOrgs = async () => {
            try {
                const res = await fetch('/api/organizations');
                const data = await res.json();
                if (!(data.success === false)) {
                    setOrgOptions(data);
                }
            } catch {}
        };
        fetchUsers();
        fetchOrgs();
    }, [currentUser.username]);

    const startEditUser = (user) => {
        setEditingUser(user);
        setNewAuthority(user.authorityType);
        setNewOrgId(user.organizationId || '');  // 若无组织则设为空字符串
    };

    const cancelEditUser = () => {
        setEditingUser(null);
        setNewAuthority('');
        setNewOrgId('');
    };

    const submitUserEdit = async () => {
        if (!newAuthority) {
            alert("请选择权限类型");
            return;
        }
        // 对于个人/组织用户必须选择组织
        if ((newAuthority === '个人' || newAuthority === '组织') && !newOrgId) {
            alert("个人/组织用户必须选择所属组织");
            return;
        }
        // 管理员/超管用户可以org为空，无需特别校验 orgId（如果选了也可以发送）
        const payload = { authorityType: newAuthority, organizationId: newOrgId };
        try {
            const res = await fetch(`/api/users/${encodeURIComponent(editingUser.username)}?currentUsername=${currentUser.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success === false) {
                alert(data.message || "更新失败");
            } else {
                // 更新本地 userList 数据
                setUserList(prevList => prevList.map(u => {
                    if (u.username === editingUser.username) {
                        return { ...u, authorityType: newAuthority, organizationId: newOrgId };
                    }
                    return u;
                }));
                alert("用户信息已更新");
                cancelEditUser();
            }
        } catch (err) {
            console.error("User update failed:", err);
            alert("更新请求失败");
        }
    };

    const deleteUser = async (user) => {
        if (user.username === currentUser.username) {
            alert("不能删除自己");
            return;
        }
        if (!window.confirm(`确认删除用户 ${user.username} 吗？`)) {
            return;
        }
        try {
            const res = await fetch(`/api/users/${encodeURIComponent(user.username)}?currentUsername=${currentUser.username}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success === false) {
                alert(data.message || "删除失败");
            } else {
                setUserList(prevList => prevList.filter(u => u.username !== user.username));
            }
        } catch (err) {
            console.error("Delete user failed:", err);
        }
    };

    return (
        <div className="user-management-page">
            <h2>用户管理</h2>
            <table className="data-table">
                <thead>
                <tr>
                    <th>账号</th><th>姓名</th><th>权限</th><th>组织</th><th>操作</th>
                </tr>
                </thead>
                <tbody>
                {userList.map(u => (
                    <tr key={u.username}>
                        <td>{u.username}</td>
                        <td>{u.name}</td>
                        <td>{u.authorityType}</td>
                        <td>{u.organizationId || ''}</td>
                        <td>
                            <button onClick={() => startEditUser(u)}>编辑</button>
                            <button onClick={() => deleteUser(u)}>删除</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            { editingUser && (
                <div className="edit-form">
                    <h3>编辑用户: {editingUser.username}</h3>
                    <p><b>姓名:</b> {editingUser.name}</p>
                    <div>
                        <label>权限类型:</label>
                        <select value={newAuthority} onChange={e => setNewAuthority(e.target.value)}>
                            <option value="">--选择权限--</option>
                            <option value="个人">个人</option>
                            <option value="组织">组织</option>
                            <option value="管理员">管理员</option>
                            <option value="超管">超管</option>
                        </select>
                    </div>
                    <div>
                        <label>所属组织:</label>
                        <select value={newOrgId} onChange={e => setNewOrgId(e.target.value)}>
                            <option value="">--选择组织--</option>
                            {orgOptions.map(org => (
                                <option key={org.organizationId} value={org.organizationId}>
                                    {org.organizationName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={submitUserEdit}>保存</button>
                    <button onClick={cancelEditUser}>取消</button>
                </div>
            )}
        </div>
    );
}

export default UserManagementPage;
