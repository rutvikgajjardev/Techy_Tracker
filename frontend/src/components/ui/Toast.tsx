import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 ${
        isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-100'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
      )}

      <div className="flex-1 text-xs font-medium leading-relaxed">
        {toast.message}
      </div>

      <button
        onClick={onDismiss}
        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
