import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 待办 CRUD
  todoList: (filters: any) => ipcRenderer.invoke('todo:list', filters),
  todoCreate: (todo: any) => ipcRenderer.invoke('todo:create', todo),
  todoUpdate: (id: number, todo: any) => ipcRenderer.invoke('todo:update', id, todo),
  todoDelete: (id: number) => ipcRenderer.invoke('todo:delete', id),
  todoBatchCreate: (todos: any[]) => ipcRenderer.invoke('todo:batchCreate', todos),
  todoClearCompleted: () => ipcRenderer.invoke('todo:clearCompleted'),

  // 设置
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsUpdate: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  settingsGetDbPath: () => ipcRenderer.invoke('settings:getDbPath'),
  settingsExportBackup: () => ipcRenderer.invoke('settings:exportBackup'),

  // 提醒
  reminderGetPending: () => ipcRenderer.invoke('reminder:getPending'),
  reminderSnooze: (id: number, minutes: number) => ipcRenderer.invoke('reminder:snooze', id, minutes),
  reminderMarkReminded: (id: number) => ipcRenderer.invoke('reminder:markReminded', id),

  // 提示音
  soundsList: () => ipcRenderer.invoke('sounds:list'),
  soundsPreview: (soundId: string) => ipcRenderer.invoke('sounds:preview', soundId),

  // 事件监听
  onReminderFired: (callback: (todo: any) => void) => {
    ipcRenderer.on('reminder:fired', (_, todo) => callback(todo));
  },
  onFocusTodo: (callback: (id: number) => void) => {
    ipcRenderer.on('focus-todo', (_, id) => callback(id));
  },
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_, path) => callback(path));
  },
  onTodoUpdated: (callback: () => void) => {
    ipcRenderer.on('todo-updated', () => callback());
  },
});
