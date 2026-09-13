'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  title?: string;
  message?: string;
  kind?: 'success' | 'error' | 'info';
};

type NotificationContextValue = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function uid() {
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'> & { id?: string }) => {
      const id = toast.id || uid();
      const next: Toast = { id, kind: 'info', ...toast };
      setToasts((prev) => [...prev, next]);
      // auto-remove
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-gray-800 bg-gray-900/95 px-3 py-2 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {t.title && <div className="text-xs font-bold text-gray-200">{t.title}</div>}
                {t.message && <div className="text-[11px] text-gray-400 mt-0.5">{t.message}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-500 hover:text-gray-200 text-xs"
                aria-label="Dismiss toast"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
