import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useHealth } from '../../hooks/useApi';

interface HeaderProps {
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isHealthy } = useHealth();

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 sticky top-0 z-30 transition-colors">
      {/* Left Zone: Backend Live Indicator Badge (No 3-line menu button, No duplicate logo/text) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          title={isHealthy ? 'Backend API connected and monitored via SWR' : 'Connecting to Backend API...'}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            isHealthy
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-medium">{isHealthy ? 'Backend Live (SWR)' : 'Connecting API...'}</span>
        </div>
      </div>

      {/* Right Zone: User Greeting (Hi, username) + Theme Quick Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {currentUser && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium max-w-[180px] sm:max-w-none truncate flex items-center gap-1.5 select-none">
            <span className="text-slate-400 dark:text-slate-500 text-xs">Hi,</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {currentUser?.name || 'User'}
            </span>
          </div>
        )}

        {/* Header Theme Quick Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200" />
          )}
        </button>
      </div>
    </header>
  );
};
