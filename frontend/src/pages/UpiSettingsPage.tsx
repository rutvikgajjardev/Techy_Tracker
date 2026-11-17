import React, { useState } from 'react';
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TechyTrackerLogo } from '../components/ui/TechyTrackerLogo';

interface UpiSettingsPageProps {
  onBack: () => void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const COMMON_UPI_HANDLES = ['@okhdfcbank', '@okicici', '@oksbi', '@paytm', '@ybl', '@upi'];

export const UpiSettingsPage: React.FC<UpiSettingsPageProps> = ({
  onBack,
  onNotify,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(!currentUser?.upi_id);
  const [upiInput, setUpiInput] = useState(currentUser?.upi_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentUpiId = currentUser?.upi_id || '';
  const currentUserName = currentUser?.name || 'User';

  // Standard UPI URI format: upi://pay?pa=<UPI_ID>&pn=<NAME>&cu=INR
  const upiPayUri = currentUpiId
    ? `upi://pay?pa=${encodeURIComponent(currentUpiId)}&pn=${encodeURIComponent(currentUserName)}&cu=INR`
    : '';

  // QR Code URL with High Error Correction (ecc=H) to allow clean center logo placement while preserving 100% scan reliability
  const qrCodeUrl = upiPayUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&ecc=H&data=${encodeURIComponent(
        upiPayUri
      )}`
    : '';

  const handleCopyUpi = () => {
    if (!currentUpiId) return;
    navigator.clipboard.writeText(currentUpiId);
    setCopiedUpi(true);
    if (onNotify) {
      onNotify('success', 'UPI ID copied to clipboard!');
    }
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleApplyPresetHandle = (handle: string) => {
    const raw = upiInput.trim();
    if (raw.includes('@')) {
      const username = raw.split('@')[0];
      setUpiInput(username + handle);
    } else if (raw) {
      setUpiInput(raw + handle);
    } else {
      setUpiInput(handle);
    }
  };

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleaned = upiInput.trim().toLowerCase();

    // Basic format check if non-empty
    if (cleaned && !cleaned.includes('@')) {
      setErrorMsg('Please enter a valid UPI ID format (e.g., username@bank)');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({ upi_id: cleaned || null });
      if (onNotify) {
        onNotify(
          'success',
          cleaned ? `UPI ID updated to "${cleaned}" successfully!` : 'UPI ID removed.'
        );
      }
      setIsEditingUpi(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update UPI ID. Please try again.');
      if (onNotify) {
        onNotify('error', err.message || 'Failed to update UPI ID');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header with Arrow Back Button */}
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
            My UPI & Payment QR
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Payments
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Share your personal payment QR code and manage your settlement UPI handle
          </p>
        </div>
      </div>

      {/* Main Grid: QR Code Card & Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto my-4 sm:my-6 items-start">
        {/* Left Column: Official Payment QR Code (Col-span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-6 text-center flex flex-col items-center relative overflow-hidden transition-colors">
          {/* Top Banner Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4 select-none">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Instant Scan & Pay</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {currentUserName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Scan to pay via any UPI App
          </p>

          {/* QR Code Container with Centered Techy Tracker Logo */}
          <div className="my-5 p-3.5 bg-white rounded-3xl shadow-sm border border-slate-200 relative inline-block">
            {currentUpiId ? (
              <div className="relative w-56 h-56 flex items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt={`UPI QR Code for ${currentUpiId}`}
                  className="w-full h-full object-contain select-none"
                  loading="eager"
                />

                {/* Centered Professional Techy Tracker App Logo Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md border-2 border-indigo-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    <TechyTrackerLogo className="w-8 h-8" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-4 text-center">
                <QrCode className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No UPI ID Configured
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Add your UPI ID on the right to activate your personal QR code.
                </p>
              </div>
            )}
          </div>

          {/* Current UPI Pill & 1-Click Copy */}
          {currentUpiId ? (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
                <div className="min-w-0 text-left pr-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Your Active UPI ID
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate block">
                    {currentUpiId}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct UPI App Deep Link for Mobile */}
              <a
                href={upiPayUri}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
              </a>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Supports all UPI apps with 100% verified scan compatibility
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingUpi(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Configure UPI ID Now</span>
            </button>
          )}
        </div>

        {/* Right Column: Configuration, Editing & Benefits (Col-span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Configuration Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-6 sm:p-7 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    UPI Handle Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect your bank or VPA handle for peer settlement
                  </p>
                </div>
              </div>

              {!isEditingUpi && currentUpiId && (
                <button
                  type="button"
                  onClick={() => {
                    setUpiInput(currentUpiId);
                    setIsEditingUpi(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Change UPI ID</span>
                </button>
              )}
            </div>

            {/* View / Edit Mode */}
            {isEditingUpi ? (
              <form onSubmit={handleSaveUpi} className="pt-5 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Enter UPI ID / VPA *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={upiInput}
                      onChange={e => {
                        setUpiInput(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="e.g. mobile@paytm, name@okhdfcbank"
                      className="w-full px-4 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  {errorMsg && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </p>
                  )}
                </div>

                {/* Quick Bank Handle Chips */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                    Quick Bank Handles:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_UPI_HANDLES.map(handle => (
                      <button
                        key={handle}
                        type="button"
                        onClick={() => handleApplyPresetHandle(handle)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/60 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {handle}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save UPI ID</span>
                      </>
                    )}
                  </button>

                  {currentUpiId && (
                    <button
                      type="button"
                      onClick={() => {
                        setUpiInput(currentUpiId);
                        setIsEditingUpi(false);
                        setErrorMsg('');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="pt-5 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      UPI ID Verified & Active
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Your mutual settlements and group expense debts will directly link to{' '}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {currentUpiId}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Direct bank-to-bank settlement without payment gateway fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1-Click deep link support on mobile (GPay, PhonePe, Paytm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>High-reliability scan QR with embedded Techy Tracker seal</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
