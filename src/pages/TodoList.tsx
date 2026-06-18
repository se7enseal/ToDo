import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select, Button, Table, Tag, Space, Popconfirm, message, Badge, Dropdown } from 'antd';
import { PlusOutlined, ImportOutlined, SettingOutlined, BellOutlined, EditOutlined, ClockCircleOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TodoForm, { TodoFormData } from '../components/TodoForm';
import SnoozeModal from '../components/SnoozeModal';
import { formatDateTime, isOverdue, isToday } from '../utils/date';

const { Search } = Input;

const priorityColors: Record<string, string> = {
  '高': 'red',
  '中': 'orange',
  '低': 'green',
};

const statusColors: Record<string, string> = {
  '待处理': 'orange',
  '已完成': 'green',
};

const TodoList: React.FC = () => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeTodo, setSnoozeTodo] = useState<any | null>(null);
  const [defaultSnoozeMinutes, setDefaultSnoozeMinutes] = useState(30);
  const [pendingCount, setPendingCount] = useState(0);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.todoList({
        keyword,
        status: statusFilter,
        timeFilter,
      });
      setTodos(data);
    } catch (err) {
      console.error('获取待办列表失败:', err);
    }
    setLoading(false);
  }, [keyword, statusFilter, timeFilter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    window.electronAPI.settingsGet().then((settings: any) => {
      setDefaultSnoozeMinutes(settings.default_snooze_minutes || 30);
    });
  }, []);

  useEffect(() => {
    window.electronAPI.onReminderFired((todo: any) => {
      message.warning(`提醒：${todo.title} 需要处理`);
      fetchTodos();
    });
    window.electronAPI.onFocusTodo((id: number) => {
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 5000);
    });
    window.electronAPI.onTodoUpdated(() => {
      fetchTodos();
    });
  }, [fetchTodos]);

  useEffect(() => {
    const count = todos.filter(t => t.status !== '已完成' && t.remind_at && isToday(t.remind_at) && !t.reminded).length;
    setPendingCount(count);
  }, [todos]);

  const handleCreate = async (data: TodoFormData) => {
    await window.electronAPI.todoCreate(data);
    setFormOpen(false);
    message.success('待办已创建');
    fetchTodos();
  };

  const handleUpdate = async (data: TodoFormData) => {
    if (!editData) return;
    await window.electronAPI.todoUpdate(editData.id, data);
    setFormOpen(false);
    setEditData(null);
    message.success('待办已更新');
    fetchTodos();
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.todoDelete(id);
    message.success('待办已删除');
    fetchTodos();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await window.electronAPI.todoUpdate(id, { status });
    message.success(`已标记为${status}`);
    fetchTodos();
  };

  const handleSnooze = async (remindAt: string) => {
    if (!snoozeTodo) return;
    const minutes = Math.round((new Date(remindAt).getTime() - Date.now()) / 60000);
    await window.electronAPI.reminderSnooze(snoozeTodo.id, minutes);
    setSnoozeOpen(false);
    setSnoozeTodo(null);
    message.success('已设置稍后提醒');
    fetchTodos();
  };

  const columns = [
    {
      title: '等级',
      dataIndex: 'priority',
      width: 60,
      align: 'center' as const,
      render: (v: string) => <Tag color={priorityColors[v] || 'orange'} style={{ margin: 0 }}>{v || '中'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      align: 'center' as const,
      render: (status: string) => <Tag color={statusColors[status]} style={{ margin: 0 }}>{status}</Tag>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 180,
      ellipsis: true,
    },
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '类型',
      dataIndex: 'aftersale_type',
      width: 70,
      render: (v: string) => v || '-',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 60,
      render: (v: string) => v || '-',
    },
    {
      title: '买家',
      dataIndex: 'buyer',
      width: 80,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 70,
      align: 'right' as const,
      render: (v: string) => v ? `¥${v}` : '-',
    },
    {
      title: '提醒时间',
      dataIndex: 'remind_at',
      width: 130,
      render: (v: string, record: any) => {
        if (!v) return <span style={{ color: '#999' }}>未设置</span>;
        if (isOverdue(v, record.status)) {
          return <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{formatDateTime(v)}</span>;
        }
        if (isToday(v)) {
          return <span style={{ color: '#fa8c16' }}>{formatDateTime(v)}</span>;
        }
        return formatDateTime(v);
      },
    },
    {
      title: '备注',
      dataIndex: 'note',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const markMenuItems = [
          ...(record.status !== '已完成' ? [{ key: 'done', label: '标记已完成' }] : []),
          ...(record.status === '已完成' ? [{ key: 'todo', label: '标记待处理' }] : []),
          { key: 'delete', label: <span style={{ color: '#ff4d4f' }}>删除</span> },
        ];

        return (
          <Space size={4}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditData(record); setFormOpen(true); }}>编辑</Button>
            {record.status !== '已完成' && (
              <Button size="small" icon={<ClockCircleOutlined />} onClick={() => { setSnoozeTodo(record); setSnoozeOpen(true); }}>稍后提醒</Button>
            )}
            <Dropdown
              menu={{
                items: markMenuItems,
                onClick: ({ key }) => {
                  if (key === 'done') handleStatusChange(record.id, '已完成');
                  else if (key === 'todo') handleStatusChange(record.id, '待处理');
                  else if (key === 'delete') handleDelete(record.id);
                },
              }}
            >
              <Button size="small">标记 <DownOutlined /></Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const getRowClassName = (record: any) => {
    if (record.status === '已完成') return 'row-completed';
    if (isOverdue(record.remind_at, record.status)) return 'row-overdue';
    if (record.id === highlightId) return 'row-highlight';
    return '';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Search
          placeholder="搜索标题/订单号/买家/备注"
          allowClear
          onSearch={setKeyword}
          style={{ width: 260 }}
        />
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 110 }}>
          <Select.Option value="全部">全部</Select.Option>
          <Select.Option value="待处理">待处理</Select.Option>
          <Select.Option value="已完成">已完成</Select.Option>
        </Select>
        <Select value={timeFilter} onChange={setTimeFilter} style={{ width: 130 }}>
          <Select.Option value="全部">全部</Select.Option>
          <Select.Option value="今天提醒">今天提醒</Select.Option>
          <Select.Option value="明天提醒">明天提醒</Select.Option>
          <Select.Option value="已超时">已超时</Select.Option>
          <Select.Option value="未设置提醒">未设置提醒</Select.Option>
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditData(null); setFormOpen(true); }}>
          新增待办
        </Button>
        <Button icon={<ImportOutlined />} onClick={() => navigate('/import')}>
          批量导入
        </Button>
        <Button icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
          设置
        </Button>
        <Badge count={pendingCount} offset={[-4, 4]}>
          <BellOutlined style={{ fontSize: 20, color: pendingCount > 0 ? '#fa8c16' : '#999' }} />
        </Badge>
      </div>

      <Table
        columns={columns}
        dataSource={todos}
        rowKey="id"
        loading={loading}
        rowClassName={getRowClassName}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
        size="small"
      />

      <TodoForm
        open={formOpen}
        editData={editData}
        onOk={editData ? handleUpdate : handleCreate}
        onCancel={() => { setFormOpen(false); setEditData(null); }}
      />

      <SnoozeModal
        open={snoozeOpen}
        todoTitle={snoozeTodo?.title || ''}
        defaultMinutes={defaultSnoozeMinutes}
        onOk={handleSnooze}
        onCancel={() => { setSnoozeOpen(false); setSnoozeTodo(null); }}
      />

      <style>{`
        .row-overdue { background-color: #fff1f0 !important; }
        .row-overdue:hover > td { background-color: #ffccc7 !important; }
        .row-completed { opacity: 0.55; }
        .row-highlight { background-color: #e6f7ff !important; animation: highlight-fade 5s ease; }
        .row-highlight:hover > td { background-color: #bae7ff !important; }
        @keyframes highlight-fade {
          from { background-color: #91d5ff !important; }
          to { background-color: #e6f7ff !important; }
        }
      `}</style>
    </div>
  );
};

export default TodoList;
