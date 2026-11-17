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

  // Dynamic Nice Scale & Ticks calculation
  // Ensures clean round steps (e.g., 200, 400, 600) and gives the highest bar
  // an impressive, prominent height (~75% - 85% of chart height) with comfortable headroom.
  const { maxVal, yTicks } = useMemo(() => {
    if (pointsData.length === 0) {
      return { maxVal: 300, yTicks: [300, 200, 100, 0] };
    }

    const maxAmount = Math.max(...pointsData.map(d => d.amount));
    if (maxAmount <= 0) {
      return { maxVal: 300, yTicks: [300, 200, 100, 0] };
    }

    // Target ~15% headroom above highest expense so amount tags fit cleanly
    const target = maxAmount * 1.18;
    const rawStep = target / 3;

    // Find nearest nice step multiplier in base-10
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);

    let niceMultiplier = 1;
    if (fraction <= 1) niceMultiplier = 1;
    else if (fraction <= 2) niceMultiplier = 2;
    else if (fraction <= 2.5) niceMultiplier = 2.5;
    else if (fraction <= 5) niceMultiplier = 5;
    else niceMultiplier = 10;

    const step = Math.round(niceMultiplier * Math.pow(10, exponent));
    const calculatedMax = step * 3;

    const ticks = [
      calculatedMax,
      step * 2,
      step,
      0,
    ];

    return { maxVal: calculatedMax, yTicks: ticks };
  }, [pointsData]);

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
      <div className="relative flex-1 flex flex-col justify-end min-h-[250px]">
        {/* Background Y-Axis Dashed Guide Lines & Numerical Labels */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none flex flex-col justify-between">
          {yTicks.map((tickVal, i) => (
            <div key={i} className="flex items-center gap-2 w-full">
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 w-10 text-right shrink-0 select-none">
                {tickVal === 0 ? '0' : `₹${tickVal}`}
              </span>
              <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-700/70" />
            </div>
          ))}
        </div>

        {/* Scrollable / Flexible Bar Track (pl-12 for Y-axis label clearance) */}
        <div
          className={`relative z-10 w-full pl-12 overflow-y-visible ${
            isScrollable ? 'overflow-x-auto pb-2 scrollbar-thin' : 'overflow-x-visible'
          }`}
        >
          <div
            className={`flex items-start ${
              isScrollable
                ? 'gap-6 justify-start min-w-max'
                : 'gap-4 sm:gap-6 justify-around w-full'
            }`}
          >
            {pointsData.map((item, idx) => {
              const heightPercent = Math.max(6, (item.amount / maxVal) * 100);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.id || idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex flex-col items-center cursor-pointer group select-none relative ${
                    isScrollable ? 'w-16 shrink-0' : 'flex-1 min-w-[50px] max-w-[72px]'
                  }`}
                >
                  {/* Grid Bar Area: Exactly matching h-48 */}
                  <div className="w-full h-48 flex items-end justify-center relative">
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
                          <div className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800/95 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-950/60 backdrop-blur-xs whitespace-nowrap text-center max-w-[170px]">
                            <span className="font-bold text-xs block truncate text-slate-900 dark:text-white leading-tight">
                              {item.title || item.category || 'Expense'}
                            </span>
                            {item.category && (
                              <div className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.category}</span>
                              </div>
                            )}
                          </div>
                          {/* Downward triangle pointer touching top of the bar */}
                          <div className="w-2 h-2 bg-white/95 dark:bg-slate-800/95 rotate-45 -mt-1 border-r border-b border-slate-200 dark:border-slate-700 shadow-2xs" />
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
                  <div className="mt-2.5 text-center flex flex-col items-center w-full">
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
