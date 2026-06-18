import { Todo, Database } from './database';

export class ReminderService {
  private db: Database;
  private interval: NodeJS.Timeout | null = null;
  private onRemind: (todo: Todo) => void;

  constructor(db: Database, onRemind: (todo: Todo) => void) {
    this.db = db;
    this.onRemind = onRemind;
  }

  start() {
    // 每 30 秒检查一次
    this.interval = setInterval(() => this.check(), 30 * 1000);
    // 启动时立即检查一次
    this.check();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private check() {
    try {
      const todos = this.db.getRemindableTodos();
      for (const todo of todos) {
        this.onRemind(todo);
        this.db.markReminded(todo.id!);
      }
    } catch (err) {
      console.error('Reminder check error:', err);
    }
  }

  getPendingReminders(): Todo[] {
    return this.db.getRemindableTodos();
  }

  snooze(id: number, minutes: number): void {
    const future = new Date(Date.now() + minutes * 60 * 1000);
    const remindAt = future.getFullYear() + '-' +
      String(future.getMonth() + 1).padStart(2, '0') + '-' +
      String(future.getDate()).padStart(2, '0') + ' ' +
      String(future.getHours()).padStart(2, '0') + ':' +
      String(future.getMinutes()).padStart(2, '0') + ':' +
      String(future.getSeconds()).padStart(2, '0');
    this.db.snoozeTodo(id, remindAt);
  }

  markReminded(id: number): void {
    this.db.markReminded(id);
  }

  getTodoById(id: number): Todo | null {
    return this.db.getTodoById(id);
  }
}
