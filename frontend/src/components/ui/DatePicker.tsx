import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';

interface DatePickerProps {
  value?: string; // Format: 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  id?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Parse 'YYYY-MM-DD' safely in local timezone without UTC offset drift
 */
function parseLocalDate(str?: string): Date | null {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Format local Date to 'YYYY-MM-DD'
 */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  error,
  required = false,
  minDate,
  maxDate,
  className = '',
  disabled = false,
  align = 'left',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active view month & year in calendar popup
  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const initialView = selectedDate || new Date();
  const [viewYear, setViewYear] = useState<number>(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialView.getMonth());

  // Update view month/year whenever value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Handle clicking outside to close calendar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close calendar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Jump to Today
  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const todayStr = formatLocalDate(today);
    onChange(todayStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Clear Date
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Build calendar matrix (42 cells: previous, current, next month days)
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = formatLocalDate(new Date());

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const str = formatLocalDate(d);
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === value,
        isDisabled: Boolean((minDate && str < minDate) || (maxDate && str > maxDate)),
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      const str = formatLocalDate(dt);
      days.push({
        date: dt,
        dateStr: str,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isSelected: str === value,
        isDisabled: Boolean((minDate && str < minDate) || (maxDate && str > maxDate)),
      });
    }

    // 3. Next month leading days (fill remaining of 42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(viewYear, viewMonth + 1, d);
      const str = formatLocalDate(dt);
      days.push({
        date: dt,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === value,
        isDisabled: Boolean((minDate && str < minDate) || (maxDate && str > maxDate)),
      });
    }

    return days;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  // Formatted display text (e.g. "Thu, 29 Oct 2026")
  const formattedDisplay = useMemo(() => {
    if (!selectedDate) return '';
    try {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return value || '';
    }
  }, [selectedDate, value]);

  // Available years list for quick dropdown (past 10 years to next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 15; y <= currentYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-indigo-600 dark:text-indigo-400">*</span>}
        </label>
      )}

      {/* Date Picker Input Trigger Box */}
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between gap-2.5 text-xs sm:text-sm transition-all select-none cursor-pointer ${
          error
            ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
            : isOpen
            ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          {formattedDisplay ? (
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {formattedDisplay}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        {/* Right Action Icons: Clear (if value exists) or Dropdown indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {value && !required && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}

      {/* Custom Tailwind Calendar Popover Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className={`absolute z-50 mt-1.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 w-[304px] animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Calendar Header: Month/Year Selector & Previous/Next Buttons */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next Month Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous month"
                aria-label="Previous month"
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next month"
                aria-label="Next month"
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Su, Mo, Tu, We, Th, Fr, Sa) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_NAMES.map(day => (
              <span
                key={day}
                className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-0.5 select-none"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid (42 cells: 7x6) */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const dayNumber = cell.date.getDate();

              let cellStyle =
                'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300';

              if (!cell.isCurrentMonth) {
                cellStyle = 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40';
              }

              if (cell.isSelected) {
                cellStyle =
                  'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105 hover:bg-indigo-700';
              } else if (cell.isToday) {
                cellStyle += ' ring-1.5 ring-indigo-500 font-bold text-indigo-600 dark:text-indigo-400';
              }

              if (cell.isDisabled) {
                cellStyle = 'text-slate-200 dark:text-slate-700 cursor-not-allowed opacity-40 pointer-events-none';
              }

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => {
                    onChange(cell.dateStr);
                    setIsOpen(false);
                  }}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer font-mono ${cellStyle}`}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions: Today & Clear */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={handleTodayClick}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

