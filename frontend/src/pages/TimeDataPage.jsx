import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Input, DatePicker, InputNumber, Popconfirm, Space, message } from 'antd';
import dayjs from 'dayjs';

function TimeDataPage({ currentUser }) {
    const [timeDataList, setTimeDataList] = useState([]);   // 时间数据完整列表
    const [filterPhone, setFilterPhone] = useState('');     // 筛选：手机号
    const [filterMac, setFilterMac] = useState('');         // 筛选：MAC地址
    const [filterStart, setFilterStart] = useState('');     // 筛选：开始时间字符串（含日期）
    const [editingRecord, setEditingRecord] = useState(null);  // 当前正在编辑的记录
    const [newAccount, setNewAccount] = useState('');          // 编辑表单：新的记录者账号
    const [newStartTime, setNewStartTime] = useState(null);    // 编辑表单：新的开始时间 (dayjs 对象)
    const [newDuration, setNewDuration] = useState(null);      // 编辑表单：新的持续时间 (秒)

    // 初始化加载当前用户可查看的 timeData 列表
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/time-data?username=${currentUser.username}`);
                const data = await res.json();
                if (!data.success) {
                    message.error(data.message || "无法获取时间数据");
                } else {
                    setTimeDataList(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch time data:", err);
                message.error("获取时间数据失败");
            }
        };
        fetchData();
    }, [currentUser.username]);

    // 根据筛选字段对列表进行过滤
    const filteredList = timeDataList.filter(item => {
        const phoneMatch = item.timeDataPK.subjectPhone.includes(filterPhone);
        const macMatch = item.timeDataPK.glassesMac.includes(filterMac);
        const startStr = item.startTime ? String(item.startTime) : '';
        const startMatch = startStr.includes(filterStart);
        return phoneMatch && macMatch && startMatch;
    });

    // 点击“修改”按钮，打开编辑弹窗并初始化表单字段
    const startEdit = (record) => {
        setEditingRecord(record);
        setNewAccount(record.username);
        // 将开始时间字符串转换为 dayjs 对象作为初始值
        if (record.startTime) {
            setNewStartTime(dayjs(record.startTime));
        } else {
            setNewStartTime(null);
        }
        setNewDuration(record.duration);
    };

    // 取消编辑
    const cancelEdit = () => {
        setEditingRecord(null);
        setNewAccount('');
        setNewStartTime(null);
        setNewDuration(null);
    };

    // 提交修改
    const submitEdit = async () => {
        // 前端校验输入
        if (!/^\d{11}$/.test(newAccount)) {
            message.error("账号必须为11位数字");
            return;
        }
        if (newDuration === null || newDuration === undefined || newDuration < 0) {
            message.error("持续时间必须是非负整数");
            return;
        }
        // 准备请求体数据
        const payload = {
            username: newAccount,
            startTime: newStartTime ? newStartTime.format("YYYY-MM-DD'T'HH:mm:ss") : null,
            duration: newDuration,
        };
        const { subjectPhone, glassesMac } = editingRecord.timeDataPK;
        try {
            const res = await fetch(`/time-data/${encodeURIComponent(subjectPhone)}/${encodeURIComponent(glassesMac)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "修改失败");
            } else {
                // 更新本地列表数据
                setTimeDataList(prevList => prevList.map(item => {
                    if (item.timeDataPK.subjectPhone === subjectPhone && item.timeDataPK.glassesMac === glassesMac) {
                        return {
                            ...item,
                            username: newAccount,
                            startTime: newStartTime ? newStartTime.format("YYYY-MM-DDTHH:mm:ss") : item.startTime,
                            duration: newDuration,
                        };
                    }
                    return item;
                }));
                message.success("记录已更新");
                cancelEdit();
            }
        } catch (err) {
            console.error("Update failed:", err);
            message.error("修改请求失败");
        }
    };

    // 删除记录
    const deleteRecord = async (record) => {
        const { subjectPhone, glassesMac } = record.timeDataPK;
        try {
            const res = await fetch(`/time-data/${encodeURIComponent(subjectPhone)}/${encodeURIComponent(glassesMac)}?username=${currentUser.username}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!data.success) {
                message.error(data.message || "删除失败");
            } else {
                setTimeDataList(prevList => prevList.filter(item =>
                    !(item.timeDataPK.subjectPhone === subjectPhone && item.timeDataPK.glassesMac === glassesMac)
                ));
                message.success("记录已删除");
            }
        } catch (err) {
            console.error("Delete failed:", err);
            message.error("删除请求失败");
        }
    };

    // 表格列定义
    const columns = [
        { title: '受试者手机', dataIndex: ['timeDataPK', 'subjectPhone'], key: 'subjectPhone' },
        { title: '眼镜MAC', dataIndex: ['timeDataPK', 'glassesMac'], key: 'glassesMac' },
        { title: '记录者账号', dataIndex: 'username', key: 'username' },
        { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
        { title: '持续(秒)', dataIndex: 'duration', key: 'duration' },
        { title: '操作', key: 'actions',
            render: (_, record) => (
                <>
                    <Button size="small" onClick={() => startEdit(record)}>修改</Button>
                    <Popconfirm
                        title="确认删除该记录？"
                        onConfirm={() => deleteRecord(record)}
                        okText="确认" cancelText="取消"
                    >
                        <Button size="small" danger style={{ marginLeft: 8 }}>删除</Button>
                    </Popconfirm>
                </>
            )
        },
    ];

    return (
        <div className="time-data-page">
            <h2>时间数据</h2>
            {/* 筛选输入框 */}
            <Space style={{ marginBottom: 16 }}>
                <Input
                    placeholder="筛选手机号"
                    value={filterPhone}
                    onChange={e => setFilterPhone(e.target.value)}
                    allowClear
                />
                <Input
                    placeholder="筛选眼镜MAC"
                    value={filterMac}
                    onChange={e => setFilterMac(e.target.value)}
                    allowClear
                />
                <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    placeholder="筛选开始时间"
                    value={filterStart ? dayjs(filterStart) : null}
                    format="YYYY-MM-DD HH:mm"
                    allowClear
                    onChange={(value, dateString) => {
                        if (value) {
                            // 转换为包含'T'的格式子串用于匹配
                            const str = value.format("YYYY-MM-DD'T'HH:mm");
                            setFilterStart(str);
                        } else {
                            setFilterStart('');
                        }
                    }}
                />
            </Space>
            {/* 数据列表表格 */}
            <Table
                className="data-table"
                columns={columns}
                dataSource={filteredList}
                rowKey={record => `${record.timeDataPK.subjectPhone}_${record.timeDataPK.glassesMac}`}
                pagination={{ pageSize: 8 }}
            />
            {/* 编辑记录弹窗 */}
            {editingRecord && (
                <Modal
                    title="修改记录"
                    visible={!!editingRecord}
                    onOk={submitEdit}
                    onCancel={cancelEdit}
                    okText="提交"
                    cancelText="取消"
                >
                    <p>
                        <b>受试者:</b> {editingRecord.timeDataPK.subjectPhone}&nbsp;&nbsp;
                        <b>眼镜MAC:</b> {editingRecord.timeDataPK.glassesMac}
                    </p>
                    <div style={{ marginBottom: 8 }}>
                        <b>记录者账号:</b>{' '}
                        <Input
                            value={newAccount}
                            onChange={e => setNewAccount(e.target.value)}
                            placeholder="11位账号"
                            maxLength={11}
                        />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <b>开始时间:</b>{' '}
                        <DatePicker
                            showTime
                            value={newStartTime}
                            onChange={(val) => setNewStartTime(val)}
                            format="YYYY-MM-DD HH:mm:ss"
                        />
                    </div>
                    <div>
                        <b>持续时间(秒):</b>{' '}
                        <InputNumber
                            value={newDuration}
                            min={0}
                            step={1}
                            onChange={(value) => setNewDuration(value)}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default TimeDataPage;
