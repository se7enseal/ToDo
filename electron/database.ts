import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface Todo {
  id?: number;
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
  reminded: number;
  last_reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  notification_enabled: number;
  sound_enabled: number;
  default_snooze_minutes: number;
  notification_sound: string;
}

export class Database {
  private db!: SqlJsDatabase;
  private dbPath!: string;

  async initialize() {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'aftersale-todo.db');

    const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    const SQL = await initSqlJs({
      locateFile: (file: string) => fs.existsSync(wasmPath) ? wasmPath : path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.migrateAddPriority();
    this.insertDefaultSettings();
    this.save();
  }

  private save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        order_no TEXT DEFAULT '',
        aftersale_type TEXT DEFAULT '',
        platform TEXT DEFAULT '',
        buyer TEXT DEFAULT '',
        amount TEXT DEFAULT '',
        remind_at TEXT,
        status TEXT NOT NULL DEFAULT '待处理',
        priority TEXT NOT NULL DEFAULT '中',
        note TEXT DEFAULT '',
        reminded INTEGER DEFAULT 0,
        last_reminded_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  // 迁移：为旧数据库添加 priority 字段
  private migrateAddPriority() {
    try {
      const cols = this.queryAll("PRAGMA table_info(todos)") as { name: string }[];
      const hasPriority = cols.some(c => c.name === 'priority');
      if (!hasPriority) {
        this.db.run("ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT '中'");
        this.save();
      }
    } catch {
      // 忽略迁移错误
    }
  }

  private insertDefaultSettings() {
    const defaults: Record<string, string> = {
      notification_enabled: '1',
      sound_enabled: '1',
      default_snooze_minutes: '30',
      notification_sound: 'chime',
    };

    for (const [key, value] of Object.entries(defaults)) {
      this.db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
    this.save();
  }

  private queryAll(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  private queryOne(sql: string, params: any[] = []): any | null {
    const rows = this.queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  getTodos(filters: {
    keyword?: string;
    status?: string;
    timeFilter?: string;
  }): Todo[] {
    let sql = 'SELECT * FROM todos WHERE 1=1';
    const params: any[] = [];

    if (filters.keyword) {
      sql += ' AND (title LIKE ? OR order_no LIKE ? OR buyer LIKE ? OR note LIKE ?)';
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    if (filters.status && filters.status !== '全部') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.timeFilter) {
      const now = dayjsStr();
      switch (filters.timeFilter) {
        case '今天提醒':
          sql += " AND remind_at IS NOT NULL AND date(remind_at) = date(?)";
          params.push(now);
          break;
        case '明天提醒':
          sql += " AND remind_at IS NOT NULL AND date(remind_at) = date(?, '+1 day')";
          params.push(now);
          break;
        case '已超时':
          sql += " AND remind_at IS NOT NULL AND remind_at < ? AND status != '已完成'";
          params.push(now);
          break;
        case '未设置提醒':
          sql += ' AND remind_at IS NULL';
          break;
      }
    }

    // 按重要程度排序（高>中>低），再按状态，再按时间
    sql += " ORDER BY CASE status WHEN '已完成' THEN 99 ELSE 0 END, CASE priority WHEN '高' THEN 1 WHEN '中' THEN 2 WHEN '低' THEN 3 ELSE 2 END, CASE WHEN remind_at IS NULL THEN 1 ELSE 0 END, remind_at ASC, created_at DESC";

    return this.queryAll(sql, params) as Todo[];
  }

  createTodo(todo: Omit<Todo, 'id' | 'reminded' | 'last_reminded_at' | 'created_at' | 'updated_at'>): Todo {
    this.db.run(
      `INSERT INTO todos (title, order_no, aftersale_type, platform, buyer, amount, remind_at, status, priority, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [todo.title, todo.order_no || '', todo.aftersale_type || '', todo.platform || '',
       todo.buyer || '', todo.amount || '', todo.remind_at || null, todo.status || '待处理',
       todo.priority || '中', todo.note || '']
    );
    const row = this.queryOne('SELECT last_insert_rowid() as id');
    const result = this.queryOne('SELECT * FROM todos WHERE id = ?', [row.id]) as Todo;
    this.save();
    return result;
  }

  updateTodo(id: number, todo: Partial<Todo>): Todo | null {
    const existing = this.queryOne('SELECT * FROM todos WHERE id = ?', [id]) as Todo | undefined;
    if (!existing) return null;

    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = ['title', 'order_no', 'aftersale_type', 'platform', 'buyer', 'amount', 'remind_at', 'status', 'priority', 'note'];
    for (const field of allowedFields) {
      if (field in todo) {
        fields.push(`${field} = ?`);
        params.push((todo as any)[field]);
      }
    }

    if ('remind_at' in todo && todo.remind_at !== existing.remind_at) {
      fields.push('reminded = 0', 'last_reminded_at = NULL');
    }

    fields.push("updated_at = datetime('now', 'localtime')");
    params.push(id);

    this.db.run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, params);
    const result = this.queryOne('SELECT * FROM todos WHERE id = ?', [id]) as Todo;
    this.save();
    return result;
  }

  deleteTodo(id: number): boolean {
    this.db.run('DELETE FROM todos WHERE id = ?', [id]);
    this.save();
    return true;
  }

  batchCreateTodos(todos: Omit<Todo, 'id' | 'reminded' | 'last_reminded_at' | 'created_at' | 'updated_at'>[]): number {
    let count = 0;
    for (const todo of todos) {
      this.db.run(
        `INSERT INTO todos (title, order_no, aftersale_type, platform, buyer, amount, remind_at, status, priority, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [todo.title, todo.order_no || '', todo.aftersale_type || '', todo.platform || '',
         todo.buyer || '', todo.amount || '', todo.remind_at || null, todo.status || '待处理',
         todo.priority || '中', todo.note || '']
      );
      count++;
    }
    this.save();
    return count;
  }

  clearCompleted(): number {
    const before = this.queryOne("SELECT COUNT(*) as cnt FROM todos WHERE status = '已完成'");
    this.db.run("DELETE FROM todos WHERE status = '已完成'");
    this.save();
    return before?.cnt || 0;
  }

  getSettings(): Settings {
    const rows = this.queryAll('SELECT key, value FROM settings') as { key: string; value: string }[];
    const settings: any = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return {
      notification_enabled: parseInt(settings.notification_enabled || '1'),
      sound_enabled: parseInt(settings.sound_enabled || '1'),
      default_snooze_minutes: parseInt(settings.default_snooze_minutes || '30'),
      notification_sound: settings.notification_sound || 'chime',
    };
  }

  updateSettings(settings: Partial<Settings>): void {
    for (const [key, value] of Object.entries(settings)) {
      this.db.run('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
    }
    this.save();
  }

  getDbPath(): string {
    return this.dbPath;
  }

  exportBackup(): string {
    const backupPath = path.join(app.getPath('desktop'), `aftersale-todo-backup-${new Date().toISOString().slice(0, 10)}.db`);
    const data = this.db.export();
    fs.writeFileSync(backupPath, Buffer.from(data));
    return backupPath;
  }

  getRemindableTodos(): Todo[] {
    const now = new Date();
    const localStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
    return this.queryAll(
      `SELECT * FROM todos
       WHERE status != '已完成'
         AND remind_at IS NOT NULL
         AND remind_at <= ?
         AND reminded = 0`,
      [localStr]
    ) as Todo[];
  }

  markReminded(id: number): void {
    this.db.run(
      `UPDATE todos SET reminded = 1, last_reminded_at = datetime('now', 'localtime') WHERE id = ?`,
      [id]
    );
    this.save();
  }

  snoozeTodo(id: number, remindAt: string): void {
    this.db.run(
      `UPDATE todos SET remind_at = ?, reminded = 0, last_reminded_at = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [remindAt, id]
    );
    this.save();
  }

  getTodoById(id: number): Todo | null {
    return this.queryOne('SELECT * FROM todos WHERE id = ?', [id]) as Todo | null;
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

function dayjsStr(): string {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}
