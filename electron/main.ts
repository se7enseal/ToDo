import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Database, Todo } from './database';
import { ReminderService } from './reminder';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: Database;
let reminderService: ReminderService;
let isQuitting = false;
let reminderWindows: Map<number, BrowserWindow> = new Map();

const RE_REMIND_MINUTES = 10;

// 提示音列表
const SOUND_LIST = [
  { id: 'chime', name: '清脆铃声' },
  { id: 'gentle', name: '温和提示' },
  { id: 'urgent', name: '紧急警报' },
  { id: 'dingdong', name: '叮咚门铃' },
  { id: 'notify', name: '通知提示' },
  { id: 'melody', name: '旋律' },
];

function getSoundsDir(): string {
  const devPath = path.join(process.cwd(), 'assets', 'sounds');
  if (fs.existsSync(devPath)) return devPath;
  return path.join(process.resourcesPath, 'assets', 'sounds');
}

function getSoundPath(soundId: string): string {
  return path.join(getSoundsDir(), `${soundId}.wav`);
}

function playSound(soundId: string): void {
  const soundPath = getSoundPath(soundId);
  if (!fs.existsSync(soundPath)) return;

  // 使用 Windows 系统命令播放 WAV
  try {
    const { exec } = require('child_process');
    // 使用 PowerShell 播放声音（异步，不阻塞）
    exec(`powershell -Command "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`, { windowsHide: true });
  } catch {
    // 回退：系统蜂鸣
    process.stdout.write('\x07');
  }
}

function getIconPath(): string {
  const devPath = path.join(process.cwd(), 'assets', 'icon.png');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath, 'assets', 'icon.png');
  if (fs.existsSync(prodPath)) return prodPath;
  return '';
}

function getTrayIconPath(): string {
  const devPath = path.join(process.cwd(), 'assets', 'tray-icon.png');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath, 'assets', 'tray-icon.png');
  if (fs.existsSync(prodPath)) return prodPath;
  return getIconPath();
}

function getReminderHtmlPath(): string {
  const devPath = path.join(process.cwd(), 'src', 'reminder.html');
  if (fs.existsSync(devPath)) return devPath;
  return path.join(__dirname, '../renderer/reminder.html');
}

function createWindow() {
  const iconPath = getIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '售后待办提醒助手',
  });

  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('minimize', () => {
    mainWindow?.hide();
  });
}

function showReminderPopup(todo: Todo) {
  const existing = reminderWindows.get(todo.id!);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }

  const iconPath = getIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  const reminderWin = new BrowserWindow({
    width: 420,
    height: 380,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    focusable: true,
    icon,
    title: '售后待办提醒',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  reminderWin.setMenuBarVisibility(false);

  const htmlPath = getReminderHtmlPath();
  reminderWin.loadFile(htmlPath);

  reminderWin.webContents.on('did-finish-load', () => {
    reminderWin.webContents.send('reminder-data', todo);
  });

  ipcMain.once(`reminder-action-${todo.id}`, (_, data) => {
    handleReminderAction(todo, data, reminderWin);
  });

  reminderWin.on('close', (e) => {
    e.preventDefault();
    handleReminderAction(todo, { action: 'close', todoId: todo.id! }, reminderWin);
  });

  reminderWindows.set(todo.id!, reminderWin);

  reminderWin.on('closed', () => {
    reminderWindows.delete(todo.id!);
  });

  // 播放选中的提示音
  const settings = db.getSettings();
  if (settings.sound_enabled) {
    playSound(settings.notification_sound || 'chime');
  }
}

function handleReminderAction(todo: Todo, data: { action: string; todoId: number; minutes?: number }, win: BrowserWindow) {
  ipcMain.removeAllListeners(`reminder-action-${todo.id}`);

  switch (data.action) {
    case 'complete':
      db.updateTodo(todo.id!, { status: '已完成' });
      closeReminderWindow(todo.id!);
      mainWindow?.webContents.send('todo-updated');
      break;

    case 'snooze':
      const minutes = data.minutes || 30;
      reminderService.snooze(todo.id!, minutes);
      closeReminderWindow(todo.id!);
      mainWindow?.webContents.send('todo-updated');
      break;

    case 'close':
      db.markReminded(todo.id!);
      reminderService.snooze(todo.id!, RE_REMIND_MINUTES);
      closeReminderWindow(todo.id!);
      mainWindow?.webContents.send('todo-updated');
      break;
  }
}

function closeReminderWindow(todoId: number) {
  const win = reminderWindows.get(todoId);
  if (win && !win.isDestroyed()) {
    win.removeAllListeners('close');
    win.close();
  }
  reminderWindows.delete(todoId);
}

function createTray() {
  const trayIconPath = getTrayIconPath();
  const icon = trayIconPath
    ? nativeImage.createFromPath(trayIconPath)
    : nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '新增待办',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('navigate', '/add');
      },
    },
    { type: 'separator' },
    {
      label: '退出软件',
      click: () => {
        isQuitting = true;
        app.exit(0);
      },
    },
  ]);
  tray.setToolTip('售后待办提醒助手');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function setupIPC() {
  ipcMain.handle('todo:list', (_, filters) => db.getTodos(filters));
  ipcMain.handle('todo:create', (_, todo) => db.createTodo(todo));
  ipcMain.handle('todo:update', (_, id, todo) => db.updateTodo(id, todo));
  ipcMain.handle('todo:delete', (_, id) => db.deleteTodo(id));
  ipcMain.handle('todo:batchCreate', (_, todos) => db.batchCreateTodos(todos));
  ipcMain.handle('todo:clearCompleted', () => db.clearCompleted());

  ipcMain.handle('settings:get', () => db.getSettings());
  ipcMain.handle('settings:update', (_, settings) => db.updateSettings(settings));
  ipcMain.handle('settings:getDbPath', () => db.getDbPath());
  ipcMain.handle('settings:exportBackup', () => db.exportBackup());

  ipcMain.handle('reminder:getPending', () => reminderService.getPendingReminders());
  ipcMain.handle('reminder:snooze', (_, id, minutes) => reminderService.snooze(id, minutes));
  ipcMain.handle('reminder:markReminded', (_, id) => reminderService.markReminded(id));

  // 获取提示音列表
  ipcMain.handle('sounds:list', () => SOUND_LIST);

  // 试听提示音
  ipcMain.handle('sounds:preview', (_, soundId: string) => {
    playSound(soundId);
    return true;
  });

  // 提醒弹窗内的操作
  ipcMain.on('reminder-action', (event, data) => {
    const todo = reminderService.getTodoById(data.todoId);
    if (!todo) return;
    ipcMain.emit(`reminder-action-${data.todoId}`, event, data);
  });
}

app.whenReady().then(async () => {
  db = new Database();
  await db.initialize();

  reminderService = new ReminderService(db, (todo) => {
    showReminderPopup(todo);
    mainWindow?.webContents.send('reminder:fired', todo);
  });

  createWindow();
  createTray();
  setupIPC();
  reminderService.start();
});

app.on('window-all-closed', () => {
  // 不退出，保持托盘运行
});

app.on('before-quit', () => {
  isQuitting = true;
  reminderService?.stop();
  db?.close();
});
