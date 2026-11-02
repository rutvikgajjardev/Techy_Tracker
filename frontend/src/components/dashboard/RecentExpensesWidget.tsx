import React from 'react';
import { ArrowRight, ChevronRight, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { Expense } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface RecentExpensesWidgetProps {
  expenses: Expense[];
  onViewAll: () => void;
  onSelectExpense: (expense: Expense) => void;
}

export const RecentExpensesWidget: React.FC<RecentExpensesWidgetProps> = ({
  expenses,
  onViewAll,
  onSelectExpense,
}) => {
  const { formatAmount } = useTheme();

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/80">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Recent Expenses
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Latest transactions and settlements
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>View All Expenses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
        {expenses.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              No recent expenses found
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Try selecting a wider date range or add a new expense to see your recent activity.
            </p>
          </div>
        ) : (
          expenses.map(exp => {
            const dateObj = new Date(exp.expenseDate);
            const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

            return (
              <div
                key={exp.id}
                onClick={() => onSelectExpense(exp)}
                className="py-3.5 px-1 sm:px-2 flex items-center justify-between gap-3 sm:gap-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors group"
              >
                {/* Left Side: Date Tile + Stacked Title, Category & Paid By */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 text-center mt-0.5 sm:mt-0">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 leading-none">
                      {month}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 leading-none tabular-nums">
                      {day}
                    </span>
                  </div>

                  {/* Stacked Title -> Category -> Paid by (Never overlaps right column) */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {exp.title}
                      </p>
                      {exp.images && exp.images.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 px-1.5 py-0.2 rounded shrink-0"
                          title={`${exp.images.length} receipt photo${exp.images.length > 1 ? 's' : ''} attached`}
                        >
                          <Receipt className="w-2.5 h-2.5" />
                          <span>{exp.images.length}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate">
                      {exp.categoryName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Paid by <span className="font-medium text-slate-700 dark:text-slate-300">{exp.paidByName}</span>
                    </p>
                  </div>
                </div>

                {/* Right Side: Amount & Status aligned cleanly with min-w */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-[100px] justify-end">
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums block whitespace-nowrap">
                      {formatAmount(exp.amount)}
                    </span>
                    <span
                      className={`text-[11px] font-medium inline-flex items-center justify-end gap-1 mt-0.5 whitespace-nowrap ${
                        exp.status === 'COMPLETED'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {exp.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" />
                      )}
                      {exp.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
