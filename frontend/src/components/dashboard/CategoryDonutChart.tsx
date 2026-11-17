import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { CategoryDistribution } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface CategoryDonutChartProps {
  data: CategoryDistribution[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data }) => {
  const { formatAmount } = useTheme();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5">
          <PieChart className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          No category breakdown for this period
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          Add a new expense or choose a wider date range to see where your money goes.
        </p>
      </div>
    );
  }

  let cumulativeAngle = 0;
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const segments = data.map((item, index) => {
    const percentage = item.value / total;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += percentage;

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  const highlightedItem = activeSegment !== null ? segments[activeSegment] : null;

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col h-full transition-colors relative">
      {/* Header: Symmetrical to SpendingTrendChart with Total Categories Tag */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            Category Breakdown
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Category Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personal & shared spending across categories
          </p>
        </div>

        {/* Permanent Tag of total categories matching SpendingTrendChart */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 select-none">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>
              {data.length} {data.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto pt-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-slate-700"
            />
            {segments.map(seg => (
              <circle
                key={seg.name}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={activeSegment === seg.index ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onMouseEnter={() => setActiveSegment(seg.index)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            ))}
          </svg>

          {/* Center Info Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[90px]">
              {highlightedItem ? highlightedItem.name : 'Total'}
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatAmount(highlightedItem ? highlightedItem.value : total, 0)}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
              {highlightedItem ? `${highlightedItem.percentage}%` : `${data.length} categories`}
            </span>
          </div>
        </div>

        {/* Legend with Smooth Scrolling Option for Many Categories */}
        <div className="flex-1 w-full flex flex-col justify-between">
          <div className="space-y-2 overflow-y-auto max-h-48 pr-1.5 scrollbar-thin">
            {segments.map(seg => {
              const isSelected = activeSegment === seg.index;
              return (
                <div
                  key={seg.name}
                  onMouseEnter={() => setActiveSegment(seg.index)}
                  onMouseLeave={() => setActiveSegment(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-700 font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-200 truncate">
                      {seg.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {seg.percentage}%
                    </span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold tabular-nums">
                      {formatAmount(seg.value, 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrolling hint if more than 4 categories */}
          {data.length > 4 && (
            <div className="text-right pt-1.5 pr-1">
              <span className="text-[10px] text-slate-400 font-medium select-none">
                Scroll to view all {data.length} categories ↓
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
