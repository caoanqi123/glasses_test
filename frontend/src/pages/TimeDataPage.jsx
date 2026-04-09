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
import { timeDataApi } from '../api';
import { getErrorMessage } from '../api/request';

function TimeDataPage({ currentUser }) {
    const [timeDataList, setTimeDataList] = useState([]);
    const [filterPhone, setFilterPhone] = useState('');
    const [filterMac, setFilterMac] = useState('');
    const [filterStart, setFilterStart] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [newAccount, setNewAccount] = useState('');
    const [newStartTime, setNewStartTime] = useState(null);
    const [newDuration, setNewDuration] = useState(null);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectGender, setNewSubjectGender] = useState('');
    const [newSubjectAge, setNewSubjectAge] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await timeDataApi.list(currentUser.username);
                if (!data.success) {
                    message.error(data.message || '无法获取时间数据');
                    return;
                }
                setTimeDataList(data.data);
            } catch (error) {
                message.error(getErrorMessage(error, '获取时间数据失败'));
            }
        };

        fetchData();
    }, [currentUser.username]);

    const filteredList = timeDataList.filter((item) => {
        const phoneMatch = item.timeDataPK.subjectPhone.includes(filterPhone);
        const macMatch = item.timeDataPK.glassesMac.includes(filterMac);
        const startStr = item.startTime ? String(item.startTime).replace('T', ' ') : '';
        const startMatch = startStr.includes(filterStart);
        return phoneMatch && macMatch && startMatch;
    });

    const startEdit = (record) => {
        setEditingRecord(record);
        setNewAccount(record.username);
        setNewSubjectName(record.subjectName || '');
        setNewSubjectGender(record.subjectGender || '');
        setNewSubjectAge(record.subjectAge ?? null);

        if (record.startTime) {
            setNewStartTime(dayjs(String(record.startTime).replace('T', ' ')));
        } else {
            setNewStartTime(null);
        }

        setNewDuration(record.duration);
    };

    const cancelEdit = () => {
        setEditingRecord(null);
        setNewAccount('');
        setNewStartTime(null);
        setNewDuration(null);
        setNewSubjectName('');
        setNewSubjectGender('');
        setNewSubjectAge(null);
    };

    const submitEdit = async () => {
        if (!/^\d{11}$/.test(newAccount)) {
            message.error('账号必须为11位数字');
            return;
        }
        if (!newSubjectName.trim()) {
            message.error('被试姓名不能为空');
            return;
        }
        if (newSubjectGender !== '男' && newSubjectGender !== '女') {
            message.error('被试性别必须为男或女');
            return;
        }
        if (!Number.isInteger(newSubjectAge) || newSubjectAge <= 0) {
            message.error('被试年龄必须为正整数');
            return;
        }
        if (!Number.isInteger(newDuration) || newDuration <= 0) {
            message.error('持续时间必须是正整数');
            return;
        }
        if (!newStartTime) {
            message.error('请选择开始时间');
            return;
        }

        const payload = {
            username: newAccount,
            startTime: newStartTime.format('YYYY-MM-DDTHH:mm:ss'),
            duration: newDuration,
            subjectName: newSubjectName.trim(),
            subjectGender: newSubjectGender,
            subjectAge: newSubjectAge,
        };

        const { subjectPhone, glassesMac, startTime } = editingRecord.timeDataPK;

        try {
            const data = await timeDataApi.update(subjectPhone, glassesMac, startTime, payload);
            if (!data.success) {
                message.error(data.message || '修改失败');
                return;
            }

            setTimeDataList((prevList) => prevList.map((item) => {
                if (
                    item.timeDataPK.subjectPhone === subjectPhone
                    && item.timeDataPK.glassesMac === glassesMac
                    && item.timeDataPK.startTime === startTime
                ) {
                    return {
                        ...item,
                        username: newAccount,
                        startTime: newStartTime.format('YYYY-MM-DDTHH:mm:ss'),
                        duration: newDuration,
                        subjectName: newSubjectName.trim(),
                        subjectGender: newSubjectGender,
                        subjectAge: newSubjectAge,
                    };
                }
                return item;
            }));

            message.success('记录已更新');
            cancelEdit();
        } catch (error) {
            message.error(getErrorMessage(error, '修改请求失败'));
        }
    };

    const deleteRecord = async (record) => {
        const { subjectPhone, glassesMac, startTime } = record.timeDataPK;

        try {
            const data = await timeDataApi.remove(subjectPhone, glassesMac, startTime, currentUser.username);
            if (!data.success) {
                message.error(data.message || '删除失败');
                return;
            }

            setTimeDataList((prevList) => prevList.filter((item) => !(
                item.timeDataPK.subjectPhone === subjectPhone
                && item.timeDataPK.glassesMac === glassesMac
                && item.timeDataPK.startTime === startTime
            )));
            message.success('记录已删除');
        } catch (error) {
            message.error(getErrorMessage(error, '删除请求失败'));
        }
    };

    const formatDuration = (value) => {
        if (!Number.isInteger(value) || value < 0) {
            return '';
        }
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleExport = async () => {
        if (selectedRows.length === 0) {
            message.warning('请先选择要导出的记录');
            return;
        }

        const payload = selectedRows.map((row) => ({
            subjectPhone: row.timeDataPK.subjectPhone,
            glassesMac: row.timeDataPK.glassesMac,
            startTime: row.timeDataPK.startTime,
        }));

        try {
            const { data: blob, response } = await timeDataApi.exportSelection(payload);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'time_data.xlsx';

            if (disposition) {
                const match = disposition.match(/filename="([^"]+)"/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            message.success('导出成功');
            setSelectedRowKeys([]);
            setSelectedRows([]);
        } catch (error) {
            message.error(getErrorMessage(error, '导出请求失败'));
        }
    };

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
        {
            title: '持续时间',
            dataIndex: 'duration',
            key: 'duration',
            width: 120,
            align: 'center',
            render: (value) => formatDuration(value),
        },
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
                                    onChange={(e) => setFilterPhone(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="MAC">
                                <Input
                                    placeholder="请输入 MAC"
                                    value={filterMac}
                                    onChange={(e) => setFilterMac(e.target.value)}
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
                                            const str = value.format('YYYY-MM-DD');
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
                <Row justify="end" style={{ marginBottom: 12 }}>
                    <Button type="primary" onClick={handleExport}>
                        批量导出
                    </Button>
                </Row>
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={filteredList}
                    rowKey={(record) => `${record.timeDataPK.subjectPhone}_${record.timeDataPK.glassesMac}_${record.timeDataPK.startTime}`}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys, rows) => {
                            setSelectedRowKeys(keys);
                            setSelectedRows(rows);
                        },
                    }}
                    tableLayout="fixed"
                    scroll={{ x: 1200 }}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </Card>
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
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                placeholder="请输入被试姓名"
                                maxLength={50}
                            />
                        </Form.Item>
                        <Form.Item label="被试性别">
                            <Select
                                value={newSubjectGender}
                                onChange={(value) => setNewSubjectGender(value)}
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
                                onChange={(e) => setNewAccount(e.target.value)}
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
