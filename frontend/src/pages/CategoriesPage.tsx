import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Receipt,
  Search,
  Calendar,
  User as UserIcon,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Category, Expense, ExpenseFilters } from '../types';
import { apiService } from '../services/api';
import { useCategories, useExpenses, useAppMutations } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { ConfirmDialog } from '../components/ui/Dialog';
import { DatePicker } from '../components/ui/DatePicker';

const CATEGORY_PRESETS = [
  { name: 'Food & Dining', emoji: '🍔' },
  { name: 'Groceries', emoji: '🛒' },
  { name: 'Travel & Trips', emoji: '✈️' },
  { name: 'Utilities & Bills', emoji: '💡' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Health & Medical', emoji: '🏥' },
  { name: 'Transport & Fuel', emoji: '🚗' },
  { name: 'Rent & Housing', emoji: '🏠' },
  { name: 'Fitness & Gym', emoji: '🏋️' },
  { name: 'Education', emoji: '🎓' },
  { name: 'Personal Care', emoji: '✨' },
];

interface CategoriesPageProps {
  onNotify: (type: 'success' | 'error', message: string) => void;
  onSelectExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
  onOpenNewExpense?: () => void;
  deletingExpenseId?: number | null;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  onNotify,
  onSelectExpense,
  onEditExpense,
  onRequestDeleteExpense,
  onOpenNewExpense,
  deletingExpenseId = null,
}) => {
  const { formatAmount } = useTheme();
  const { currentUser, registeredUsers } = useAuth();
  const { invalidateExpenses } = useAppMutations();

  // SWR Hook for categories
  const { categories, isLoading: loading, mutateCategories } = useCategories();

  // Main Category Grid Search & Sort State
  const [categorySearch, setCategorySearch] = useState('');
  const debouncedCategorySearch = useDebounce(categorySearch, 200);
  const [categorySort, setCategorySort] = useState<'name' | 'spend_high' | 'count_high'>('name');

  // Category-Wise Expense Drill-down State
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  // Category-Wise Expense Filters State (Search, Date, Paid By, Sort, Status)
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [dateRange, setDateRange] = useState<'all' | 'year' | 'month' | 'week' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paidByUserId, setPaidByUserId] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newer' | 'older' | 'amount_high' | 'amount_low'>('newer');
  const [expenseSearch, setExpenseSearch] = useState('');
  const debouncedExpenseSearch = useDebounce(expenseSearch, 350);

  // In-Page Category Form State (Replaces popup modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formCategoryName, setFormCategoryName] = useState('');
  const [formError, setFormError] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Delete Dialog State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // SWR Category Expenses Drill-down Query
  const categoryFilters: Partial<ExpenseFilters> | undefined = useMemo(() => {
    if (!activeCategory) return undefined;
    return {
      status: statusTab,
      categoryId: activeCategory.id,
      dateRange,
      customStartDate: customStart || undefined,
      customEndDate: customEnd || undefined,
      paidByUserId,
      sortBy,
      search: debouncedExpenseSearch,
    };
  }, [
    activeCategory?.id,
    statusTab,
    dateRange,
    customStart,
    customEnd,
    paidByUserId,
    sortBy,
    debouncedExpenseSearch,
  ]);

  const { expenses: categoryExpenses, isLoading: loadingExpenses, mutateExpenses } = useExpenses(
    activeCategory ? categoryFilters : undefined
  );

  // Keep active category details fresh from categories SWR cache
  useEffect(() => {
    if (activeCategory && categories.length > 0) {
      const refreshed = categories.find(c => c.id === activeCategory.id);
      if (refreshed) {
        setActiveCategory(refreshed);
      }
    }
  }, [categories, activeCategory?.id]);

  const handleSelectCategoryCard = (cat: Category) => {
    setStatusTab('ALL');
    setDateRange('all');
    setCustomStart('');
    setCustomEnd('');
    setPaidByUserId('all');
    setSortBy('newer');
    setExpenseSearch('');
    setActiveCategory(cat);
  };

  const handleOpenAdd = () => {
    setActiveCategory(null);
    setEditingCategory(null);
    setFormCategoryName('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setActiveCategory(null);
    setEditingCategory(cat);
    setFormCategoryName(cat.name);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormCategoryName('');
    setFormError('');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmed = formCategoryName.trim();
    if (!trimmed) {
      setFormError('Please enter a category name.');
      return;
    }

    setIsFormSubmitting(true);
    try {
      if (editingCategory) {
        await apiService.updateCategory(editingCategory.id, { name: trimmed });
        onNotify('success', `Category "${trimmed}" updated successfully.`);
      } else {
        await apiService.createCategory({ name: trimmed });
        onNotify('success', `Category "${trimmed}" created successfully.`);
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      setFormCategoryName('');
      await mutateCategories();
      invalidateExpenses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category. Please try again.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleRequestDeleteCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setDeletingCategory(cat);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    const catToDelete = deletingCategory;
    setDeletingCategory(null);
    setIsDeletingCategory(true);
    try {
      await apiService.deleteCategory(catToDelete.id);
      onNotify('success', `Category "${catToDelete.name}" deleted.`);
      if (activeCategory?.id === catToDelete.id) {
        setActiveCategory(null);
      }
      await mutateCategories();
      invalidateExpenses();
    } catch (err: any) {
      onNotify('error', err.message || 'Cannot delete category.');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const filteredCategories = useMemo(() => {
    let list = [...categories];
    if (debouncedCategorySearch.trim()) {
      const q = debouncedCategorySearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (categorySort === 'spend_high') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (categorySort === 'count_high') return (b.expenseCount || 0) - (a.expenseCount || 0);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [categories, debouncedCategorySearch, categorySort]);

  // =========================================================
  // VIEW 1: In-Page Add / Edit Category Form (Replaces popup modal)
  // =========================================================
  if (isFormOpen) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header with Arrow-only Back Button in front of heading */}
        <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCloseForm}
            title="Back to Categories"
            aria-label="Back to Categories"
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Categories
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure budgeting tags to categorize and filter your personal and shared expenses
            </p>
          </div>
        </div>

        {/* Proper Form Card - Matching modern in-page card layout */}
        <div className="w-full max-w-xl mx-auto my-4 sm:my-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 sm:p-8 transition-colors">
            {/* Form Header */}
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/80">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center shrink-0 shadow-2xs">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingCategory ? 'Edit Category Details' : 'New Personal Category'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingCategory
                    ? `Update properties for "${editingCategory.name}"`
                    : 'Enter category name or choose from quick preset suggestions below'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCategoryName}
                  onChange={e => {
                    setFormCategoryName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Travel, Groceries, Fitness, Dining Out"
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Transactions will be categorized under this title for charts and ledger summaries.
                </p>
              </div>

              {/* Quick Preset Chips */}
              {!editingCategory && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Popular Suggestions (Click to fill)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_PRESETS.map(preset => {
                      const isSelected = formCategoryName.toLowerCase() === preset.name.toLowerCase();
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setFormCategoryName(preset.name);
                            if (formError) setFormError('');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-700 dark:text-indigo-300 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{preset.emoji}</span>
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFormSubmitting || !formCategoryName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isFormSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Category...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: Category-Wise Expense View (When a card is clicked)
  // Includes full Search & Filter Bar (Search, Date, Paid By, Sort)
  // =========================================================
  if (activeCategory) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Back Navigation & Category Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              title="Back to Categories"
              aria-label="Back to Categories"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeCategory.name} Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {categoryExpenses.length}{' '}
                {categoryExpenses.length === 1 ? 'transaction' : 'transactions'} matching your filters
              </p>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 self-start sm:self-auto shadow-xs">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Filtered Total
              </span>
              <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {formatAmount(
                  categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Status Tabs: All, Pending, Completed */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map(tab => {
            const isActive = statusTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar inside Category View (Search, Date, Paid By, Sort) */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Search Box with Debounce & Clear */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                placeholder={`Search in ${activeCategory.name}...`}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {expenseSearch && (
                <button
                  type="button"
                  onClick={() => setExpenseSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Date Filter */}
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Date: All Time</option>
                <option value="week">Date: Past Week</option>
                <option value="month">Date: This Month</option>
                <option value="year">Date: This Year</option>
                <option value="custom">Date: Custom Range</option>
              </select>
            </div>

            {/* 3. Paid By Filter */}
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={paidByUserId}
                onChange={e =>
                  setPaidByUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Paid By: Anyone</option>
                {registeredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    Paid By: {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Sort By */}
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newer">Sort: Newer to Older</option>
                <option value="older">Sort: Older to Newer</option>
                <option value="amount_high">Sort: Amount (High to Low)</option>
                <option value="amount_low">Sort: Amount (Low to High)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers (Responsive Mobile Grid) */}
          {dateRange === 'custom' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        {/* Category Expenses List */}
        {loadingExpenses ? (
          <div className="space-y-4 animate-pulse" role="status" aria-label="Loading category expenses">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/70 shrink-0" />
                  <div className="space-y-2.5">
                    <div className="w-24 h-4 rounded-full bg-slate-200 dark:bg-slate-700/70" />
                    <div className="w-48 sm:w-64 h-5 rounded-md bg-slate-200 dark:bg-slate-700/70" />
                    <div className="w-36 sm:w-48 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700/70" />
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-5 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/80 shrink-0">
                  <div className="space-y-2 text-right">
                    <div className="w-24 h-6 rounded-md bg-slate-200 dark:bg-slate-700/70 ml-auto" />
                    <div className="w-16 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700/70 ml-auto" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700/70" />
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : categoryExpenses.length === 0 ? (
          <div className="space-y-4">
            <div
              onClick={() => onOpenNewExpense?.()}
              className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[220px] shadow-2xs hover:shadow-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 flex items-center justify-center shadow-2xs transition-all mb-3.5">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Add New Expense
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">
                Record an expense under "{activeCategory.name}" to track spending and split transactions
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryExpenses.map(exp => {
              const isDeletingThis = deletingExpenseId === exp.id;
              const dateObj = new Date(exp.expenseDate);
              const dayNum = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
              const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
              const yearNum = dateObj.getFullYear();
              const perPerson = exp.amount / (exp.participants.length || 1);

              return (
                <div
                  key={exp.id}
                  onClick={() => !isDeletingThis && onSelectExpense(exp)}
                  className={`p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-xs cursor-pointer group ${
                    isDeletingThis
                      ? 'border-rose-400 dark:border-rose-800 ring-2 ring-rose-400/30 opacity-60 pointer-events-none scale-[0.995]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                    <div className="flex items-start gap-3.5 sm:gap-5 flex-1 min-w-0">
                      {/* Date Tile */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 text-center">
                        <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 leading-none">
                          {monthShort}
                        </span>
                        <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white leading-tight mt-0.5 tabular-nums">
                          {dayNum}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 leading-none">
                          {yearNum}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              exp.status === 'COMPLETED'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {exp.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {exp.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors break-words">
                          {exp.title}
                        </h3>

                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            Paid by{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {exp.paidByName}
                            </strong>
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span>
                            Split ({exp.participants.length}):{' '}
                            {exp.participants.map(p => p.name).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-between lg:justify-end gap-5 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/80 shrink-0"
                    >
                      <div className="text-left lg:text-right">
                        <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums block">
                          {formatAmount(exp.amount)}
                        </span>
                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                          {formatAmount(perPerson)} / person
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditExpense(exp)}
                          disabled={isDeletingThis}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit expense"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentUser?.id === exp.createdById && (
                          <button
                            type="button"
                            onClick={() => onRequestDeleteExpense(exp)}
                            disabled={isDeletingThis}
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            title={isDeletingThis ? 'Deleting expense...' : 'Delete expense'}
                          >
                            {isDeletingThis ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => onSelectExpense(exp)}
                          disabled={isDeletingThis}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50"
                          title="View details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dimmed/Blurred Overlay Loader when Deleting Category */}
        {isDeletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
            <div className="p-6 sm:p-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center gap-3.5 max-w-xs w-full text-center mx-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Deleting category...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please wait while we update your categories
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // VIEW 2: Main Personal Categories Grid (3 cards per row)
  // =========================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Personal Categories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any category card to view and filter its expenses
          </p>
        </div>
      </div>

      {/* Category Search & Sort Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={categorySearch}
            onChange={e => setCategorySearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {categorySearch && (
            <button
              type="button"
              onClick={() => setCategorySearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={categorySort}
            onChange={e => setCategorySort(e.target.value as any)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="name">Sort Categories: Name (A - Z)</option>
            <option value="spend_high">Sort Categories: Highest Spend</option>
            <option value="count_high">Sort Categories: Most Expenses</option>
          </select>
        </div>
      </div>

      {/* 3 Category Cards Per Row on Desktop/Tablet */}
      {loading && categories.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between h-48 animate-pulse"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700/70" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-4 rounded bg-slate-200 dark:bg-slate-700/70" />
                      <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-700/70" />
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/70" />
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-700/70" />
                  <div className="w-28 h-6 rounded bg-slate-200 dark:bg-slate-700/70" />
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <div className="w-28 h-3.5 rounded bg-slate-200 dark:bg-slate-700/70" />
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
                  <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="space-y-4">
          {categorySearch && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                No categories match your search for "{categorySearch}".
              </span>
              <button
                type="button"
                onClick={() => setCategorySearch('')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline self-start sm:self-auto cursor-pointer"
              >
                Clear search
              </button>
            </div>
          )}

          <div
            onClick={handleOpenAdd}
            className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[220px] shadow-2xs hover:shadow-md max-w-lg mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 flex items-center justify-center shadow-2xs transition-all mb-3.5">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Add New Category
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">
              Create a custom tag to track and split transactions across your groups
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Add New Category Action Card (Always prominently visible in grid) */}
          <div
            onClick={handleOpenAdd}
            className="p-5 sm:p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[190px] shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 flex items-center justify-center shadow-2xs transition-all mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Add New Category
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
              Create a tag to track and split transactions
            </p>
          </div>

          {filteredCategories.map(cat => {
            const count = cat.expenseCount || 0;
            const totalSpent = cat.totalSpent || 0;

            return (
              <div
                key={cat.id}
                onClick={() => handleSelectCategoryCard(cat)}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/80 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {cat.name}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {count} {count === 1 ? 'expense' : 'expenses'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 block">
                      Total Spent
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                      {formatAmount(totalSpent)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                    View category expenses
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => handleOpenEdit(e, cat)}
                      title="Edit Category"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={e => handleRequestDeleteCategory(e, cat)}
                      title={
                        count > 0
                          ? `Cannot delete: assigned to ${count} expense(s)`
                          : 'Delete Category'
                      }
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        title={`Delete Category "${deletingCategory?.name}"?`}
        message={
          (deletingCategory?.expenseCount || 0) > 0
            ? `Warning: This category has ${deletingCategory?.expenseCount} linked expenses! Please reassign or delete those expenses before removing this category.`
            : 'Are you sure you want to permanently delete this category? This action cannot be undone.'
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCategory(null)}
      />

      {/* Dimmed/Blurred Overlay Loader when Deleting Category */}
      {isDeletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
          <div className="p-6 sm:p-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center gap-3.5 max-w-xs w-full text-center mx-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Deleting category...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please wait while we update your categories
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
