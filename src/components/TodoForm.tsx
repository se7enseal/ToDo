import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

export interface TodoFormData {
  title: string;
  order_no: string;
  aftersale_type: string;
  platform: string;
  buyer: string;
  amount: string;
  remind_at: string | null;
  status: string;
  priority: string;
  note: string;
}

interface TodoFormProps {
  open: boolean;
  editData?: any | null;
  onOk: (data: TodoFormData) => void;
  onCancel: () => void;
}

const aftersaleTypes = ['仅退款', '退货退款', '换货', '维修', '补发', '其他'];
const platforms = ['淘宝', '天猫', '拼多多', '京东', '抖音', '快手', '其他'];
const priorities = [
  { value: '高', label: '高', color: '#ff4d4f' },
  { value: '中', label: '中', color: '#fa8c16' },
  { value: '低', label: '低', color: '#52c41a' },
];

const TodoForm: React.FC<TodoFormProps> = ({ open, editData, onOk, onCancel }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          ...editData,
          remind_at: editData.remind_at ? dayjs(editData.remind_at) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: '待处理', priority: '中' });
      }
    }
  }, [open, editData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const data: TodoFormData = {
        ...values,
        remind_at: values.remind_at ? values.remind_at.format('YYYY-MM-DD HH:mm:ss') : null,
        amount: values.amount || '',
        priority: values.priority || '中',
        status: values.status || '待处理',
      };
      onOk(data);
    } catch {
      // 验证失败
    }
  };

  return (
    <Modal
      title={editData ? '编辑待办' : '新增待办'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 16px', alignItems: 'start' }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]} style={{ marginBottom: 16 }}>
            <Input placeholder="请输入待办标题" />
          </Form.Item>
          <Form.Item name="priority" label="重要程度" style={{ marginBottom: 16 }}>
            <Select style={{ width: 100 }}>
              {priorities.map(p => (
                <Select.Option key={p.value} value={p.value}>
                  <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="order_no" label="订单号">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="aftersale_type" label="售后类型">
            <Select placeholder="选填" allowClear>
              {aftersaleTypes.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="platform" label="平台">
            <Select placeholder="选填" allowClear>
              {platforms.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="buyer" label="买家">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="amount" label="金额">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="remind_at" label="提醒时间">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="选填"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        {editData && (
          <Form.Item name="status" label="状态">
            <Select style={{ width: 120 }}>
              <Select.Option value="待处理">待处理</Select.Option>
              <Select.Option value="已完成">已完成</Select.Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TodoForm;
