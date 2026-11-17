import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  Calculator,
  AlertCircle,
  UploadCloud,
  Camera,
  Plus,
  Eye,
  Loader2,
  Receipt,
  X,
  ArrowLeft,
  RotateCcw,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { Expense, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiService } from '../../services/api';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { DatePicker } from '../ui/DatePicker';
import { CustomSelect } from '../ui/CustomSelect';

interface ExpenseFormProps {
  onBack: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    amount: number;
    categoryId?: number;
    categoryName?: string;
    paidById: number;
    participantUserIds: number[];
    expenseDate?: string;
    images?: string[];
  }) => Promise<void>;
  categories: Category[];
  initialData?: Expense | null;
}

interface ExpenseFieldErrors {
  title?: string;
  amount?: string;
  category?: string;
  expenseDate?: string;
  participants?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onBack,
  onSubmit,
  categories,
  initialData,
}) => {
  const { currentUser, registeredUsers } = useAuth();
  const { formatAmount } = useTheme();

  const defaultUserId = currentUser?.id || registeredUsers[0]?.id || 1;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialData?.categoryId || null);
  const [categoryInput, setCategoryInput] = useState<string>(
    initialData ? (categories.find(c => c.id === initialData.categoryId)?.name || initialData.categoryName || '') : ''
  );
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryComboboxRef = useRef<HTMLDivElement>(null);

  const [paidById, setPaidById] = useState<number>(defaultUserId);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([defaultUserId]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingPreviews, setUploadingPreviews] = useState<string[]>([]);
  const [previewViewerIndex, setPreviewViewerIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({});
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!initialData;
  const currentUserId = currentUser?.id;
  const numPaidById = Number(paidById);

  // Close category combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryComboboxRef.current &&
        !categoryComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Category filtering & exact match detection
  const filteredCategories = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(query));
  }, [categories, categoryInput]);

  const exactCategoryMatch = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return null;
    return categories.find(c => c.name.trim().toLowerCase() === query) || null;
  }, [categories, categoryInput]);

  const handleCategoryInputChange = (val: string) => {
    setCategoryInput(val);
    setIsCategoryDropdownOpen(true);
    if (fieldErrors.category) {
      setFieldErrors(prev => ({ ...prev, category: undefined }));
    }
    const query = val.trim().toLowerCase();
    const match = categories.find(c => c.name.trim().toLowerCase() === query);
    if (match) {
      setSelectedCategoryId(match.id);
    } else {
      setSelectedCategoryId(null);
    }
  };

  const handleSelectCategory = (cat: Category) => {
    setCategoryInput(cat.name);
    setSelectedCategoryId(cat.id);
    setIsCategoryDropdownOpen(false);
    if (fieldErrors.category) {
      setFieldErrors(prev => ({ ...prev, category: undefined }));
    }
  };

  // Mandatory locked user IDs:
  // - If logged-in user is payer -> only logged-in user is locked
  // - If another user is payer -> BOTH logged-in user and that payer are locked
  const mandatoryUserIds = useMemo(() => {
    const list: number[] = [];
    if (currentUserId) {
      list.push(currentUserId);
    }
    if (numPaidById && !list.includes(numPaidById)) {
      list.push(numPaidById);
    }
    return list;
  }, [currentUserId, numPaidById]);

  // Combined selected list ensuring mandatory users are always included
  const effectiveSelectedUserIds = useMemo(() => {
    const set = new Set([...selectedUserIds, ...mandatoryUserIds]);
    return Array.from(set);
  }, [selectedUserIds, mandatoryUserIds]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setAmount(String(initialData.amount));
      setSelectedCategoryId(initialData.categoryId || null);
      const matchedCat = categories.find(c => c.id === initialData.categoryId);
      setCategoryInput(matchedCat ? matchedCat.name : (initialData.categoryName || ''));
      setPaidById(initialData.paidById);
      setSelectedUserIds(initialData.participants.map(p => p.userId));
      setExpenseDate(initialData.expenseDate.slice(0, 10));
      setImages(initialData.images || []);
    } else {
      setTitle('');
      setDescription('');
      setAmount('');
      setSelectedCategoryId(null);
      setCategoryInput('');
      const initialPayer = defaultUserId;
      setPaidById(initialPayer);

      const initialMandatory = currentUser?.id
        ? (initialPayer === currentUser.id ? [currentUser.id] : [currentUser.id, initialPayer])
        : [initialPayer];
      setSelectedUserIds(initialMandatory);

      setExpenseDate(new Date().toISOString().slice(0, 10));
      setImages([]);
    }
    setFieldErrors({});
    setErrorMsg('');
    setIsCategoryDropdownOpen(false);
  }, [initialData, defaultUserId, categories, currentUser?.id]);

  const handleClearForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    const firstCat = categories[0];
    setSelectedCategoryId(firstCat ? firstCat.id : null);
    setCategoryInput(firstCat ? firstCat.name : '');
    setPaidById(defaultUserId);
    const initialMandatory = currentUser?.id
      ? (defaultUserId === currentUser.id ? [currentUser.id] : [currentUser.id, defaultUserId])
      : [defaultUserId];
    setSelectedUserIds(initialMandatory);
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setImages([]);
    setFieldErrors({});
    setErrorMsg('');
    setIsCategoryDropdownOpen(false);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const splitCount = effectiveSelectedUserIds.length || 1;
  const perPersonShare = parsedAmount > 0 ? parsedAmount / splitCount : 0;

  const handlePaidByChange = (newPayerId: number) => {
    setPaidById(newPayerId);
    setSelectedUserIds(prev => {
      const updated = new Set(prev);
      if (currentUserId) updated.add(currentUserId);
      updated.add(newPayerId);
      return Array.from(updated);
    });
    setFieldErrors(prev => ({ ...prev, participants: undefined }));
  };

  const toggleUserParticipation = (uid: number) => {
    if (mandatoryUserIds.includes(uid)) {
      return;
    }
    setSelectedUserIds(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      } else {
        return [...prev, uid];
      }
    });
    setFieldErrors(prev => ({ ...prev, participants: undefined }));
    setErrorMsg('');
  };

  const isAllSelected =
    registeredUsers.length > 0 &&
    registeredUsers.every(u => effectiveSelectedUserIds.includes(u.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds(mandatoryUserIds);
    } else {
      setSelectedUserIds(registeredUsers.map(u => u.id));
    }
    setFieldErrors(prev => ({ ...prev, participants: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: ExpenseFieldErrors = {};

    if (!title.trim()) {
      errors.title = 'Please enter an expense title.';
    }

    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than ₹0.';
    }

    if (!categoryInput.trim()) {
      errors.category = 'Please enter or select a category.';
    }

    if (!expenseDate) {
      errors.expenseDate = 'Please select an expense date.';
    }

    if (effectiveSelectedUserIds.length === 0) {
      errors.participants = 'Please select at least one member to split this expense.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatFriendlyUploadError = (rawMsg: string): string => {
    if (!rawMsg) return 'Failed to upload bill photo.';
    const match = rawMsg.match(/File size too large\.\s*Got\s*(\d+)\.\s*Maximum is\s*(\d+)/i);
    if (match) {
      const gotMB = (parseInt(match[1], 10) / (1024 * 1024)).toFixed(1);
      const maxMB = Math.round(parseInt(match[2], 10) / (1024 * 1024));
      return `The file you uploaded is too large (${gotMB} MB). Please upload an image under ${maxMB} MB.`;
    }
    return rawMsg;
  };

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0 || isUploadingImages || isSubmitting) return;

    setErrorMsg('');

    // Pre-upload client validation: max 10 MB (10 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    const oversizedFile = files.find(f => f.size > MAX_FILE_SIZE_BYTES);

    if (oversizedFile) {
      const fileSizeMB = (oversizedFile.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(
        `The file "${oversizedFile.name}" is too large (${fileSizeMB} MB). Please upload an image under 10 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    // Generate local preview URLs so the user sees the photo immediately with loader
    const objectUrls = files.map(file => URL.createObjectURL(file));
    setUploadingPreviews(objectUrls);
    setIsUploadingImages(true);
    setUploadProgress(15);

    try {
      const res = await apiService.uploadImages(files, (percent) => {
        setUploadProgress(percent);
      });
      if (res.urls && res.urls.length > 0) {
        setImages(prev => [...prev, ...res.urls]);
      }
    } catch (err: any) {
      setErrorMsg(formatFriendlyUploadError(err.message));
    } finally {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      setUploadingPreviews([]);
      setIsUploadingImages(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Block saving if images are currently uploading or if already submitting
    if (isUploadingImages || isSubmitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        categoryId: selectedCategoryId || undefined,
        categoryName: categoryInput.trim(),
        paidById: Number(paidById),
        participantUserIds: effectiveSelectedUserIds,
        expenseDate: new Date(expenseDate).toISOString(),
        images: images,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-8 overflow-hidden">
        {/* Submitting Loading Shimmer Bar */}
        {isSubmitting && (
          <div className="absolute inset-x-0 top-0 h-1.5 bg-indigo-100 dark:bg-indigo-950/80 overflow-hidden">
            <div className="h-full bg-indigo-600 dark:bg-indigo-500 animate-pulse w-full" />
          </div>
        )}
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Title & Description / Notes (Side by side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expense Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="e.g. Weekend Dinner, Supermarket Groceries, Office Snacks"
                aria-invalid={!!fieldErrors.title}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                  fieldErrors.title
                    ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                }`}
              />
              {fieldErrors.title && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.title}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Notes <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add optional notes, invoice numbers, or details..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* 2. Amount (INR / ₹) & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-slate-400 font-mono text-base font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: undefined }));
                  }}
                  placeholder="0.00"
                  aria-invalid={!!fieldErrors.amount}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm font-mono rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 tabular-nums transition-colors ${
                    fieldErrors.amount
                      ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.amount && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.amount}</span>
                </p>
              )}
            </div>

            <div className="relative" ref={categoryComboboxRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                {!exactCategoryMatch && categoryInput.trim() && (
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
                    New Category
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Tag className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={categoryInput}
                  onChange={e => handleCategoryInputChange(e.target.value)}
                  onClick={() => setIsCategoryDropdownOpen(true)}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  placeholder="Select or type category..."
                  className={`w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.category
                      ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                  title="Toggle category list"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                    }`}
                  />
                </button>
              </div>

              {fieldErrors.category && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.category}</span>
                </p>
              )}

              {/* Real-time Filtered Category Dropdown Popover */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {filteredCategories.length > 0 ? (
                    <div className="py-0.5 space-y-0.5">
                      {filteredCategories.map(cat => {
                        const isSelected =
                          selectedCategoryId === cat.id ||
                          categoryInput.trim().toLowerCase() === cat.name.toLowerCase();
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat)}
                            className={`flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-center">
                      No matching categories found
                    </div>
                  )}

                  {/* Creatable indicator when typed category is new */}
                  {!exactCategoryMatch && categoryInput.trim() && (
                    <div
                      onClick={() => setIsCategoryDropdownOpen(false)}
                      className="mt-1 px-3 py-2.5 bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 rounded-xl flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100/90 dark:hover:bg-indigo-900/70 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">
                        Create category: <strong className="font-semibold">"{categoryInput.trim()}"</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Paid By & Expense Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Paid by *
              </label>
              <CustomSelect
                value={paidById}
                onChange={val => handlePaidByChange(Number(val))}
                options={registeredUsers.map(u => ({
                  value: u.id,
                  label: `${u.name}${currentUser && u.id === currentUser.id ? ' (You)' : ''}`,
                }))}
              />
            </div>

            <div>
              <DatePicker
                label="Expense Date"
                required
                value={expenseDate}
                onChange={val => {
                  setExpenseDate(val);
                  if (fieldErrors.expenseDate) setFieldErrors(prev => ({ ...prev, expenseDate: undefined }));
                }}
                error={fieldErrors.expenseDate}
              />
            </div>
          </div>

          {/* 4. Split With Members & Attach Bill Photos (Side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Left: Split With Members & Live Split Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Split With</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                    {effectiveSelectedUserIds.length} selected
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold cursor-pointer underline-offset-2 hover:underline"
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-2 border p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 max-h-56 overflow-y-auto transition-colors ${
                  fieldErrors.participants
                    ? 'border-rose-500 dark:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {registeredUsers.map(u => {
                  const isMandatory = mandatoryUserIds.includes(u.id);
                  const isSelected = effectiveSelectedUserIds.includes(u.id);
                  const isCurrentUser = currentUser && u.id === currentUser.id;
                  const isPayer = u.id === numPaidById;

                  let badgeText = '';
                  if (isCurrentUser && isPayer) {
                    badgeText = 'Payer & You (Locked)';
                  } else if (isCurrentUser) {
                    badgeText = 'You (Locked)';
                  } else if (isPayer) {
                    badgeText = 'Payer (Locked)';
                  }

                  return (
                    <button
                      type="button"
                      key={u.id}
                      disabled={isMandatory}
                      onClick={() => toggleUserParticipation(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors border text-left ${
                        isMandatory
                          ? 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 cursor-not-allowed opacity-90'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 font-medium cursor-pointer shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer'
                      }`}
                      title={isMandatory ? 'Mandatory participant (locked)' : undefined}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="truncate font-medium">
                          {u.name} {isCurrentUser ? '(You)' : ''}
                        </span>
                        {isMandatory && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                            {badgeText || 'Locked'}
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ml-1.5 ${
                          isSelected
                            ? isMandatory
                              ? 'bg-slate-500 dark:bg-slate-600 text-white'
                              : 'bg-indigo-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {fieldErrors.participants && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.participants}</span>
                </p>
              )}

              {/* Live Equal Split Preview */}
              {parsedAmount > 0 && (
                <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      Split across{' '}
                      <strong className="font-semibold text-indigo-950 dark:text-indigo-100">{splitCount} members</strong>:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 tabular-nums">
                    {formatAmount(perPersonShare)} / person
                  </span>
                </div>
              )}
            </div>

            {/* Right: Attach Bill / Receipt Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-500" />
                  <span>Attach Bill / Receipt Photos</span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional · Max 10 MB)</span>
                </label>
                {images.length > 0 && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {images.length} {images.length === 1 ? 'photo' : 'photos'} attached
                  </span>
                )}
              </div>

              {/* Hidden file & camera inputs */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleFilesUpload(files);
                }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleFilesUpload(files);
                }}
              />

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImages || isSubmitting}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Upload from Device</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploadingImages || isSubmitting}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Take Photo</span>
                </button>
              </div>

              {/* Thumbnails Gallery with In-Place Progress Loader */}
              {(images.length > 0 || isUploadingImages) && (
                <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[90px] max-h-56 overflow-y-auto">
                  {/* 1. Already Uploaded Images */}
                  {images.map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewViewerIndex(idx)}
                        title="Click to view full image in high resolution"
                        className="w-full h-full block cursor-pointer"
                      >
                        <img
                          src={imgUrl}
                          alt={`Receipt ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingImages || isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setImages(prev => prev.filter((_, i) => i !== idx));
                        }}
                        title="Remove photo"
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 disabled:opacity-50"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {/* 2. In-Progress Uploading Preview Cards (Directly inside image row) */}
                  {isUploadingImages && (
                    uploadingPreviews.length > 0 ? (
                      uploadingPreviews.map((previewUrl, pIdx) => (
                        <div
                          key={`uploading-${pIdx}`}
                          className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-indigo-400 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/30 animate-pulse bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center"
                        >
                          <img
                            src={previewUrl}
                            alt="Uploading receipt preview"
                            className="absolute inset-0 w-full h-full object-cover filter blur-[0.5px] brightness-75 scale-105"
                          />
                          <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center z-10">
                            <Loader2 className="w-4 h-4 text-white animate-spin drop-shadow" />
                            <span className="text-[9px] font-bold text-white mt-0.5 font-mono tracking-tight drop-shadow">
                              {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading'}
                            </span>
                          </div>
                          {/* Bottom Mini Progress Bar */}
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40 z-20">
                            <div
                              className="h-full bg-emerald-400 transition-all duration-200"
                              style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="relative w-20 h-20 rounded-xl border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-md ring-2 ring-indigo-400/30 flex flex-col items-center justify-center p-2 text-center animate-pulse">
                        <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
                          {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}
                        </span>
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-200 dark:bg-indigo-900 rounded-b-xl overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-200"
                            style={{ width: `${Math.max(uploadProgress, 10)}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}

                  {/* 3. Add More Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImages || isSubmitting}
                    title={isUploadingImages ? 'Please wait for current photo to finish uploading' : 'Add more bill photos'}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Add More</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions: Clear and Save Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClearForm}
              disabled={isSubmitting || isUploadingImages}
              title="Clear all form fields"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Clear</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImages}
              title={isUploadingImages ? 'Please wait for photo upload to complete' : undefined}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isUploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Bill ({uploadProgress}%)...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Record Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* High-Resolution Bill Preview Modal */}
      <ImageViewerModal
        isOpen={previewViewerIndex !== null}
        onClose={() => setPreviewViewerIndex(null)}
        images={images}
        initialIndex={previewViewerIndex ?? 0}
        title={title ? `${title} - Bill Preview` : 'Bill Preview'}
      />
    </div>
  );
};

