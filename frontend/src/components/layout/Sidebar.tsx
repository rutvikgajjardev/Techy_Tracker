import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Tag,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Sun,
  Moon,
  Copy,
  Check,
  Edit2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiService } from '../../services/api';
import { TechyTrackerLogo } from '../ui/TechyTrackerLogo';

export type NavigationTab = 'dashboard' | 'expenses' | 'categories';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRequestLogout: () => void;
  onOpenProfile?: () => void;
  onOpenChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onRequestLogout,
  onOpenProfile,
  onOpenChangePassword,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const footerButtonRef = useRef<HTMLDivElement>(null);

  // Inline UPI editing state
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiInput, setUpiInput] = useState(currentUser?.upi_id || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [upiError, setUpiError] = useState('');

  // Keep UPI input synced with currentUser
  useEffect(() => {
    setUpiInput(currentUser?.upi_id || '');
    setIsEditingUpi(false);
    setUpiError('');
  }, [currentUser?.upi_id, isSettingsOpen]);

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError('');
    const cleaned = upiInput.trim();
    if (cleaned && !cleaned.includes('@')) {
      setUpiError('Enter a valid UPI ID (e.g. name@upi)');
      return;
    }
    setIsSavingUpi(true);
    try {
      await updateProfile({ upi_id: cleaned || null });
      setIsEditingUpi(false);
    } catch (err: any) {
      setUpiError(err.message || 'Failed to update UPI ID');
    } finally {
      setIsSavingUpi(false);
    }
  };

  // Close Settings Popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        footerButtonRef.current &&
        !footerButtonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Close settings on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  const handleCopyUpi = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.upi_id) {
      navigator.clipboard.writeText(currentUser.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'expenses' as NavigationTab,
      label: 'Expenses',
      icon: Receipt,
    },
    {
      id: 'categories' as NavigationTab,
      label: 'Categories',
      icon: Tag,
    },
  ];

  const userInitial = (currentUser?.name || 'User').charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop when expanded on mobile devices */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Circular Toggle Button (< and >) centered exactly at the cross line intersection */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-[50px] z-50 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>

        {/* Top Brand Header:
            - When Collapsed (w-20): Centered purple App Logo ONLY (no text)
            - When Expanded (w-64): Logo + "Techy Tracker" text */}
        <div
          className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${
            isCollapsed ? 'justify-center px-0' : 'justify-start px-5 gap-3'
          }`}
        >
          <TechyTrackerLogo className="w-8 h-8 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden transition-opacity duration-200">
              Techy Tracker
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (window.innerWidth < 1024 && !isCollapsed) {
                      onToggleCollapse();
                    }
                  }}
                  aria-label={item.label}
                  title={isCollapsed ? item.label : undefined}
                  className={`cursor-pointer transition-all duration-200 flex items-center rounded-xl ${
                    isCollapsed
                      ? 'w-11 h-11 mx-auto justify-center'
                      : 'w-full gap-3 px-3.5 py-2.5 text-sm font-medium'
                  } ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  )}
                </button>

                {/* Hover Tooltip when Collapsed */}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom User Section Footer:
            - When Collapsed (w-20): Centered circular User Initial Avatar ONLY (no name, no UPI, no logout button)
            - When Expanded (w-64): Avatar + Name + Settings Gear Icon (no direct UPI text, no direct logout button) */}
        {currentUser && (
          <div
            ref={footerButtonRef}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 relative"
          >
            {isCollapsed ? (
              // Collapsed state: Avatar only centered
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  title={`${currentUser.name || 'User'} • Click for Settings`}
                  aria-label="User settings & profile"
                  className={`w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm transition-all cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-offset-2 dark:ring-offset-slate-900 ${
                    isSettingsOpen
                      ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                      : ''
                  }`}
                >
                  {userInitial}
                </button>
              </div>
            ) : (
              // Expanded state: Avatar + User Name + Settings Gear Button
              <div className="flex items-center justify-between gap-2.5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setIsSettingsOpen(prev => !prev);
                  }}
                  title="Click to open Settings & Profile"
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group select-none"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {userInitial}
                  </div>
                  <div className="truncate min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {currentUser.name || 'User'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {currentUser.email || 'Logged In'}
                    </p>
                  </div>
                </div>

                {/* Settings Gear Icon Button */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  title="Settings & Preferences"
                  aria-label="Settings"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isSettingsOpen
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isSettingsOpen ? 'rotate-90 text-indigo-600 dark:text-indigo-400' : ''
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Settings Popover / Dropdown Menu:
                A clean, unified menu positioned directly above the settings footer button
                with consistent UI cards for UPI, Theme, Password, and Logout */}
            {isSettingsOpen && (
              <div
                ref={settingsRef}
                className={`absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 space-y-2 transition-all animate-in fade-in zoom-in-95 duration-150 ${
                  isCollapsed
                    ? 'bottom-2 left-[calc(100%+12px)] w-72 shadow-2xl'
                    : 'bottom-[calc(100%+10px)] left-2 right-2 w-auto shadow-2xl'
                }`}
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                      {userInitial}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Common UI Menu List */}
                <div className="space-y-1.5">
                  {/* Item 1: UPI ID with user-friendly inline edit form */}
                  {isEditingUpi ? (
                    <form
                      onSubmit={handleSaveUpi}
                      className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-2 transition-all animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Edit UPI ID
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">e.g. name@upi</span>
                      </div>

                      <input
                        type="text"
                        value={upiInput}
                        onChange={e => {
                          setUpiInput(e.target.value);
                          if (upiError) setUpiError('');
                        }}
                        placeholder="yourname@okhdfcbank"
                        autoFocus
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      {upiError && (
                        <p className="text-[10px] font-medium text-rose-500 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{upiError}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingUpi(false);
                            setUpiError('');
                          }}
                          disabled={isSavingUpi}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingUpi}
                          className="px-3 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSavingUpi ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <span>Save UPI</span>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              UPI ID
                            </p>
                            {currentUser.upi_id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active UPI ID" />
                            )}
                          </div>
                          <p
                            className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate"
                            title={currentUser.upi_id || 'Not configured'}
                          >
                            {currentUser.upi_id || 'Not configured'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {currentUser.upi_id && (
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            title={copiedUpi ? 'Copied!' : 'Copy UPI ID'}
                            aria-label="Copy UPI ID"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            {copiedUpi ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUpiInput(currentUser.upi_id || '');
                            setIsEditingUpi(true);
                          }}
                          title="Edit UPI ID"
                          aria-label="Edit UPI ID"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Item 2: Dark Theme Toggle */}
                  <div className="p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Dark Theme
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={theme === 'dark'}
                      onClick={toggleTheme}
                      title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                      aria-label="Toggle theme mode"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className="sr-only">Toggle dark theme</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Item 3: Change Password */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onOpenChangePassword?.();
                    }}
                    className="w-full p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all flex items-center justify-between gap-2 cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Change Password
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Verify current & set new password
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                  </button>

                  {/* Item 4: Logout Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onRequestLogout();
                    }}
                    className="w-full p-2 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 transition-all flex items-center justify-between gap-2 cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-100/70 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Logout
                        </p>
                        <p className="text-[11px] text-rose-400/80 dark:text-rose-400/60 truncate">
                          Sign out of your session
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
