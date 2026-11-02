import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TechyTrackerLogo } from '../components/ui/TechyTrackerLogo';
import { apiService } from '../services/api';

interface FieldErrors {
  name?: string;
  email?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
  upiId?: string;
}

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  // 2-Step Forgot Password Flow: Step 1 (Send OTP to Email) -> Step 2 (Verify OTP & Set New Password)
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend OTP cooldown timer countdown (60s -> 0s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (mode === 'register' && !name.trim()) {
      errors.name = 'Please enter your full name.';
    }

    if (!trimmedEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    if (mode !== 'forgot') {
      if (!password) {
        errors.password = 'Please enter your password.';
      } else if (password.length < 6 && mode === 'register') {
        errors.password = 'Password must be at least 6 characters long.';
      }
    }

    if (mode === 'register' && upiId.trim()) {
      const trimmedUpi = upiId.trim();
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(trimmedUpi)) {
        errors.upiId = 'Please enter a valid UPI ID (e.g. name@bank or mobile@upi).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Send 6-Digit Verification OTP to Gmail
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldErrors({ email: 'Please enter your registered email address.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldErrors({ email: 'Please enter a valid email address (e.g. name@example.com).' });
      return;
    }

    setLoading(true);
    try {
      const msg = await apiService.sendForgotPasswordOtp(trimmedEmail);
      setSuccessMsg(msg || `Verification code sent to ${trimmedEmail}.`);
      setForgotStep(2);
      setResendCooldown(60); // 60s cooldown to prevent email spamming
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const errors: FieldErrors = {};
    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      errors.otp = 'Please enter the 6-digit verification code.';
    } else if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      errors.otp = 'Verification code must be exactly 6 digits.';
    }

    if (!password) {
      errors.password = 'Please enter your new password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'New password and confirm password do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const msg = await apiService.resetPasswordWithOtp(
        email.trim(),
        trimmedOtp,
        password,
        confirmPassword
      );
      setSuccessMsg(msg || 'Password reset successfully! You can now log in.');
      setMode('login');
      setForgotStep(1);
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      if (forgotStep === 1) {
        await handleSendOtp(e);
      } else {
        await handleResetPasswordWithOtp(e);
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'register') {
        await register(name.trim(), email.trim(), password, upiId.trim() || undefined);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Keep all fields completely blank on initial mount and when switching between Login / Register / Forgot
  useEffect(() => {
    setName('');
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setUpiId('');
    setFieldErrors({});
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForgotStep(1);

    // Wipe any aggressive browser-injected autofill that runs asynchronously after mount
    const timer = setTimeout(() => {
      setName('');
      setEmail('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setUpiId('');
    }, 60);

    return () => clearTimeout(timer);
  }, [mode]);

  const switchMode = (nextMode: 'login' | 'register' | 'forgot') => {
    setMode(nextMode);
    setName('');
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setUpiId('');
    setFieldErrors({});
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForgotStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <TechyTrackerLogo className="w-9 h-9" />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Techy Tracker
          </span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {mode === 'login'
                ? 'Welcome Back'
                : mode === 'register'
                ? 'Create an Account'
                : 'Reset Password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {mode === 'login'
                ? 'Sign in to access your Techy Tracker personal & shared ledger'
                : mode === 'register'
                ? 'Register a new account to track and split expenses in ₹'
                : forgotStep === 1
                ? 'Enter your registered email address to receive a 6-digit verification code'
                : 'Enter the 6-digit verification code sent to your email and set a new password'}
            </p>
          </div>

          {/* Mode Switcher Tabs for Login/Register */}
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          ) : (
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                  Password Recovery
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Step {forgotStep} of 2
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 
            =====================================================================
            CASE A: 2-STEP FORGOT PASSWORD FLOW
            =====================================================================
          */}
          {mode === 'forgot' ? (
            <form key={`forgot_step_${forgotStep}`} noValidate onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Decoy hidden inputs to prevent browser autofill */}
              <input type="text" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

              {/* STEP 1: Enter Email & Request Verification OTP */}
              {forgotStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Registered Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        name="techy_forgot_email"
                        autoComplete="off"
                        data-lpignore="true"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        placeholder="name@example.com"
                        aria-invalid={!!fieldErrors.email}
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                          fieldErrors.email
                            ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                        }`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                      We will send a 6-digit verification code to this email via Gmail SMTP.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Verification OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}

              {/* STEP 2: Verify OTP & Configure New Password */}
              {forgotStep === 2 && (
                <>
                  {/* Verified Email Summary Badge with Change Option */}
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">OTP Sent To</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">{email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer shrink-0"
                    >
                      Change Email
                    </button>
                  </div>

                  {/* 6-Digit Verification OTP */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        6-Digit Verification Code *
                      </label>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || loading}
                        onClick={() => handleSendOtp()}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        name="techy_otp_code"
                        autoComplete="one-time-code"
                        data-lpignore="true"
                        value={otp}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setOtp(val);
                          if (fieldErrors.otp) setFieldErrors(prev => ({ ...prev, otp: undefined }));
                        }}
                        placeholder="123456"
                        autoFocus
                        className={`w-full pl-10 pr-3.5 py-2.5 text-base font-mono tracking-widest rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                          fieldErrors.otp
                            ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                        }`}
                      />
                    </div>
                    {fieldErrors.otp && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.otp}</span>
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="techy_forgot_new_password"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        placeholder="At least 6 characters"
                        aria-invalid={!!fieldErrors.password}
                        className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                          fieldErrors.password
                            ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.password}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="techy_forgot_confirm_password"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={confirmPassword}
                        onChange={e => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                        }}
                        placeholder="Re-enter new password"
                        aria-invalid={!!fieldErrors.confirmPassword}
                        className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                          fieldErrors.confirmPassword
                            ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.confirmPassword}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          ) : (
            /* 
              =====================================================================
              CASE B: LOGIN / REGISTER FORMS
              =====================================================================
            */
            <form key={mode} noValidate onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Decoy hidden inputs to intercept aggressive browser credential autofill */}
              <input
                type="text"
                name="fake_username_autofill"
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
              />
              <input
                type="password"
                name="fake_password_autofill"
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="new-password"
              />

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name={`techy_${mode}_fullname`}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Enter your full name"
                    aria-invalid={!!fieldErrors.name}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      fieldErrors.name
                        ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name={`techy_${mode}_email`}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  aria-invalid={!!fieldErrors.email}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.email
                      ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name={`techy_${mode}_password`}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    aria-invalid={!!fieldErrors.password}
                    className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      fieldErrors.password
                        ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      UPI ID <span className="text-slate-400 font-normal">(Optional, for settlements)</span>
                    </label>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      e.g. name@okhdfcbank
                    </span>
                  </div>
                  <input
                    type="text"
                    name="techy_reg_upi"
                    autoComplete="off"
                    data-lpignore="true"
                    value={upiId}
                    onChange={e => {
                      setUpiId(e.target.value);
                      if (fieldErrors.upiId) setFieldErrors(prev => ({ ...prev, upiId: undefined }));
                    }}
                    placeholder="yourname@upi / mobile@bank"
                    aria-invalid={!!fieldErrors.upiId}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      fieldErrors.upiId
                        ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.upiId ? (
                    <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.upiId}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Group members will use this UPI ID to settle shared expense balances with you directly.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>
                  {loading
                    ? mode === 'login'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'login'
                    ? 'Login to Techy Tracker'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        Techy Tracker · Personal & Shared Expense Management
      </div>
    </div>
  );
};
