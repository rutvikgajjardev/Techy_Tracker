import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  initialData?: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    } else {
      setName('');
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim() });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEdit ? 'Edit Category' : 'Add Personal Category'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Travel, Groceries, Fitness"
              aria-invalid={!!errorMsg}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                errorMsg
                  ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
              }`}
            />
            {errorMsg && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
