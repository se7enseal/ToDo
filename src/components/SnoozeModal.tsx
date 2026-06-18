import React from 'react';
import { Modal, Button, Space, DatePicker } from 'antd';
import dayjs from 'dayjs';

interface SnoozeModalProps {
  open: boolean;
  todoTitle: string;
  defaultMinutes: number;
  onOk: (remindAt: string) => void;
  onCancel: () => void;
}

const SnoozeModal: React.FC<SnoozeModalProps> = ({ open, todoTitle, defaultMinutes, onOk, onCancel }) => {
  const [customDate, setCustomDate] = React.useState<dayjs.Dayjs | null>(null);
  const [customMode, setCustomMode] = React.useState(false);

  const handleSnooze = (minutes: number) => {
    const remindAt = dayjs().add(minutes, 'minute').format('YYYY-MM-DD HH:mm:ss');
    onOk(remindAt);
    setCustomMode(false);
    setCustomDate(null);
  };

  const handleCustomOk = () => {
    if (customDate) {
      onOk(customDate.format('YYYY-MM-DD HH:mm:ss'));
      setCustomMode(false);
      setCustomDate(null);
    }
  };

  const handleCancel = () => {
    setCustomMode(false);
    setCustomDate(null);
    onCancel();
  };

  const presets = [
    { label: '10 分钟后', minutes: 10 },
    { label: '30 分钟后', minutes: 30 },
    { label: '1 小时后', minutes: 60 },
    { label: '明天同一时间', minutes: 24 * 60 },
  ];

  return (
    <Modal
      title="稍后提醒"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={400}
    >
      <div style={{ marginBottom: 16 }}>
        <strong>{todoTitle}</strong>
      </div>
      {!customMode ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          {presets.map(p => (
            <Button key={p.minutes} block onClick={() => handleSnooze(p.minutes)}>
              {p.label}
            </Button>
          ))}
          <Button block type="dashed" onClick={() => setCustomMode(true)}>
            自定义时间
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            value={customDate}
            onChange={(d) => setCustomDate(d)}
            style={{ width: '100%' }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
          <Space>
            <Button onClick={() => setCustomMode(false)}>返回</Button>
            <Button type="primary" onClick={handleCustomOk} disabled={!customDate}>
              确定
            </Button>
          </Space>
        </Space>
      )}
    </Modal>
  );
};

export default SnoozeModal;
