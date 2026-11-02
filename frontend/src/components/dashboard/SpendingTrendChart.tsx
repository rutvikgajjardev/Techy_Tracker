import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SpendingTrendPoint } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface SpendingTrendChartProps {
  data: SpendingTrendPoint[];
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ data }) => {
  const { formatAmount } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          No expenses found for this period
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          Try selecting a wider date range or add a new expense to see your spending trends.
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.amount), 100);

  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col h-full transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Spending Over Time
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Expenditure progression for selected duration
          </p>
        </div>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatAmount(data[hoveredIndex].amount)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {data[hoveredIndex].date}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Bar Chart */}
      <div className="relative flex-1 flex items-end">
        <div className="w-full h-44 flex items-end gap-2 pt-4 px-1">
          {data.map((item, idx) => {
            const heightPercent = Math.max(8, (item.amount / maxVal) * 100);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                <div className="w-full max-w-[42px] flex flex-col justify-end h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isHovered
                        ? 'bg-indigo-600 dark:bg-indigo-400 shadow-xs'
                        : 'bg-indigo-200 dark:bg-indigo-900/80 hover:bg-indigo-300 dark:hover:bg-indigo-800'
                    }`}
                  />
                </div>

                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate w-full text-center font-mono">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
