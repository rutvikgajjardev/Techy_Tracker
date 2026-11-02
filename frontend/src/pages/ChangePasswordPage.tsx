import React, { useState } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { apiService } from '../services/api';

interface ChangePasswordPageProps {
  onBack: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  onBack,
  onSuccessToast,
}) => {
  // 2-Step Flow: Step 1 (Verify Current Password), Step 2 (Enter New Password)
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // State Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Step 1: Verify Current Password
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedCurrent = currentPassword.trim();
    if (!trimmedCurrent) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    setLoading(true);
    try {
      await apiService.verifyPassword(trimmedCurrent);
      // Success: advance to step 2
      setStep(2);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Current password is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set and Confirm New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setErrorMsg('Please enter your new password.');
      return;
    }

    if (trimmedNew.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (trimmedNew === currentPassword.trim()) {
      setErrorMsg('New password cannot be the same as your current password.');
      return;
    }

    if (!trimmedConfirm) {
      setErrorMsg('Please confirm your new password.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const msg = await apiService.changePassword(
        currentPassword.trim(),
        trimmedNew,
        trimmedConfirm
      );
      setSuccessMsg(msg || 'Your password has been changed successfully.');
      setIsCompleted(true);
      if (onSuccessToast) {
        onSuccessToast('Password changed successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header with Arrow-only Back Button in front of the heading */}
      <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          title="Back to Previous Page"
          aria-label="Back to Previous Page"
          className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Change Password
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Security
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify your current credentials and configure a new password
          </p>
        </div>
      </div>

      {/* Main Centered Form Card - Designed identically to Login & Auth views */}
      <div className="w-full max-w-md mx-auto my-4 sm:my-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 sm:p-8 transition-colors">
          {/* Card Title & Icon */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isCompleted ? 'Password Updated!' : 'Account Password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {isCompleted
                ? 'Your password has been changed and securely saved.'
                : 'Complete the two-step verification to update your account password.'}
            </p>
          </div>

          {/* Stepper Progress Bar (Step 1 -> Step 2) */}
          {!isCompleted && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/90 rounded-xl mb-6 text-xs font-semibold">
              <div
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-colors ${
                  step === 1
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}
              >
                {step === 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                )}
                <span>1. Verify Current</span>
              </div>

              <div
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-colors ${
                  step === 2
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 2
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  2
                </span>
                <span>2. New Password</span>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: COMPLETED STATE */}
          {isCompleted ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-center">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Account Protection Active
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You can now use your new password for your next login sessions.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>Okay</span>
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* STEP 1 FORM: VERIFY CURRENT PASSWORD */
            <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => {
                      setCurrentPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter your current password"
                    autoFocus
                    autoComplete="current-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Enter your current account password to confirm identity.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !currentPassword.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Verify Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2 FORM: ENTER NEW PASSWORD & CONFIRM PASSWORD */
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Verified Identity Badge */}
              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Current password verified</span>
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="At least 6 characters"
                    autoFocus
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  {confirmPassword && (
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        newPassword === confirmPassword
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      {newPassword === confirmPassword ? (
                        <>
                          <Check className="w-3 h-3" /> Passwords match
                        </>
                      ) : (
                        'Passwords do not match'
                      )}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

