declare global {
  interface Window {
    electronAPI: {
      todoList: (filters: any) => Promise<any[]>;
      todoCreate: (todo: any) => Promise<any>;
      todoUpdate: (id: number, todo: any) => Promise<any>;
      todoDelete: (id: number) => Promise<boolean>;
      todoBatchCreate: (todos: any[]) => Promise<number>;
      todoClearCompleted: () => Promise<number>;
      settingsGet: () => Promise<any>;
      settingsUpdate: (settings: any) => Promise<void>;
      settingsGetDbPath: () => Promise<string>;
      settingsExportBackup: () => Promise<string>;
      reminderGetPending: () => Promise<any[]>;
      reminderSnooze: (id: number, minutes: number) => Promise<void>;
      reminderMarkReminded: (id: number) => Promise<void>;
      soundsList: () => Promise<{ id: string; name: string }[]>;
      soundsPreview: (soundId: string) => Promise<boolean>;
      onReminderFired: (callback: (todo: any) => void) => void;
      onFocusTodo: (callback: (id: number) => void) => void;
      onNavigate: (callback: (path: string) => void) => void;
      onTodoUpdated: (callback: () => void) => void;
    };
  }
}

export {};
