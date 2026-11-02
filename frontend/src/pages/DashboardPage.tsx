import React, { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { TimePeriodFilter, Expense } from '../types';
import { useDashboard } from '../hooks/useApi';
import { KPICards } from '../components/dashboard/KPICards';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { RecentExpensesWidget } from '../components/dashboard/RecentExpensesWidget';
import { DatePicker } from '../components/ui/DatePicker';

interface DashboardPageProps {
  onNavigateToExpenses: () => void;
  onSelectExpense: (expense: Expense) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToExpenses,
  onSelectExpense,
}) => {
  const [period, setPeriod] = useState<TimePeriodFilter>('all_time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Call backend REST API via SWR
  const { summary, isLoading, isValidating, error, mutateDashboard } = useDashboard(
    period,
    customStart || undefined,
    customEnd || undefined
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

      {/* Loading state skeleton if first load */}
      {isLoading && !summary && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {summary && <KPICards kpis={summary.kpis} />}

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
        />
      )}
    </div>
  );
};
