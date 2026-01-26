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
    Select,
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
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectGender, setNewSubjectGender] = useState('');
    const [newSubjectAge, setNewSubjectAge] = useState(null);

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
        setNewSubjectName(record.subjectName || '');
        setNewSubjectGender(record.subjectGender || '');
        setNewSubjectAge(record.subjectAge ?? null);
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
        setNewSubjectName('');
        setNewSubjectGender('');
        setNewSubjectAge(null);
    };

    // 提交修改
    const submitEdit = async () => {
        // 前端校验输入
        if (!/^\d{11}$/.test(newAccount)) {
            message.error("账号必须为11位数字");
            return;
        }
        if (!newSubjectName.trim()) {
            message.error("被试姓名不能为空");
            return;
        }
        if (newSubjectGender !== '男' && newSubjectGender !== '女') {
            message.error("被试性别必须为男或女");
            return;
        }
        if (!Number.isInteger(newSubjectAge) || newSubjectAge <= 0) {
            message.error("被试年龄必须为正整数");
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
            subjectName: newSubjectName.trim(),
            subjectGender: newSubjectGender,
            subjectAge: newSubjectAge,
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
                            subjectName: newSubjectName.trim(),
                            subjectGender: newSubjectGender,
                            subjectAge: newSubjectAge,
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
        { title: '姓名', dataIndex: 'subjectName', key: 'subjectName', width: 100, align: 'center', ellipsis: true },
        { title: '性别', dataIndex: 'subjectGender', key: 'subjectGender', width: 80, align: 'center' },
        { title: '年龄', dataIndex: 'subjectAge', key: 'subjectAge', width: 80, align: 'center' },
        { title: '被试手机号', dataIndex: ['timeDataPK', 'subjectPhone'], key: 'subjectPhone', width: 130, align: 'center' },
        { title: 'MAC', dataIndex: ['timeDataPK', 'glassesMac'], key: 'glassesMac', width: 160, align: 'center', ellipsis: true },
        {
            title: '开始时间',
            dataIndex: 'startTime',
            key: 'startTime',
            width: 180,
            align: 'center',
            render: (value) => (value ? String(value).replace('T', ' ') : ''),
        },
        { title: '持续时间(秒)', dataIndex: 'duration', key: 'duration', width: 120, align: 'center' },
        { title: '关联账号', dataIndex: 'username', key: 'username', width: 140, align: 'center' },
        {
            title: '操作',
            key: 'actions',
            width: 120,
            align: 'center',
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
            <Card className="filter-card" bordered={false}>
                <Form layout="inline" className="filter-form">
                    <Row gutter={[16, 12]} style={{ width: '100%' }}>
                        <Col xs={24} md={8}>
                            <Form.Item label="被试手机号">
                                <Input
                                    placeholder="请输入被试手机号"
                                    value={filterPhone}
                                    onChange={e => setFilterPhone(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="MAC">
                                <Input
                                    placeholder="请输入 MAC"
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
                    tableLayout="fixed"
                    scroll={{ x: 1200 }}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
            {/* 编辑记录弹窗 */}
            {editingRecord && (
                <Modal
                    title={null}
                    open={!!editingRecord}
                    onOk={submitEdit}
                    onCancel={cancelEdit}
                    okText="提交"
                    cancelText="取消"
                >
                    <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
                        <Form.Item label="被试手机号">
                            <Input value={editingRecord.timeDataPK.subjectPhone} disabled />
                        </Form.Item>
                        <Form.Item label="MAC">
                            <Input value={editingRecord.timeDataPK.glassesMac} disabled />
                        </Form.Item>
                        <Form.Item label="被试姓名">
                            <Input
                                value={newSubjectName}
                                onChange={e => setNewSubjectName(e.target.value)}
                                placeholder="请输入被试姓名"
                                maxLength={50}
                            />
                        </Form.Item>
                        <Form.Item label="被试性别">
                            <Select
                                value={newSubjectGender}
                                onChange={value => setNewSubjectGender(value)}
                                placeholder="请选择性别"
                            >
                                <Select.Option value="男">男</Select.Option>
                                <Select.Option value="女">女</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="被试年龄">
                            <InputNumber
                                value={newSubjectAge}
                                min={1}
                                step={1}
                                precision={0}
                                onChange={(value) => setNewSubjectAge(value)}
                                style={{ width: '100%' }}
                            />
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
