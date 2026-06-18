import dayjs from 'dayjs';

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}

export function isOverdue(remindAt: string | null, status: string): boolean {
  if (!remindAt || status === '已完成') return false;
  return dayjs(remindAt).isBefore(dayjs());
}

export function isToday(remindAt: string | null): boolean {
  if (!remindAt) return false;
  return dayjs(remindAt).isSame(dayjs(), 'day');
}

export function isTomorrow(remindAt: string | null): boolean {
  if (!remindAt) return false;
  return dayjs(remindAt).isSame(dayjs().add(1, 'day'), 'day');
}

export function getSnoozeTime(minutes: number): string {
  return dayjs().add(minutes, 'minute').format('YYYY-MM-DD HH:mm:ss');
}

export function getTomorrowSameTime(): string {
  return dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss');
}

export function nowStr(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}
