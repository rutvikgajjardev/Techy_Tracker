import React, { useState } from 'react';
import {
  Users,
  QrCode,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  Copy,
  Check,
  ExternalLink,
  X,
  RefreshCw,
  Scale,
  ArrowLeft,
} from 'lucide-react';
import { SettlementPair } from '../../types';
import { useSettlementPairs, useAppMutations } from '../../hooks/useApi';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmDialog } from '../ui/Dialog';

interface NetSettlementWidgetProps {
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const NetSettlementWidget: React.FC<NetSettlementWidgetProps> = ({ onNotify }) => {
  const { pairs, isLoading, isValidating, error, mutatePairs } = useSettlementPairs();
  const { invalidateAll } = useAppMutations();
  const { formatAmount } = useTheme();

  // Active detail modal pair
  const [selectedPair, setSelectedPair] = useState<SettlementPair | null>(null);

  // Active view inside modal: 'breakdown' or 'qr'
  const [modalView, setModalView] = useState<'breakdown' | 'qr'>('breakdown');

  // Confirm Settle Dialog state
  const [settlingPair, setSettlingPair] = useState<SettlementPair | null>(null);
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Copy UPI state
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleOpenModal = (pair: SettlementPair) => {
    setSelectedPair(pair);
    setModalView('breakdown');
  };

  const handleCloseModal = () => {
    setSelectedPair(null);
    setModalView('breakdown');
  };

  const handleConfirmSettle = async () => {
    if (!settlingPair) return;
    setIsSubmittingSettle(true);
    try {
      const res = await apiService.settlePair(settlingPair.user.id);
      if (onNotify) {
        onNotify('success', res.message || `Settlement with ${settlingPair.user.name} completed successfully.`);
      }
      setSettlingPair(null);
      handleCloseModal();
      // Atomic SWR invalidation across all app views (Dashboard, Expenses, Categories)
      await invalidateAll();
      await mutatePairs();
    } catch (err: any) {
      if (onNotify) {
        onNotify('error', err.message || 'Failed to settle mutual debts.');
      }
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // If loading and no pairs yet, return skeleton
  if (isLoading && (!pairs || pairs.length === 0)) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse space-y-4 shadow-xs">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2].map(n => (
            <div key={n} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-700/60" />
          ))}
        </div>
      </div>
    );
  }

  // If there are no pending mutual debts, render a clean compact status banner
  if (!pairs || pairs.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 dark:from-emerald-950/20 dark:via-slate-800 dark:to-emerald-950/10 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              All Mutual Balances Settled
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              You and your friends have zero pending cross-debts across all expenses.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => mutatePairs()}
          title="Refresh balances"
          disabled={isValidating}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Friends Net Balances
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {pairs.length} {pairs.length === 1 ? 'Friend' : 'Friends'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              1-Click mutual debt netting across all shared expenses
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => mutatePairs()}
          title="Refresh mutual balances via SWR"
          disabled={isValidating}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Grid of Simple, Clean Dashboard Cards (No Accordion Clutter) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {pairs.map(pair => {
          const isYouOwe = pair.status === 'YOU_OWE';
          const friendName = pair.user.name;

          const initials = friendName
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={pair.user.id}
              onClick={() => handleOpenModal(pair)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleOpenModal(pair);
                }
              }}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/70 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 group select-none shadow-xs"
            >
              {/* Friend Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                    isYouOwe
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                  }`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {friendName}
                  </h4>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                    Click to view settlement details
                  </span>
                </div>
              </div>

              {/* Status Badge with Unambiguous Language */}
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight ${
                    isYouOwe
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {isYouOwe ? `You owe ${friendName} ` : `${friendName} owes you `}
                  <span className="font-extrabold ml-1">{formatAmount(pair.netAmount)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Centered Modal / Pop-up for Detailed Side-by-Side Category Comparison */}
      {selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                    selectedPair.status === 'YOU_OWE'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                  }`}
                >
                  {selectedPair.user.name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    Settlement with {selectedPair.user.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Mutual Category Comparison & Net Balance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Breakdown vs QR view */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {modalView === 'breakdown' ? (
                <>
                  {/* Side-by-Side Category Comparison Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column: You owe [Friend] */}
                    <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-900/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ArrowDownLeft className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 truncate">
                              You owe {selectedPair.user.name}
                            </h4>
                          </div>
                        </div>

                        {/* Category List */}
                        <div className="pt-2.5 space-y-2">
                          {selectedPair.categories.filter(c => c.iOweThem > 0).length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">
                              No pending amounts you owe
                            </p>
                          ) : (
                            selectedPair.categories
                              .filter(c => c.iOweThem > 0)
                              .map(cat => (
                                <div
                                  key={cat.categoryId}
                                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/30 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Tag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {cat.categoryName}
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono text-rose-600 dark:text-rose-400 shrink-0">
                                    {formatAmount(cat.iOweThem)}
                                  </span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Column Subtotal */}
                      <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
                        <span>Total Dues:</span>
                        <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                          {formatAmount(selectedPair.iOweThem)}
                        </span>
                      </div>
                    </div>

                    {/* Right Column: [Friend] owes you */}
                    <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                              {selectedPair.user.name} owes you
                            </h4>
                          </div>
                        </div>

                        {/* Category List */}
                        <div className="pt-2.5 space-y-2">
                          {selectedPair.categories.filter(c => c.theyOweMe > 0).length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">
                              No pending amounts owed to you
                            </p>
                          ) : (
                            selectedPair.categories
                              .filter(c => c.theyOweMe > 0)
                              .map(cat => (
                                <div
                                  key={cat.categoryId}
                                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {cat.categoryName}
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {formatAmount(cat.theyOweMe)}
                                  </span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Column Subtotal */}
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        <span>Total Credits:</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatAmount(selectedPair.theyOweMe)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Mathematical Deduction Equation */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Net Balance Equation</span>
                    </div>

                    <p className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatAmount(selectedPair.theyOweMe)}
                      </span>{' '}
                      ({selectedPair.user.name} owes you) −{' '}
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        {formatAmount(selectedPair.iOweThem)}
                      </span>{' '}
                      (You owe {selectedPair.user.name}) ={' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        Net {formatAmount(selectedPair.netAmount)}
                      </span>{' '}
                      <span
                        className={`font-bold ${
                          selectedPair.status === 'YOU_OWE'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        ({selectedPair.status === 'YOU_OWE'
                          ? `You owe ${selectedPair.user.name}`
                          : `${selectedPair.user.name} owes you`})
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                /* QR Code Payment View inside Modal */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModalView('breakdown')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Breakdown</span>
                    </button>
                    <span className="text-xs text-slate-400 font-medium">Scan QR to Pay</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-2.5">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
                          `upi://pay?pa=${encodeURIComponent(selectedPair.user.upi_id || '')}&pn=${encodeURIComponent(
                            selectedPair.user.name
                          )}&am=${selectedPair.netAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                            `Net settlement with ${selectedPair.user.name}`
                          )}`
                        )}`}
                        alt="UPI QR Code"
                        className="w-44 h-44 object-contain"
                      />
                    </div>

                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Net Amount to Pay {selectedPair.user.name}
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                      {formatAmount(selectedPair.netAmount)}
                    </span>
                  </div>

                  {/* UPI ID Pill & Copy */}
                  {selectedPair.user.upi_id && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-xs">
                      <span className="font-mono text-slate-700 dark:text-slate-200 truncate pr-2">
                        {selectedPair.user.upi_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUpi(selectedPair.user.upi_id || '')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Direct Mobile UPI Deep Link */}
                  {selectedPair.user.upi_id && (
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(
                        selectedPair.user.upi_id
                      )}&pn=${encodeURIComponent(selectedPair.user.name)}&am=${selectedPair.netAmount.toFixed(
                        2
                      )}&cu=INR&tn=${encodeURIComponent(`Net settlement with ${selectedPair.user.name}`)}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Smart Action Buttons (Modal Footer) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>

              {/* If "You Owe [Friend]" -> Show BOTH [ Pay Net (UPI QR) ] AND [ Mark as Settled ] */}
              {selectedPair.status === 'YOU_OWE' ? (
                <>
                  {modalView === 'breakdown' && (
                    <button
                      type="button"
                      onClick={() => setModalView('qr')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Pay Net {formatAmount(selectedPair.netAmount)} (UPI QR)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSettlingPair(selectedPair)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Settled</span>
                  </button>
                </>
              ) : (
                /* If "[Friend] Owes You" -> Show ONLY [ Mark as Settled ] */
                <button
                  type="button"
                  onClick={() => setSettlingPair(selectedPair)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Settled</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Settle Dialog */}
      <ConfirmDialog
        isOpen={!!settlingPair}
        title={`Settle All Debts with ${settlingPair?.user.name}?`}
        subtitle="1-Click Mutual Reconciliation"
        message={`This will settle all reciprocal pending splits between you and ${settlingPair?.user.name} for the net amount of ${formatAmount(settlingPair?.netAmount || 0)}.\n\nAll affected expenses will be updated and completed.`}
        confirmLabel="Yes, Settle Mutual Debts"
        cancelLabel="Cancel"
        tone="info"
        isLoading={isSubmittingSettle}
        onConfirm={handleConfirmSettle}
        onCancel={() => setSettlingPair(null)}
      />
    </div>
  );
};
