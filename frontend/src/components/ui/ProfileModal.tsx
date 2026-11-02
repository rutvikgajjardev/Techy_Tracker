import React, { useState } from 'react';
import {
  X,
  CreditCard,
  User as UserIcon,
  Mail,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();

  const [name, setName] = useState(currentUser?.name || '');
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    const trimmedUpi = upiId.trim();

    if (!trimmedName) {
      setErrorMsg('Name cannot be empty.');
      return;
    }

    if (trimmedUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(trimmedUpi)) {
      setErrorMsg('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: trimmedName,
        upi_id: trimmedUpi || null,
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                User Profile & UPI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your payment handle for group settlements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address (Read-only)</span>
            </label>
            <input
              type="email"
              value={currentUser.email}
              disabled
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* UPI ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                <span>UPI ID / VPA</span>
              </label>
              {currentUser.upi_id && (
                <button
                  type="button"
                  onClick={() => handleCopy(currentUser.upi_id!)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy UPI'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="username@okhdfcbank or 9876543210@paytm"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              When group members owe you money for expenses you paid, they can directly copy or scan this UPI handle.
            </p>
          </div>

          {/* Active UPI Badge */}
          {currentUser.upi_id && (
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Active Settlement Handle
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate block">
                  {currentUser.upi_id}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                Linked
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
