import dayjs from 'dayjs';

export interface ParsedRow {
  order_no: string;
  aftersale_type: string;
  platform: string;
  buyer: string;
  amount: string;
  remind_at: string | null;
  priority: string;
  note: string;
  title: string;
  status: string;
}

// 字段顺序：订单号、售后类型、平台、买家、金额、提醒时间、重要程度、备注
export function parsePasteData(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const results: ParsedRow[] = [];

  for (const line of lines) {
    const parts = splitLine(line);
    if (parts.length === 0 || parts.every(p => p.trim() === '')) continue;

    const order_no = (parts[0] || '').trim();
    const aftersale_type = (parts[1] || '').trim();
    const platform = (parts[2] || '').trim();
    const buyer = (parts[3] || '').trim();
    const amount = parseAmount(parts[4] || '');
    const remind_at = parseDateTime(parts[5] || '');
    const priority = parsePriority(parts[6] || '');
    const note = (parts[7] || '').trim();

    let title: string;
    if (order_no) {
      title = `售后待办 - ${order_no}`;
    } else if (buyer) {
      title = `售后待办 - ${buyer}`;
    } else {
      title = `售后待办 - ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
    }

    results.push({
      order_no,
      aftersale_type,
      platform,
      buyer,
      amount,
      remind_at,
      priority,
      note,
      title,
      status: '待处理',
    });
  }

  return results;
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  return line.split(',');
}

function parseAmount(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  const num = parseFloat(trimmed.replace(/[¥￥$]/g, ''));
  return isNaN(num) ? '' : String(num);
}

function parsePriority(val: string): string {
  const trimmed = val.trim();
  if (trimmed === '高' || trimmed === '中' || trimmed === '低') return trimmed;
  return '中';
}

function parseDateTime(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;

  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY/MM/DD HH:mm',
    'YYYY-MM-DD',
    'YYYY/MM/DD',
  ];

  for (const fmt of formats) {
    const d = dayjs(trimmed, fmt, true);
    if (d.isValid()) {
      return d.format('YYYY-MM-DD HH:mm:ss');
    }
  }

  const d = dayjs(trimmed);
  if (d.isValid() && d.year() > 2000) {
    return d.format('YYYY-MM-DD HH:mm:ss');
  }

  return null;
}
