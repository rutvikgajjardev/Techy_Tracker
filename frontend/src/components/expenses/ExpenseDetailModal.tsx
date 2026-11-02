import React from 'react';
import {
  X,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  ArrowRight,
  Tag,
  Smartphone,
  Copy,
  Check,
  Receipt,
  Eye,
  QrCode,
  Loader2,
} from 'lucide-react';
import { Expense } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useExpense, useAppMutations } from '../../hooks/useApi';
import { apiService } from '../../services/api';
import { ImageViewerModal } from '../ui/ImageViewerModal';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onToggleStatus?: (expense: Expense) => void;
  isDeleting?: boolean;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense: propExpense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  isDeleting = false,
}) => {
  const { currentUser } = useAuth();
  const { formatAmount } = useTheme();
  const [copiedUpi, setCopiedUpi] = React.useState<string | null>(null);
  const [showQrCode, setShowQrCode] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setShowQrCode(false);
  }, [propExpense?.id, isOpen]);

  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedUpi(upi);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  const { invalidateExpenses } = useAppMutations();
  // Load latest expense details & audit trail via SWR
  const { expense: detailedExpense, mutateExpense } = useExpense(isOpen && propExpense ? propExpense.id : null);
  const expense = detailedExpense || propExpense;
  const [settlingUserId, setSettlingUserId] = React.useState<number | null>(null);

  const handleToggleParticipantSettled = async (targetUserId: number) => {
    if (!expense) return;
    try {
      setSettlingUserId(targetUserId);
      await apiService.toggleParticipantSettle(expense.id, targetUserId);
      await mutateExpense();
      await invalidateExpenses();
    } catch (err: any) {
      console.error('Failed to toggle settlement', err);
    } finally {
      setSettlingUserId(null);
    }
  };

  if (!isOpen || !expense) return null;

  const participants = expense.participants || [];
  const images = expense.images || [];
  const auditTrail = expense.auditTrail || [];

  const createdDate = expense.createdAt
    ? new Date(expense.createdAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const updatedDate = expense.updatedAt
    ? new Date(expense.updatedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const currentParticipant = currentUser
    ? participants.find(p => p.userId === currentUser.id)
    : null;

  const isCurrentUserPayer = currentUser?.id === expense.paidById;
  const isCreator = currentUser?.id === expense.createdById;
  const isCurrentUserParticipant = !!currentParticipant;

  // Requirement: Show COMPLETED when all users paid to the person who paid for that expense
  const nonPayerMembers = participants.filter(p => p.userId !== expense.paidById);
  const isAllSettled =
    nonPayerMembers.length === 0 ||
    nonPayerMembers.every(p => p.isSettled);

  const displayStatus = isAllSettled ? 'COMPLETED' : 'PENDING';

  const isUserSettled =
    displayStatus === 'COMPLETED' ||
    isCurrentUserPayer ||
    Boolean(currentParticipant?.isSettled);

  // Requirement: When logged-in user owes money to the person who paid, show prominent payment card at the top
  const showUserDueCard =
    isCurrentUserParticipant &&
    !isCurrentUserPayer &&
    !isUserSettled &&
    (currentParticipant?.shareAmount ?? 0) > 0;

  const targetUpiId = expense.paidByUpiId || currentParticipant?.owesToUpiId || null;
  const upiPayUrl =
    targetUpiId && currentParticipant
      ? `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(expense.paidByName)}&am=${currentParticipant.shareAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Settlement for ${expense.title}`)}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header: Full width for Category Badge & Full Readable Expense Title */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block whitespace-nowrap">
                {expense.categoryName}
              </span>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-snug break-words mt-0.5">
                {expense.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Top Payment Due Action Card (Visible when logged-in user owes money to the payer) */}
          {showUserDueCard && currentParticipant && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 dark:border-amber-600/60 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-800 p-4 sm:p-5 shadow-lg shadow-amber-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Top Header Badge */}
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Your Share Due
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-tight">
                    Amount to Pay
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatAmount(currentParticipant.shareAmount)}
                  </span>
                </div>
              </div>

              {/* User Avatar + "ram (You)" + "Needs to pay ₹138.75 to Mack" */}
              <div className="flex items-start sm:items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-white dark:ring-slate-800">
                  {currentParticipant.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {currentParticipant.name}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      You
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    Needs to pay{' '}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatAmount(currentParticipant.shareAmount)}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {expense.paidByName}
                    </span>
                  </p>
                </div>
              </div>

              {/* UPI and Payment Actions */}
              {targetUpiId ? (
                <div className="space-y-3 pt-3 border-t border-amber-200/70 dark:border-slate-700/80">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* UPI Badge & Copy button */}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold shadow-2xs">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{targetUpiId}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyUpi(targetUpiId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        title="Copy UPI ID"
                      >
                        {copiedUpi === targetUpiId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Pay Button & QR Toggle & Mark Paid */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQrCode(prev => !prev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        title="Toggle QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{showQrCode ? 'Hide QR' : 'Scan QR'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={settlingUserId === currentParticipant.userId}
                        onClick={() => handleToggleParticipantSettled(currentParticipant.userId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Mark your share as paid once transfer is complete"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>{settlingUserId === currentParticipant.userId ? 'Updating...' : 'Mark as Paid'}</span>
                      </button>

                      {upiPayUrl && (
                        <a
                          href={upiPayUrl}
                          onClick={async () => {
                            await handleToggleParticipantSettled(currentParticipant.userId);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:translate-y-[-1px] cursor-pointer"
                          title="Open directly in GPay / PhonePe / Paytm / BHIM and mark as settled"
                        >
                          <span>Pay via UPI App</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* QR Code Card */}
                  {showQrCode && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(upiPayUrl || `upi://pay?pa=${targetUpiId}&pn=${expense.paidByName}`)}`}
                          alt="UPI QR Code"
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                          <QrCode className="w-4 h-4 text-emerald-500" />
                          Scan to Pay {formatAmount(currentParticipant.shareAmount)}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Scan this QR using Google Pay, PhonePe, Paytm, or BHIM on your mobile phone to settle your share directly.
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                          Recipient: {expense.paidByName} ({targetUpiId})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-amber-200/70 dark:border-slate-700/80">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {expense.paidByName} has not added a UPI ID yet. Settle manually via cash or transfer.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settled State Confirmation for current user */}
          {isCurrentUserParticipant && !isCurrentUserPayer && isUserSettled && (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Your Share is Settled ({formatAmount(currentParticipant.shareAmount)})
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    You have marked your payment as complete.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  Settled
                </span>
                <button
                  type="button"
                  disabled={settlingUserId === currentParticipant.userId}
                  onClick={() => handleToggleParticipantSettled(currentParticipant.userId)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  title="Click if marked by mistake"
                >
                  {settlingUserId === currentParticipant.userId ? 'Updating...' : 'Mark Unpaid'}
                </button>
              </div>
            </div>
          )}

          {/* If current user is the Payer */}
          {isCurrentUserPayer && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                    You Paid This Expense ({formatAmount(expense.amount)})
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    {expense.status === 'COMPLETED'
                      ? 'All members have settled this expense.'
                      : 'Other participants owe you their respective shares.'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 shrink-0">
                You Paid
              </span>
            </div>
          )}

          {/* Amount & Status Bar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Total Amount
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {formatAmount(expense.amount)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border select-none ${
                  displayStatus === 'COMPLETED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                {displayStatus === 'COMPLETED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>Status: {displayStatus}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">
                Description & Notes
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {expense.description}
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-slate-400 block mb-0.5">Paid By</span>
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {expense.paidByName}
                </span>
                {expense.paidByUpiId && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Smartphone className="w-2.5 h-2.5" />
                    {expense.paidByUpiId}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-slate-400 block mb-0.5">Created By</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {expense.createdByName}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-slate-400 block mb-0.5">Created Time</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {createdDate}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-slate-400 block mb-0.5">Last Updated Time</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {updatedDate}
              </span>
            </div>
          </div>

          {/* Split Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Split Distribution ({participants.length} Members)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {formatAmount(expense.amount / (participants.length || 1))} / person
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/80 overflow-hidden">
              {participants.map(p => {
                const isUser = currentUser && p.userId === currentUser.id;
                const isPayer = p.userId === expense.paidById;
                const isMemberSettled =
                  expense.status === 'COMPLETED' || isPayer || p.isSettled;

                return (
                  <div
                    key={p.userId}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-[11px] shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {p.name} {isUser && <span className="text-slate-400 font-normal">(You)</span>}
                        </div>

                        {/* For unpaid participants: Show 'Needs to pay (amount) to (payer)' */}
                        {!isMemberSettled && (
                          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 leading-snug mt-0.5">
                            Needs to pay {formatAmount(p.shareAmount)} to{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{expense.paidByName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatAmount(p.shareAmount)}
                      </span>
                      {isPayer ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                          Settled (Payer)
                        </span>
                      ) : isMemberSettled ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                          Settled
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attached Bills & Receipts Gallery */}
          {expense.images && expense.images.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Attached Bills & Receipts
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {expense.images.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any photo to zoom & download
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {expense.images.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    title="Click to view full screen"
                    className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-2xs hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer"
                  >
                    <img
                      src={imgUrl}
                      alt={`Receipt ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 flex items-center justify-center transition-colors">
                      <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological history of edits and status changes
              </p>
            </div>

            <div className="space-y-3">
              {!expense.auditTrail || expense.auditTrail.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No edit history recorded yet.</p>
              ) : (
                expense.auditTrail.map(log => {
                  const logDate = new Date(log.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                            {log.actorName.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {log.actorName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {logDate}
                        </span>
                      </div>

                      {log.diff && log.diff.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          {log.diff.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {d.field}:
                              </span>
                              {d.old !== undefined && (
                                <span className="line-through text-rose-500 dark:text-rose-400 font-mono">
                                  {String(d.old)}
                                </span>
                              )}
                              {d.old !== undefined && d.new !== undefined && (
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                              )}
                              {d.new !== undefined && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                  {String(d.new)}
                                </span>
                              )}
                              {d.added && d.added.length > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  + {d.added.join(', ')}
                                </span>
                              )}
                              {d.removed && d.removed.length > 0 && (
                                <span className="text-rose-500 dark:text-rose-400">
                                  - {d.removed.join(', ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer: Relocated Edit and Delete buttons so header title is never squeezed */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(expense)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {isCreator && (
              <button
                onClick={() => onDelete(expense)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>

      {/* Zoomable Image Viewer for Attached Bills */}
      <ImageViewerModal
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        images={expense.images || []}
        initialIndex={selectedImageIndex ?? 0}
        title={`${expense.title} - Bill Photo`}
      />
    </div>
  );
};
