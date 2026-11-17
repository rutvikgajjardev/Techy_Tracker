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
  Minus,
} from 'lucide-react';
import { SettlementPair } from '../../types';
import { useSettlementPairs, useAppMutations } from '../../hooks/useApi';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmDialog } from '../ui/Dialog';
import { TechyTrackerLogo } from '../ui/TechyTrackerLogo';

interface NetSettlementWidgetProps {
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// Helper accessors to safely retrieve friend information under any schema
const getFriendName = (p?: SettlementPair | null) => p?.user?.name || (p as any)?.friendName || 'Friend';
const getFriendId = (p?: SettlementPair | null) => p?.user?.id || (p as any)?.friendId || 0;
const getFriendUpi = (p?: SettlementPair | null) => p?.user?.upi_id || (p as any)?.friendUpiId || '';

// Clean date formatter for individual pending expenses
const formatExpenseDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
};

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
    const targetUserId = settlingPair.user?.id || (settlingPair as any).friendId;
    const friendName = settlingPair.user?.name || (settlingPair as any).friendName || 'Friend';
    if (!targetUserId) return;
    setIsSubmittingSettle(true);
    try {
      const res = await apiService.settlePair(targetUserId);
      if (onNotify) {
        onNotify('success', res.message || `Settlement with ${friendName} completed successfully.`);
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
          const friendName = getFriendName(pair);
          const friendId = getFriendId(pair);

          const initials = friendName
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={friendId || pair.netAmount}
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

      {/* Centered Modal / Pop-up for Detailed Side-by-Side Category & Expense Comparison */}
      {selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl sm:max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                    selectedPair.status === 'YOU_OWE'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                  }`}
                >
                  {getFriendName(selectedPair)
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                      Settlement with {getFriendName(selectedPair)}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        selectedPair.status === 'YOU_OWE'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {selectedPair.status === 'YOU_OWE' ? 'You Owe' : 'Owes You'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Detailed expense & category comparison with mutual deduction
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
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {modalView === 'breakdown' ? (
                <>
                  {/* Side-by-Side Expense & Category Comparison Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: You owe [Friend] */}
                    {(() => {
                      const duesExpenses = (selectedPair.expenses || []).filter(
                        e => e.type === 'YOU_OWE_THEM' || (e as any).relationship === 'YOU_OWE'
                      );
                      const categoriesIOwe = (selectedPair.categories || []).filter(
                        c => Number(c.iOweThem) > 0
                      );

                      return (
                        <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between pb-2.5 border-b border-rose-100 dark:border-rose-900/40">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ArrowDownLeft className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 truncate">
                                  You owe {getFriendName(selectedPair)}
                                </h4>
                              </div>
                              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-md">
                                {duesExpenses.length > 0
                                  ? `${duesExpenses.length} ${duesExpenses.length === 1 ? 'Expense' : 'Expenses'}`
                                  : `${categoriesIOwe.length} Categories`}
                              </span>
                            </div>

                            {/* Itemized Expenses & Category List */}
                            <div className="pt-2.5 space-y-2 max-h-64 overflow-y-auto pr-1">
                              {duesExpenses.length > 0 ? (
                                duesExpenses.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-rose-100 dark:border-rose-900/30 text-xs shadow-2xs hover:border-rose-200 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs leading-snug">
                                        {item.title}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                                          <Tag className="w-3 h-3 text-rose-500 shrink-0" />
                                          {item.categoryName || 'General'}
                                        </span>
                                        {item.expenseDate && (
                                          <span className="font-mono text-slate-400">
                                            · {formatExpenseDate(item.expenseDate)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-extrabold font-mono text-xs sm:text-sm text-rose-600 dark:text-rose-400 block tabular-nums">
                                        {formatAmount(item.amount)}
                                      </span>
                                      {item.totalExpenseAmount && item.totalExpenseAmount > item.amount && (
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                          total: {formatAmount(item.totalExpenseAmount)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : categoriesIOwe.length > 0 ? (
                                categoriesIOwe.map(cat => (
                                  <div
                                    key={cat.categoryId}
                                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/30 text-xs shadow-2xs"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Tag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {cat.categoryName || 'General'}
                                      </span>
                                    </div>
                                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400 shrink-0">
                                      {formatAmount(cat.iOweThem)}
                                    </span>
                                  </div>
                                ))
                              ) : selectedPair.iOweThem > 0 ? (
                                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/30 text-xs shadow-2xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Tag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      General Expenses
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono text-rose-600 dark:text-rose-400 shrink-0">
                                    {formatAmount(selectedPair.iOweThem)}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No pending amounts you owe
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Column Subtotal */}
                          <div className="pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
                            <span>Total Dues:</span>
                            <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                              {formatAmount(selectedPair.iOweThem)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Right Column: [Friend] owes you */}
                    {(() => {
                      const creditExpenses = (selectedPair.expenses || []).filter(
                        e => e.type === 'THEY_OWE_YOU' || (e as any).relationship === 'OWES_YOU'
                      );
                      const categoriesTheyOwe = (selectedPair.categories || []).filter(
                        c => Number(c.theyOweMe) > 0
                      );

                      return (
                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100 dark:border-emerald-900/40">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                                  {getFriendName(selectedPair)} owes you
                                </h4>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                                {creditExpenses.length > 0
                                  ? `${creditExpenses.length} ${creditExpenses.length === 1 ? 'Expense' : 'Expenses'}`
                                  : `${categoriesTheyOwe.length} Categories`}
                              </span>
                            </div>

                            {/* Itemized Expenses & Category List */}
                            <div className="pt-2.5 space-y-2 max-h-64 overflow-y-auto pr-1">
                              {creditExpenses.length > 0 ? (
                                creditExpenses.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-emerald-100 dark:border-emerald-900/30 text-xs shadow-2xs hover:border-emerald-200 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs leading-snug">
                                        {item.title}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
                                          <Tag className="w-3 h-3 text-emerald-500 shrink-0" />
                                          {item.categoryName || 'General'}
                                        </span>
                                        {item.expenseDate && (
                                          <span className="font-mono text-slate-400">
                                            · {formatExpenseDate(item.expenseDate)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-extrabold font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 block tabular-nums">
                                        {formatAmount(item.amount)}
                                      </span>
                                      {item.totalExpenseAmount && item.totalExpenseAmount > item.amount && (
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                          total: {formatAmount(item.totalExpenseAmount)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : categoriesTheyOwe.length > 0 ? (
                                categoriesTheyOwe.map(cat => (
                                  <div
                                    key={cat.categoryId}
                                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 text-xs shadow-2xs"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {cat.categoryName || 'General'}
                                      </span>
                                    </div>
                                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                      {formatAmount(cat.theyOweMe)}
                                    </span>
                                  </div>
                                ))
                              ) : selectedPair.theyOweMe > 0 ? (
                                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 text-xs shadow-2xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      General Expenses
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {formatAmount(selectedPair.theyOweMe)}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No pending amounts owed to you
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Column Subtotal */}
                          <div className="pt-2.5 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                            <span>Total Credits:</span>
                            <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatAmount(selectedPair.theyOweMe)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bottom Mathematical Deduction Equation in Vertical Stack Layout */}
                  {(() => {
                    const isYouOwe = selectedPair.status === 'YOU_OWE';
                    const friendName = getFriendName(selectedPair);

                    const topTitle = isYouOwe
                      ? `Total Dues (You owe ${friendName})`
                      : `Total Credits (${friendName} owes you)`;
                    const topSubtitle = isYouOwe
                      ? `Pending expenses paid by ${friendName}`
                      : `Pending expenses paid by you`;
                    const topAmount = isYouOwe ? selectedPair.iOweThem : selectedPair.theyOweMe;
                    const topColorClass = isYouOwe ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
                    const topBadgeClass = isYouOwe
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40';

                    const bottomTitle = isYouOwe
                      ? `Total Credits (${friendName} owes you)`
                      : `Total Dues (You owe ${friendName})`;
                    const bottomSubtitle = isYouOwe
                      ? `Deducted credit from expenses you paid`
                      : `Deducted dues from expenses ${friendName} paid`;
                    const bottomAmount = isYouOwe ? selectedPair.theyOweMe : selectedPair.iOweThem;
                    const bottomColorClass = isYouOwe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                    const bottomBadgeClass = isYouOwe
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40';

                    return (
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Net Balance Calculation</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Mutual Deduction Equation
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Row 1: Expense Total 1 */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold shrink-0 ${topBadgeClass}`}>
                                Total 1
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {topTitle}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {topSubtitle}
                                </p>
                              </div>
                            </div>
                            <span className={`font-mono font-extrabold text-sm sm:text-base tabular-nums shrink-0 ${topColorClass}`}>
                              {formatAmount(topAmount)}
                            </span>
                          </div>

                          {/* Minus Sign Row */}
                          <div className="flex items-center justify-center my-0.5 relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-slate-200 dark:border-slate-700/60" />
                            </div>
                            <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
                              <Minus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[3]" />
                              <span className="text-[11px]">Deduct Mutual Amount</span>
                            </div>
                          </div>

                          {/* Row 2: Expense Total 2 */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold shrink-0 ${bottomBadgeClass}`}>
                                Total 2
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {bottomTitle}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {bottomSubtitle}
                                </p>
                              </div>
                            </div>
                            <span className={`font-mono font-extrabold text-sm sm:text-base tabular-nums shrink-0 ${bottomColorClass}`}>
                              − {formatAmount(bottomAmount)}
                            </span>
                          </div>

                          {/* Equals Sign & Net Result Row */}
                          <div className="pt-2 border-t-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between px-2 pt-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                                =
                              </span>
                              <div>
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                                  Net Payable / Receivable
                                </span>
                                <span
                                  className={`text-[11px] font-bold ${
                                    selectedPair.status === 'YOU_OWE'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {selectedPair.status === 'YOU_OWE'
                                    ? `You owe ${friendName}`
                                    : `${friendName} owes you`}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-lg sm:text-2xl font-black font-mono tabular-nums ${
                                  selectedPair.status === 'YOU_OWE'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                Net {formatAmount(selectedPair.netAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                    <div className="p-3.5 bg-white rounded-3xl shadow-sm border border-slate-200 mb-2.5 relative inline-block">
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&ecc=H&data=${encodeURIComponent(
                            `upi://pay?pa=${encodeURIComponent(getFriendUpi(selectedPair))}&pn=${encodeURIComponent(
                              getFriendName(selectedPair)
                            )}&am=${selectedPair.netAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                              `Net settlement with ${getFriendName(selectedPair)}`
                            )}`
                          )}`}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain select-none"
                        />
                        {/* Centered Professional Techy Tracker App Logo Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 p-0.5 shadow-md border-2 border-indigo-600 flex items-center justify-center ring-2 ring-white">
                            <TechyTrackerLogo className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Net Amount to Pay {getFriendName(selectedPair)}
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                      {formatAmount(selectedPair.netAmount)}
                    </span>
                  </div>

                  {/* UPI ID Pill & Copy */}
                  {getFriendUpi(selectedPair) && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-xs">
                      <span className="font-mono text-slate-700 dark:text-slate-200 truncate pr-2">
                        {getFriendUpi(selectedPair)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUpi(getFriendUpi(selectedPair))}
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
                  {getFriendUpi(selectedPair) && (
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(
                        getFriendUpi(selectedPair)
                      )}&pn=${encodeURIComponent(getFriendName(selectedPair))}&am=${selectedPair.netAmount.toFixed(
                        2
                      )}&cu=INR&tn=${encodeURIComponent(`Net settlement with ${getFriendName(selectedPair)}`)}`}
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
        title={`Settle All Debts with ${getFriendName(settlingPair)}?`}
        subtitle="1-Click Mutual Reconciliation"
        message={`This will settle all reciprocal pending splits between you and ${getFriendName(settlingPair)} for the net amount of ${formatAmount(settlingPair?.netAmount || 0)}.\n\nAll affected expenses will be updated and completed.`}
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
