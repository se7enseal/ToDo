import React, { useState } from 'react';
import { Input, Button, Table, Tag, message, Space, Card, Typography } from 'antd';
import { parsePasteData, ParsedRow } from '../utils/parser';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Text } = Typography;

const priorityColors: Record<string, string> = {
  '高': 'red',
  '中': 'orange',
  '低': 'green',
};

const ImportPaste: React.FC = () => {
  const navigate = useNavigate();
  const [pasteText, setPasteText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    if (!pasteText.trim()) {
      message.warning('请先粘贴数据');
      return;
    }
    const rows = parsePasteData(pasteText);
    if (rows.length === 0) {
      message.warning('未解析到有效数据，请检查格式');
      return;
    }
    setParsedData(rows);
    message.success(`解析成功，共 ${rows.length} 条数据`);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      message.warning('请先解析数据');
      return;
    }
    setImporting(true);
    try {
      const count = await window.electronAPI.todoBatchCreate(parsedData);
      message.success(`成功导入 ${count} 条待办`);
      setPasteText('');
      setParsedData([]);
      navigate('/');
    } catch (err) {
      message.error('导入失败');
    }
    setImporting(false);
  };

  const handleClear = () => {
    setPasteText('');
    setParsedData([]);
  };

  const columns = [
    { title: '等级', dataIndex: 'priority', width: 60, render: (v: string) => <Tag color={priorityColors[v] || 'orange'}>{v || '中'}</Tag> },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '订单号', dataIndex: 'order_no', width: 130, render: (v: string) => v || '-' },
    { title: '类型', dataIndex: 'aftersale_type', width: 70, render: (v: string) => v || '-' },
    { title: '平台', dataIndex: 'platform', width: 60, render: (v: string) => v || '-' },
    { title: '买家', dataIndex: 'buyer', width: 80, render: (v: string) => v || '-' },
    { title: '金额', dataIndex: 'amount', width: 70, render: (v: string) => v ? `¥${v}` : '-' },
    { title: '提醒时间', dataIndex: 'remind_at', width: 130, render: (v: string | null) => v || '-' },
    { title: '备注', dataIndex: 'note', width: 120, ellipsis: true, render: (v: string) => v || '-' },
  ];

  return (
    <div>
      <Card title="批量粘贴导入" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            从 Excel 复制多行数据后粘贴到下方文本框。字段顺序：订单号、售后类型、平台、买家、金额、提醒时间、重要程度（高/中/低）、备注。
            支持制表符分隔和逗号分隔。空行自动跳过。重要程度不填默认为"中"。
          </Text>
        </div>
        <TextArea
          rows={10}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"粘贴示例：\nTB202606180001\t仅退款\t淘宝\t张三\t29.9\t2026-06-20 10:00\t高\t买家申请仅退款\nTB202606180002\t退货退款\t拼多多\t李四\t59.0\t\t中\t需要确认退货地址"}
          style={{ fontFamily: 'monospace', marginBottom: 12 }}
        />
        <Space>
          <Button type="primary" onClick={handleParse} disabled={!pasteText.trim()}>
            解析
          </Button>
          <Button onClick={handleClear}>
            清空
          </Button>
        </Space>
      </Card>

      {parsedData.length > 0 && (
        <Card
          title={`预览数据（共 ${parsedData.length} 条）`}
          extra={
            <Space>
              <Button type="primary" onClick={handleImport} loading={importing}>
                确认导入
              </Button>
              <Button onClick={() => setParsedData([])}>
                取消
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={parsedData}
            rowKey={(_, index) => String(index)}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20 }}
            size="small"
          />
        </Card>
      )}
    </div>
  );
};

export default ImportPaste;
