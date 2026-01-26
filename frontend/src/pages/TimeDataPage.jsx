import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Input,
    DatePicker,
    InputNumber,
    Popconfirm,
    Space,
    message,
    Card,
    Form,
    Row,
    Col,
} from 'antd';
import dayjs from 'dayjs';

function TimeDataPage({ currentUser }) {
    const [timeDataList, setTimeDataList] = useState([]);   // 时间数据完整列表
    const [filterPhone, setFilterPhone] = useState('');     // 筛选：手机号
    const [filterMac, setFilterMac] = useState('');         // 筛选：MAC地址
    const [filterStart, setFilterStart] = useState('');     // 筛选：开始时间字符串（日期模糊）
    const [filterStartDate, setFilterStartDate] = useState(null); // 筛选：开始时间选择器值
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
        const startStr = item.startTime ? String(item.startTime).replace('T', ' ') : '';
        const startMatch = startStr.includes(filterStart);
        return phoneMatch && macMatch && startMatch;
    });

    // 点击“修改”按钮，打开编辑弹窗并初始化表单字段
    const startEdit = (record) => {
        setEditingRecord(record);
        setNewAccount(record.username);
        // 将开始时间字符串转换为 dayjs 对象作为初始值
        if (record.startTime) {
            setNewStartTime(dayjs(String(record.startTime).replace('T', ' ')));
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
        if (!Number.isInteger(newDuration) || newDuration <= 0) {
            message.error("持续时间必须是正整数");
            return;
        }
        if (!newStartTime) {
            message.error("请选择开始时间");
            return;
        }
        // 准备请求体数据
        const payload = {
            username: newAccount,
            startTime: newStartTime.format("YYYY-MM-DDTHH:mm:ss"),
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
                            startTime: newStartTime.format("YYYY-MM-DDTHH:mm:ss"),
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
        {
            title: '开始时间',
            dataIndex: 'startTime',
            key: 'startTime',
            render: (value) => (value ? String(value).replace('T', ' ') : ''),
        },
        { title: '持续(秒)', dataIndex: 'duration', key: 'duration' },
        {
            title: '操作',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space className="action-buttons">
                    <Button type="link" size="small" onClick={() => startEdit(record)}>
                        修改
                    </Button>
                    <Popconfirm
                        title="确认删除该记录？"
                        onConfirm={() => deleteRecord(record)}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button type="link" size="small" danger>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="time-data-page page-container">
            <div className="page-header">
                <div>
                    <div className="page-title">时间数据</div>
                </div>
            </div>
            <Card className="filter-card" bordered={false}>
                <Form layout="vertical" className="filter-form">
                    <Row gutter={[16, 12]}>
                        <Col xs={24} md={8}>
                            <Form.Item label="受试者手机号">
                                <Input
                                    placeholder="请输入受试者手机号"
                                    value={filterPhone}
                                    onChange={e => setFilterPhone(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="眼镜 MAC">
                                <Input
                                    placeholder="请输入眼镜 MAC"
                                    value={filterMac}
                                    onChange={e => setFilterMac(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="开始时间">
                                <DatePicker
                                    placeholder="请选择开始日期"
                                    value={filterStartDate}
                                    format="YYYY-MM-DD"
                                    allowClear
                                    style={{ width: '100%' }}
                                    onChange={(value) => {
                                        if (value) {
                                            const str = value.format("YYYY-MM-DD");
                                            setFilterStart(str);
                                            setFilterStartDate(value);
                                        } else {
                                            setFilterStart('');
                                            setFilterStartDate(null);
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>
            <Card className="table-card" bordered={false}>
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={filteredList}
                    rowKey={record => `${record.timeDataPK.subjectPhone}_${record.timeDataPK.glassesMac}`}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
            {/* 编辑记录弹窗 */}
            {editingRecord && (
                <Modal
                    title="修改记录"
                    open={!!editingRecord}
                    onOk={submitEdit}
                    onCancel={cancelEdit}
                    okText="提交"
                    cancelText="取消"
                >
                    <Form layout="vertical">
                        <Form.Item label="被试手机号">
                            <Input value={editingRecord.timeDataPK.subjectPhone} disabled />
                        </Form.Item>
                        <Form.Item label="MAC">
                            <Input value={editingRecord.timeDataPK.glassesMac} disabled />
                        </Form.Item>
                        <Form.Item label="关联账号">
                            <Input
                                value={newAccount}
                                onChange={e => setNewAccount(e.target.value)}
                                placeholder="11位账号"
                                maxLength={11}
                            />
                        </Form.Item>
                        <Form.Item label="开始时间">
                            <DatePicker
                                showTime={{ format: 'HH:mm:ss' }}
                                value={newStartTime}
                                onChange={(val) => setNewStartTime(val)}
                                format="YYYY-MM-DD HH:mm:ss"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item label="持续时间(秒)">
                            <InputNumber
                                value={newDuration}
                                min={1}
                                step={1}
                                precision={0}
                                onChange={(value) => setNewDuration(value)}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </div>
    );
}

export default TimeDataPage;
