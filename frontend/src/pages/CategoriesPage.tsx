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
import { CustomSelect } from '../components/ui/CustomSelect';

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
  const debouncedCustomStart = useDebounce(customStart, 300);
  const debouncedCustomEnd = useDebounce(customEnd, 300);

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
      customStartDate: debouncedCustomStart || undefined,
      customEndDate: debouncedCustomEnd || undefined,
      paidByUserId,
      sortBy,
      search: debouncedExpenseSearch,
    };
  }, [
    activeCategory?.id,
    statusTab,
    dateRange,
    debouncedCustomStart,
    debouncedCustomEnd,
    paidByUserId,
    sortBy,
    debouncedExpenseSearch,
  ]);

  const {
    expenses: categoryExpenses,
    isLoading: loadingExpenses,
    isValidating: validatingExpenses,
    mutateExpenses,
  } = useExpenses(activeCategory ? categoryFilters : undefined);

  // Check if current category data is actively loading or transitioning
  const isCategoryDataLoading =
    loadingExpenses ||
    (Boolean(activeCategory) &&
      ((validatingExpenses && categoryExpenses.length === 0) ||
        categoryExpenses.some(e => e.categoryId !== activeCategory?.id)));

  // Safeguard: only calculate totals and render items matching the active category ID
  const filteredCategoryExpenses = useMemo(() => {
    if (!activeCategory) return [];
    return categoryExpenses.filter(e => e.categoryId === activeCategory.id);
  }, [categoryExpenses, activeCategory?.id]);

  const filteredTotal = useMemo(() => {
    return filteredCategoryExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredCategoryExpenses]);

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

  const hasCategoryFilters = Boolean(
    expenseSearch ||
    dateRange !== 'all' ||
    customStart ||
    customEnd ||
    paidByUserId !== 'all' ||
    statusTab !== 'ALL'
  );

  const handleClearCategoryFilters = () => {
    setExpenseSearch('');
    setDateRange('all');
    setCustomStart('');
    setCustomEnd('');
    setPaidByUserId('all');
    setStatusTab('ALL');
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
              {isCategoryDataLoading && filteredCategoryExpenses.length === 0 ? (
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700/80 rounded-md animate-pulse mt-1.5" />
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredCategoryExpenses.length}{' '}
                  {filteredCategoryExpenses.length === 1 ? 'transaction' : 'transactions'} matching your filters
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 self-start sm:self-auto shadow-xs">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Filtered Total
              </span>
              {isCategoryDataLoading && filteredCategoryExpenses.length === 0 ? (
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700/80 rounded-md animate-pulse mt-1" />
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatAmount(filteredTotal)}
                  </span>
                  {(isCategoryDataLoading || validatingExpenses) && filteredCategoryExpenses.length > 0 && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  )}
                </div>
              )}
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
            <CustomSelect
              value={dateRange}
              onChange={val => setDateRange(val)}
              icon={<Calendar className="w-4 h-4" />}
              options={[
                { value: 'all', label: 'Date: All Time' },
                { value: 'week', label: 'Date: Past Week' },
                { value: 'month', label: 'Date: This Month' },
                { value: 'year', label: 'Date: This Year' },
                { value: 'custom', label: 'Date: Custom Range' },
              ]}
            />

            {/* 3. Paid By Filter */}
            <CustomSelect
              value={paidByUserId}
              onChange={val => setPaidByUserId(val === 'all' ? 'all' : Number(val))}
              icon={<UserIcon className="w-4 h-4" />}
              options={[
                { value: 'all', label: 'Paid By: Anyone' },
                ...registeredUsers.map(u => ({
                  value: u.id,
                  label: `Paid By: ${u.name}`,
                })),
              ]}
            />

            {/* 4. Sort By */}
            <CustomSelect
              value={sortBy}
              onChange={val => setSortBy(val)}
              icon={<ArrowUpDown className="w-4 h-4" />}
              options={[
                { value: 'newer', label: 'Sort: Newer to Older' },
                { value: 'older', label: 'Sort: Older to Newer' },
                { value: 'amount_high', label: 'Sort: Amount (High to Low)' },
                { value: 'amount_low', label: 'Sort: Amount (Low to High)' },
              ]}
            />
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

        {/* Category Expenses List with Persistent Background and Simple Overlay Loader */}
        {isCategoryDataLoading && filteredCategoryExpenses.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center py-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span>Loading category expenses...</span>
            </div>
          </div>
        ) : filteredCategoryExpenses.length === 0 ? (
          <div className="space-y-4">
            {hasCategoryFilters && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  No transactions match your current search or filter criteria.
                </span>
                <button
                  type="button"
                  onClick={handleClearCategoryFilters}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline self-start sm:self-auto cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}

            <div className="py-14 sm:py-16 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                No transactions found
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {hasCategoryFilters
                  ? `No expenses in ${activeCategory.name} match your filters.`
                  : `No recorded expenses under ${activeCategory.name} yet.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {/* Simple overlay loader on top of list when filtering/validating */}
            {(isCategoryDataLoading || validatingExpenses) && (
              <div className="absolute inset-0 z-20 flex items-start justify-center pt-16 bg-white/40 dark:bg-slate-900/40 rounded-2xl transition-opacity animate-in fade-in duration-150 pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <span>Loading category expenses...</span>
                </div>
              </div>
            )}
            {filteredCategoryExpenses.map(exp => {
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
                            Split ({(exp.participants || []).length}):{' '}
                            {(exp.participants || []).map(p => p?.name || p?.userName || 'Member').join(', ')}
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
                        {exp.status !== 'COMPLETED' && (
                          <button
                            onClick={() => onEditExpense(exp)}
                            disabled={isDeletingThis}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
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

        {/* Dimmed Overlay Loader when Deleting Category */}
        {isDeletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all duration-200 animate-in fade-in">
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => mutateCategories()}
            title="Refresh categories list via SWR"
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
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

        <CustomSelect
          value={categorySort}
          onChange={val => setCategorySort(val)}
          icon={<ArrowUpDown className="w-4 h-4" />}
          options={[
            { value: 'name', label: 'Sort Categories: Name (A - Z)' },
            { value: 'spend_high', label: 'Sort Categories: Highest Spend' },
            { value: 'count_high', label: 'Sort Categories: Most Expenses' },
          ]}
        />
      </div>

      {/* 3 Category Cards Per Row on Desktop/Tablet */}
      {loading && categories.length === 0 ? (
        <div className="min-h-[260px] flex items-center justify-center py-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span>Loading categories...</span>
          </div>
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

          <div className="p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Tag className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No categories found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Create a custom tag to track and split transactions across your groups
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
      {(() => {
        const hasLinkedExpenses = (deletingCategory?.expenseCount || 0) > 0;
        return (
          <ConfirmDialog
            isOpen={!!deletingCategory}
            title={
              hasLinkedExpenses
                ? `Cannot Delete Category "${deletingCategory?.name}"`
                : `Delete Category "${deletingCategory?.name}"?`
            }
            subtitle={
              hasLinkedExpenses
                ? 'Category has linked expenses'
                : 'Please confirm this action'
            }
            message={
              hasLinkedExpenses
                ? `You cannot delete this category because it currently has ${deletingCategory?.expenseCount} linked expense(s).\n\nPlease reassign or delete those expenses before removing this category.`
                : 'Are you sure you want to permanently delete this category? This action cannot be undone.'
            }
            confirmLabel={hasLinkedExpenses ? 'Okay' : 'Yes, Delete'}
            showCancel={!hasLinkedExpenses}
            tone={hasLinkedExpenses ? 'warning' : 'danger'}
            onConfirm={hasLinkedExpenses ? () => setDeletingCategory(null) : handleConfirmDelete}
            onCancel={() => setDeletingCategory(null)}
          />
        );
      })()}

      {/* Dimmed Overlay Loader when Deleting Category */}
      {isDeletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all duration-200 animate-in fade-in">
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
