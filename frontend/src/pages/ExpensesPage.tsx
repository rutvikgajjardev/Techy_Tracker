import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Calendar,
  User as UserIcon,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Receipt,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Expense, ExpenseFilters, Category } from '../types';
import { useExpenses } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDebounce } from '../hooks/useDebounce';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { DatePicker } from '../components/ui/DatePicker';

interface ExpensesPageProps {
  onSelectExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
  onOpenNewExpense: () => void;
  isFormOpen?: boolean;
  formExpense?: Expense | null;
  onCloseForm?: () => void;
  onSubmitForm?: (data: any) => Promise<void>;
  categories?: Category[];
  isSyncingExpense?: boolean;
  syncMessage?: string;
  recentCreatedId?: number | null;
  deletingExpenseId?: number | null;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onSelectExpense,
  onEditExpense,
  onRequestDeleteExpense,
  onOpenNewExpense,
  isFormOpen = false,
  formExpense = null,
  onCloseForm,
  onSubmitForm,
  categories = [],
  isSyncingExpense = false,
  syncMessage = '',
  recentCreatedId = null,
  deletingExpenseId = null,
}) => {
  const { currentUser, registeredUsers } = useAuth();
  const { formatAmount } = useTheme();

  // Manual refresh spinner state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Filters State (Search, Date, Paid By, Sort, Status)
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [dateRange, setDateRange] = useState<'all' | 'year' | 'month' | 'week' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paidByUserId, setPaidByUserId] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newer' | 'older' | 'amount_high' | 'amount_low'>('newer');
  const [search, setSearch] = useState('');
  // Debounce search input by 350ms to prevent high-frequency backend API calls on every keystroke
  const debouncedSearch = useDebounce(search, 350);

  // SWR Filters Query
  const filters: Partial<ExpenseFilters> = useMemo(
    () => ({
      status: statusTab,
      dateRange,
      customStartDate: customStart || undefined,
      customEndDate: customEnd || undefined,
      paidByUserId,
      sortBy,
      search: debouncedSearch,
    }),
    [statusTab, dateRange, customStart, customEnd, paidByUserId, sortBy, debouncedSearch]
  );

  const hasActiveFilters = Boolean(
    search ||
    dateRange !== 'all' ||
    customStart ||
    customEnd ||
    paidByUserId !== 'all' ||
    statusTab !== 'ALL'
  );

  const handleClearFilters = () => {
    setSearch('');
    setDateRange('all');
    setCustomStart('');
    setCustomEnd('');
    setPaidByUserId('all');
    setStatusTab('ALL');
  };

  // Hook into backend REST API using SWR
  const { expenses, count, isLoading, isValidating, error, mutateExpenses } = useExpenses(filters);

  // Unified syncing state: active when saving a new/updated expense or manually refreshing
  const isSyncing = isSyncingExpense || isManualRefreshing;

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await mutateExpenses();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // If in Form mode, replace all list data with the inline form and a Back button
  if (isFormOpen) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page Header with Arrow-only Back Button in front of the heading */}
        <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCloseForm || onOpenNewExpense}
            title="Back to Expenses"
            aria-label="Back to Expenses"
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Expenses
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {formExpense ? 'Edit Expense' : 'Record New Expense'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage transactions, splits, and audit history (Powered by SWR)
            </p>
          </div>
        </div>

        {/* In-page Record / Edit Expense Form */}
        <ExpenseForm
          onBack={onCloseForm || (() => {})}
          onSubmit={onSubmitForm || (async () => {})}
          categories={categories}
          initialData={formExpense}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header with Single Exclusive "Record Expense" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Expenses
            {(isValidating || isSyncing) && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 animate-pulse">
                Syncing...
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage transactions, splits, and audit history (Powered by SWR)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            title="Refresh expenses list via SWR"
            disabled={isValidating || isSyncing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating || isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={onOpenNewExpense}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Status Tabs: All, Pending, Completed */}
      <div className={`flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto transition-opacity ${isSyncing ? 'pointer-events-none opacity-80' : ''}`}>
        {(['ALL', 'PENDING', 'COMPLETED'] as const).map(tab => {
          const isActive = statusTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All Expenses' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar (Search, Date, Paid By, Sort) */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, person..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Date Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Date: All Time</option>
              <option value="week">Date: Past Week</option>
              <option value="month">Date: This Month</option>
              <option value="year">Date: This Year</option>
              <option value="custom">Date: Custom Range</option>
            </select>
          </div>

          {/* 3. Paid By Filter */}
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={paidByUserId}
              onChange={e =>
                setPaidByUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Paid By: Anyone</option>
              {registeredUsers.map(u => (
                <option key={u.id} value={u.id}>
                  Paid By: {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Sort By */}
          <div className="relative">
            <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newer">Sort: Newer to Older</option>
              <option value="older">Sort: Older to Newer</option>
              <option value="amount_high">Sort: Amount (High to Low)</option>
              <option value="amount_low">Sort: Amount (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateRange === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                From Date
              </label>
              <DatePicker
                value={customStart}
                onChange={setCustomStart}
                placeholder="Start Date"
                maxDate={customEnd}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                To Date
              </label>
              <DatePicker
                value={customEnd}
                onChange={setCustomEnd}
                placeholder="End Date"
                minDate={customStart}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">
              {error.message || 'Failed to fetch expenses from backend'}
            </span>
          </div>
          <button
            onClick={() => mutateExpenses()}
            className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Spacious Expense List UI */}
      {isLoading && expenses.length === 0 ? (
        <div className="space-y-4 animate-pulse" role="status" aria-label="Loading expenses">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/70 shrink-0" />
                <div className="space-y-2.5">
                  <div className="w-24 h-4 rounded-full bg-slate-200 dark:bg-slate-700/70" />
                  <div className="w-48 sm:w-64 h-5 rounded-md bg-slate-200 dark:bg-slate-700/70" />
                  <div className="w-36 sm:w-48 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700/70" />
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-5 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/80 shrink-0">
                <div className="space-y-2 text-right">
                  <div className="w-24 h-6 rounded-md bg-slate-200 dark:bg-slate-700/70 ml-auto" />
                  <div className="w-16 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700/70 ml-auto" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700/70" />
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="space-y-4">
          {hasActiveFilters && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                No transactions match your current search or filter criteria.
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline self-start sm:self-auto cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Add Expense Action Card - Identical modern dashed card UI as Add Category */}
          <div
            onClick={onOpenNewExpense}
            className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[220px] shadow-2xs hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 flex items-center justify-center shadow-2xs transition-all mb-3.5">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Add New Expense
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">
              Record a transaction to track spending, split shares with friends, and attach bills
            </p>
          </div>
        </div>
      ) : (
        <div className="relative min-h-[200px]">
          {/* Floating In-Between Loading Status Pill/Card */}
          {isSyncing && (
            <div className="absolute inset-x-0 top-6 z-20 flex justify-center pointer-events-none px-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-indigo-200 dark:border-indigo-800/80 backdrop-blur-md flex items-center gap-3.5">
                <div className="relative flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {syncMessage || 'Syncing latest transactions...'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Applying updates and synchronizing balances
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions List with Dimmed & Filtered Background during Sync */}
          <div
            className={`space-y-4 transition-all duration-300 ${
              isSyncing
                ? 'opacity-35 blur-[1.5px] grayscale-[25%] pointer-events-none select-none scale-[0.998]'
                : 'opacity-100 blur-none scale-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Showing {expenses.length} of {count} transactions</span>
              {isSyncing && (
                <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </span>
              )}
            </div>

            {expenses.map(exp => {
              const isNewlyCreated = recentCreatedId === exp.id;
              const isThisDeleting = deletingExpenseId === exp.id;
              const dateObj = new Date(exp.expenseDate);
              const dayNum = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
              const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
              const yearNum = dateObj.getFullYear();
              const perPerson = exp.amount / (exp.participants?.length || 1);

              return (
                <div
                  key={exp.id}
                  className={`p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-xs ${
                    isThisDeleting
                      ? 'border-rose-400 dark:border-rose-800 ring-2 ring-rose-400/30 opacity-60 pointer-events-none scale-[0.995]'
                      : isNewlyCreated
                      ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/40 dark:ring-emerald-500/40 shadow-lg bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                    {/* Left & Center: Date Tile + Primary Info */}
                    <div
                      onClick={() => onSelectExpense(exp)}
                      className="flex items-start gap-3.5 sm:gap-5 cursor-pointer flex-1 min-w-0 group"
                    >
                      {/* Distinct Date Tile */}
                      <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 leading-none">
                          {monthShort}
                        </span>
                        <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white leading-tight mt-0.5 tabular-nums">
                          {dayNum}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-none">
                          {yearNum}
                        </span>
                      </div>

                      {/* Title, Category, Paid By & Split */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Row 1: Category & Status */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {isNewlyCreated && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/70 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-full animate-pulse shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Just Added
                            </span>
                          )}
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {exp.categoryName}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              exp.status === 'COMPLETED'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {exp.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {exp.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                          </span>
                          {exp.images && exp.images.length > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-full"
                                title={`${exp.images.length} receipt photo${exp.images.length > 1 ? 's' : ''} attached`}
                              >
                                <Receipt className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                                <span>{exp.images.length} {exp.images.length === 1 ? 'Bill' : 'Bills'}</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Row 2: Title */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug break-words">
                          {exp.title}
                        </h3>

                        {/* Row 3: Paid By & Participants */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-0.5">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Paid by: </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {exp.paidByName}
                            </span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">
                            |
                          </span>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">
                              Split ({exp.participants?.length || 1}):{' '}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {(exp.participants || []).map(p => p.name).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Zone: Amount & Clean Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/80 shrink-0">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 block">
                          Total Amount
                        </span>
                        <span className="text-lg sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums block mt-0.5">
                          {formatAmount(exp.amount)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5 block">
                          {formatAmount(perPerson)} / person
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-center">
                        <button
                          onClick={() => onEditExpense(exp)}
                          disabled={isThisDeleting || isSyncing}
                          title="Edit expense"
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {currentUser?.id === exp.createdById && (
                          <button
                            type="button"
                            onClick={() => onRequestDeleteExpense(exp)}
                            disabled={isThisDeleting || isSyncing}
                            title={isThisDeleting ? 'Deleting expense...' : 'Delete expense'}
                            className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isThisDeleting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600 dark:text-rose-400" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => onSelectExpense(exp)}
                          disabled={isThisDeleting}
                          title="View details & audit history"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
