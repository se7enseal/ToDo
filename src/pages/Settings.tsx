import React, { useState, useEffect } from 'react';
import { Card, Switch, InputNumber, Select, Button, message, Space, Typography, Divider } from 'antd';
import { SoundOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    notification_enabled: true,
    sound_enabled: true,
    default_snooze_minutes: 30,
    notification_sound: 'chime',
  });
  const [dbPath, setDbPath] = useState('');
  const [soundList, setSoundList] = useState<{ id: string; name: string }[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadSounds();
  }, []);

  const loadSettings = async () => {
    const s = await window.electronAPI.settingsGet();
    setSettings({
      notification_enabled: !!s.notification_enabled,
      sound_enabled: !!s.sound_enabled,
      default_snooze_minutes: s.default_snooze_minutes,
      notification_sound: s.notification_sound || 'chime',
    });
    const path = await window.electronAPI.settingsGetDbPath();
    setDbPath(path);
  };

  const loadSounds = async () => {
    const list = await window.electronAPI.soundsList();
    setSoundList(list);
  };

  const handleSave = async () => {
    await window.electronAPI.settingsUpdate({
      notification_enabled: settings.notification_enabled ? 1 : 0,
      sound_enabled: settings.sound_enabled ? 1 : 0,
      default_snooze_minutes: settings.default_snooze_minutes,
      notification_sound: settings.notification_sound,
    });
    message.success('设置已保存');
  };

  const handlePreview = async (soundId: string) => {
    setPreviewing(soundId);
    try {
      await window.electronAPI.soundsPreview(soundId);
    } catch {
      message.error('播放失败');
    }
    // 声音播放需要一点时间，延迟重置状态
    setTimeout(() => setPreviewing(null), 1500);
  };

  const handleExport = async () => {
    try {
      const path = await window.electronAPI.settingsExportBackup();
      message.success(`备份已导出到：${path}`);
    } catch {
      message.error('导出备份失败');
    }
  };

  const handleClearCompleted = async () => {
    const count = await window.electronAPI.todoClearCompleted();
    message.success(`已清除 ${count} 条已完成待办`);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Card title="提醒设置" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Text strong>系统通知</Text>
            <br />
            <Text type="secondary">到时间后弹出提醒弹窗</Text>
          </div>
          <Switch
            checked={settings.notification_enabled}
            onChange={(v) => setSettings({ ...settings, notification_enabled: v })}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Text strong>提醒声音</Text>
            <br />
            <Text type="secondary">到时间后播放提示音</Text>
          </div>
          <Switch
            checked={settings.sound_enabled}
            onChange={(v) => setSettings({ ...settings, sound_enabled: v })}
          />
        </div>

        {settings.sound_enabled && (
          <div style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>提示音选择</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Select
                value={settings.notification_sound}
                onChange={(v) => setSettings({ ...settings, notification_sound: v })}
                style={{ flex: 1 }}
              >
                {soundList.map(s => (
                  <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                ))}
              </Select>
              <Button
                icon={<SoundOutlined />}
                onClick={() => handlePreview(settings.notification_sound)}
                loading={previewing === settings.notification_sound}
              >
                试听
              </Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {soundList.map(s => (
                <Button
                  key={s.id}
                  size="small"
                  type={settings.notification_sound === s.id ? 'primary' : 'default'}
                  icon={<SoundOutlined />}
                  onClick={() => {
                    setSettings({ ...settings, notification_sound: s.id });
                    handlePreview(s.id);
                  }}
                  loading={previewing === s.id}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>默认稍后提醒时间</Text>
            <br />
            <Text type="secondary">点击稍后提醒时的默认时间间隔</Text>
          </div>
          <InputNumber
            min={1}
            max={1440}
            value={settings.default_snooze_minutes}
            onChange={(v) => setSettings({ ...settings, default_snooze_minutes: v || 30 })}
            addonAfter="分钟"
            style={{ width: 150 }}
          />
        </div>
        <Divider />
        <Button type="primary" onClick={handleSave}>保存设置</Button>
      </Card>

      <Card title="数据管理" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>数据保存路径</Text>
          <Paragraph copyable style={{ marginBottom: 0, marginTop: 4 }}>
            {dbPath}
          </Paragraph>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={handleExport}>导出数据备份</Button>
          <Button danger onClick={handleClearCompleted}>清空已完成待办</Button>
        </Space>
      </Card>
    </div>
  );
};

export default Settings;
