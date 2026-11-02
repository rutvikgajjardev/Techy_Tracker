import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  loadingLabel = 'Processing...',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              tone === 'danger'
                ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : tone === 'danger' ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isLoading ? 'Please wait...' : 'Please confirm this action'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        <div className="pt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isLoading ? loadingLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
