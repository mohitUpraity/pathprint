import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const toastStyles: Record<string, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--success-50)', color: 'var(--success-600)', border: 'var(--success-600)' },
  error: { bg: 'var(--error-50)', color: 'var(--error-600)', border: 'var(--error-600)' },
  info: { bg: 'var(--info-50)', color: 'var(--info-600)', border: 'var(--info-600)' },
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-dropdown animate-slide-in"
            style={{
              backgroundColor: style.bg,
              borderLeft: `3px solid ${style.border}`,
            }}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: style.color }} />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" style={{ color: style.color }} />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" style={{ color: style.color }} />}
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 p-1 rounded transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
