import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { TimePeriodFilter, Expense } from '../types';
import { useDashboard } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { KPICards } from '../components/dashboard/KPICards';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { RecentExpensesWidget } from '../components/dashboard/RecentExpensesWidget';
import { NetSettlementWidget } from '../components/dashboard/NetSettlementWidget';
import { DatePicker } from '../components/ui/DatePicker';

interface DashboardPageProps {
  onNavigateToExpenses: () => void;
  onOpenNewExpense?: () => void;
  onSelectExpense: (expense: Expense) => void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToExpenses,
  onOpenNewExpense,
  onSelectExpense,
  onNotify,
}) => {
  const [period, setPeriod] = useState<TimePeriodFilter>('all_time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Debounce custom date pickers so picking dates updates smoothly
  const debouncedCustomStart = useDebounce(customStart, 300);
  const debouncedCustomEnd = useDebounce(customEnd, 300);

  // Call backend REST API via SWR
  const { summary, isLoading, isValidating, error, mutateDashboard } = useDashboard(
    period,
    debouncedCustomStart || undefined,
    debouncedCustomEnd || undefined
  );

  const periods: { id: TimePeriodFilter; label: string }[] = [
    { id: 'all_time', label: 'All Time' },
    { id: 'this_year', label: 'This Year' },
    { id: 'this_month', label: 'This Month' },
    { id: 'this_week', label: 'This Week' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Dashboard Overview
            {isValidating && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Updating...
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personal and shared expenditure insights fetched live via SWR
          </p>
        </div>

        {/* Global Time Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => mutateDashboard()}
            title="Refresh dashboard metrics via SWR"
            disabled={isValidating}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {onOpenNewExpense && (
            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Custom Date Pickers */}
      {period === 'custom' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150 shadow-xs">
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

      {/* Error state */}
      {error && !summary && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">
              {error.message || 'Failed to load dashboard data from backend'}
            </span>
          </div>
          <button
            onClick={() => mutateDashboard()}
            className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state spinner if first load */}
      {isLoading && !summary && (
        <div className="min-h-[260px] flex items-center justify-center py-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span>Loading dashboard overview...</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {summary && <KPICards kpis={summary.kpis} />}

      {/* Friends Net Balances & Instant 1-Click Settlement (Scenario 1) */}
      <NetSettlementWidget onNotify={onNotify} />

      {/* Visualizations Grid */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-h-[300px]">
            <SpendingTrendChart data={summary.spendingTrends} />
          </div>

          <div className="min-h-[300px]">
            <CategoryDonutChart data={summary.categoryBreakdown} />
          </div>
        </div>
      )}

      {/* Recent Expenses Widget */}
      {summary && (
        <RecentExpensesWidget
          expenses={summary.recentExpenses}
          onViewAll={onNavigateToExpenses}
          onSelectExpense={onSelectExpense}
          onOpenNewExpense={onOpenNewExpense}
        />
      )}
    </div>
  );
};
