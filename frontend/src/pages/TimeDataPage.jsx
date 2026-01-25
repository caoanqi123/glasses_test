import React, { useState, useEffect } from 'react';

function TimeDataPage({ currentUser }) {
    const [timeDataList, setTimeDataList] = useState([]);
    const [filterPhone, setFilterPhone] = useState('');
    const [filterMac, setFilterMac] = useState('');
    const [filterStart, setFilterStart] = useState('');
    const [editingRecord, setEditingRecord] = useState(null);  // 正在编辑的记录 (TimeData 对象)
    const [newAccount, setNewAccount] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newDuration, setNewDuration] = useState('');

    // 初始加载：获取 time_data 列表
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/time-data?username=${currentUser.username}`);
                const data = await res.json();
                if (data.success === false) {
                    alert(data.message || "无法获取数据");
                } else {
                    setTimeDataList(data);
                }
            } catch (err) {
                console.error("Failed to fetch time data:", err);
            }
        };
        fetchData();
    }, [currentUser.username]);

    // 根据筛选字段对 timeDataList 进行过滤
    const filteredList = timeDataList.filter(item => {
        const phoneMatch = item.timeDataPK.subjectPhone.includes(filterPhone);
        const macMatch = item.timeDataPK.glassesMac.includes(filterMac);
        const startMatch = item.startTime && item.startTime.includes(filterStart);
        return phoneMatch && macMatch && startMatch;
    });

    const startEdit = (record) => {
        // 打开编辑表单，初始化表单字段
        setEditingRecord(record);
        setNewAccount(record.username);
        // 将 LocalDateTime 转为 <input type="datetime-local"> 可用的字符串 (去掉秒)
        let startStr = record.startTime;
        if (startStr) {
            startStr = startStr.slice(0, 16);
        }
        setNewStartTime(startStr);
        setNewDuration(record.duration);
    };

    const cancelEdit = () => {
        setEditingRecord(null);
        setNewAccount('');
        setNewStartTime('');
        setNewDuration('');
    };

    const submitEdit = async () => {
        if (!/^\d{11}$/.test(newAccount)) {
            alert("账号必须为11位数字");
            return;
        }
        if (newDuration === '' || isNaN(newDuration) || Number(newDuration) < 0) {
            alert("持续时间必须是非负整数");
            return;
        }
        // 准备请求体数据
        const payload = {
            username: newAccount,
            startTime: newStartTime,
            duration: newDuration === '' ? null : Number(newDuration)
        };
        const { subjectPhone, glassesMac } = editingRecord.timeDataPK;
        try {
            const res = await fetch(`/api/time-data/${encodeURIComponent(subjectPhone)}/${encodeURIComponent(glassesMac)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success === false) {
                alert(data.message || "修改失败");
            } else {
                // 本地更新列表中的这条记录
                setTimeDataList(prevList => prevList.map(item => {
                    if (item.timeDataPK.subjectPhone === subjectPhone
                        && item.timeDataPK.glassesMac === glassesMac) {
                        return {
                            ...item,
                            username: newAccount,
                            startTime: newStartTime ? newStartTime + (newStartTime.length === 16 ? ":00" : "") : item.startTime,
                            duration: newDuration === '' ? item.duration : Number(newDuration)
                        };
                    }
                    return item;
                }));
                alert("记录已更新");
                cancelEdit();
            }
        } catch (err) {
            console.error("Update failed:", err);
            alert("修改请求失败");
        }
    };

    const deleteRecord = async (record) => {
        if (!window.confirm(`确认删除该记录？ (受试者:${record.timeDataPK.subjectPhone})`)) {
            return;
        }
        const { subjectPhone, glassesMac } = record.timeDataPK;
        try {
            const res = await fetch(`/api/time-data/${encodeURIComponent(subjectPhone)}/${encodeURIComponent(glassesMac)}?username=${currentUser.username}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success === false) {
                alert(data.message || "删除失败");
            } else {
                setTimeDataList(prevList => prevList.filter(item =>
                    !(item.timeDataPK.subjectPhone === subjectPhone && item.timeDataPK.glassesMac === glassesMac)
                ));
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    return (
        <div className="time-data-page">
            <h2>时间数据</h2>

            {/* 筛选输入框 */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="筛选手机号"
                    value={filterPhone}
                    onChange={e => setFilterPhone(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="筛选眼镜MAC"
                    value={filterMac}
                    onChange={e => setFilterMac(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="筛选开始时间"
                    value={filterStart}
                    onChange={e => setFilterStart(e.target.value)}
                />
            </div>

            {/* 列表表格 */}
            <table className="data-table">
                <thead>
                <tr>
                    <th>受试者手机</th><th>眼镜MAC</th><th>记录者账号</th>
                    <th>开始时间</th><th>持续(秒)</th><th>操作</th>
                </tr>
                </thead>
                <tbody>
                {filteredList.map(item => (
                    <tr key={`${item.timeDataPK.subjectPhone}_${item.timeDataPK.glassesMac}`}>
                        <td>{item.timeDataPK.subjectPhone}</td>
                        <td>{item.timeDataPK.glassesMac}</td>
                        <td>{item.username}</td>
                        <td>{item.startTime}</td>
                        <td>{item.duration}</td>
                        <td>
                            <button onClick={() => startEdit(item)}>修改</button>
                            <button onClick={() => deleteRecord(item)}>删除</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* 编辑表单弹出 */}
            { editingRecord && (
                <div className="edit-form">
                    <h3>修改记录</h3>
                    <p><b>受试者:</b> {editingRecord.timeDataPK.subjectPhone} &nbsp;
                        <b>眼镜MAC:</b> {editingRecord.timeDataPK.glassesMac}</p>
                    <div>
                        <label>记录者账号:</label>
                        <input
                            type="text"
                            value={newAccount}
                            onChange={e => setNewAccount(e.target.value)}
                            placeholder="11位账号"
                            maxLength={11}
                        />
                    </div>
                    <div>
                        <label>开始时间:</label>
                        <input
                            type="datetime-local"
                            value={newStartTime}
                            onChange={e => setNewStartTime(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>持续时间(秒):</label>
                        <input
                            type="number"
                            value={newDuration}
                            min="0"
                            onChange={e => setNewDuration(e.target.value)}
                        />
                    </div>
                    <button onClick={submitEdit}>提交</button>
                    <button onClick={cancelEdit}>取消</button>
                </div>
            )}
        </div>
    );
}

export default TimeDataPage;
