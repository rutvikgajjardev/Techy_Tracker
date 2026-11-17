import React, { useState, useMemo } from 'react';
import { BarChart3, Tag } from 'lucide-react';
import { SpendingTrendPoint } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface SpendingTrendChartProps {
  data: SpendingTrendPoint[];
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ data }) => {
  const { formatAmount } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter out any invalid points
  const pointsData = useMemo(() => {
    if (!data) return [];
    return data.filter(d => d.amount > 0);
  }, [data]);

  // Max value calculation for Y axis scaling (giving 15% headroom above highest expense)
  const maxVal = useMemo(() => {
    if (pointsData.length === 0) return 100;
    const max = Math.max(...pointsData.map(d => d.amount));
    // Add headroom so amount labels on the highest bar don't hit the ceiling
    const target = max * 1.18;
    if (target <= 50) return 50;
    if (target <= 100) return 100;
    if (target <= 250) return 250;
    if (target <= 500) return 500;
    if (target <= 1000) return 1000;
    return Math.ceil(target / 500) * 500;
  }, [pointsData]);

  // 4 horizontal dashed guide lines
  const yTicks = useMemo(() => {
    return [
      Math.round(maxVal),
      Math.round(maxVal * 0.66),
      Math.round(maxVal * 0.33),
      0,
    ];
  }, [maxVal]);

  if (pointsData.length === 0) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          No expenses recorded yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
          Record your first expense to see individual transaction bars with date and time.
        </p>
      </div>
    );
  }

  // Maximum bars comfortably visible without scrolling (6 bars)
  const isScrollable = pointsData.length > 6;

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col h-full transition-colors relative">
      {/* Header: Permanent Expense Count Badge (Never changes on hover) */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            Transaction Bars
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Spending by Expense
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Individual bar for each recorded expense
          </p>
        </div>

        {/* Permanent Tag: NEVER replaced by hover */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 select-none">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>
              {pointsData.length} {pointsData.length === 1 ? 'Expense' : 'Expenses'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative flex-1 flex flex-col justify-end min-h-[220px]">
        {/* Background Y-Axis Dashed Guide Lines & Numerical Labels */}
        <div className="absolute inset-0 top-3 bottom-14 pointer-events-none flex flex-col justify-between">
          {yTicks.map((tickVal, i) => (
            <div key={i} className="flex items-center gap-2 w-full">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-9 text-right shrink-0 select-none">
                {tickVal === 0 ? '0' : `₹${tickVal}`}
              </span>
              <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-700/60" />
            </div>
          ))}
        </div>

        {/* Scrollable / Flexible Bar Track (Pl-11 for Y-axis label clearance) */}
        <div
          className={`relative z-10 w-full pl-11 overflow-y-visible ${
            isScrollable ? 'overflow-x-auto pb-2 scrollbar-thin' : 'overflow-x-visible'
          }`}
        >
          <div
            className={`flex items-end h-44 pt-8 px-2 ${
              isScrollable
                ? 'gap-5 justify-start min-w-max'
                : 'gap-3 sm:gap-4 justify-around w-full'
            }`}
          >
            {pointsData.map((item, idx) => {
              const heightPercent = Math.max(8, (item.amount / maxVal) * 100);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.id || idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex flex-col items-center h-full justify-end cursor-pointer group select-none relative ${
                    isScrollable ? 'w-14 shrink-0' : 'flex-1 min-w-[50px] max-w-[68px]'
                  }`}
                >
                  {/* Vertical Bar Container */}
                  <div className="w-full flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`relative w-full rounded-t-xl transition-all duration-200 ${
                        isHovered
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/50 scale-[1.02]'
                          : 'bg-gradient-to-t from-indigo-500/85 to-indigo-400/95 dark:from-indigo-600/85 dark:to-indigo-500/95 hover:from-indigo-600 hover:to-indigo-400'
                      }`}
                    >
                      {/* Floating Tooltip: Positioned DIRECTLY on top of THIS bar's height (No gap) */}
                      {isHovered && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700 shadow-xl backdrop-blur-xs whitespace-nowrap text-center max-w-[170px]">
                            <span className="font-bold text-xs block truncate text-white leading-tight">
                              {item.title || item.category || 'Expense'}
                            </span>
                            {item.category && (
                              <div className="inline-flex items-center gap-1 text-[10px] text-indigo-300 dark:text-indigo-400 mt-0.5">
                                <Tag className="w-2.5 h-2.5" />
                                <span className="truncate">{item.category}</span>
                              </div>
                            )}
                          </div>
                          {/* Downward triangle pointer touching top of the bar */}
                          <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 rotate-45 -mt-1 border-r border-b border-slate-700" />
                        </div>
                      )}

                      {/* Amount directly on top of the bar (hidden on hover so tooltip takes its place seamlessly) */}
                      <span
                        className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] font-mono font-bold whitespace-nowrap transition-colors select-none ${
                          isHovered
                            ? 'opacity-0'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ₹{Math.round(item.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Metadata: Line 1 = Date, Line 2 = Time (NO Expense Title at bottom) */}
                  <div className="mt-2 text-center flex flex-col items-center w-full">
                    {/* Line 1: Date */}
                    <span
                      className={`text-[11px] font-mono font-bold whitespace-nowrap transition-colors ${
                        isHovered
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {item.date}
                    </span>

                    {/* Line 2: Time */}
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                      {item.time || '12:00 PM'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scroll cue hint if more than 6 expenses */}
        {isScrollable && (
          <div className="text-right pt-1 pr-2">
            <span className="text-[10px] text-slate-400 font-medium">
              Scroll horizontally to see all {pointsData.length} expenses →
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
