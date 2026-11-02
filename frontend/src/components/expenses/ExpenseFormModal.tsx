import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Check,
  Calculator,
  AlertCircle,
  UploadCloud,
  Camera,
  Plus,
  Eye,
  Loader2,
  Receipt,
} from 'lucide-react';
import { Expense, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiService } from '../../services/api';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { DatePicker } from '../ui/DatePicker';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    amount: number;
    categoryId: number;
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
  expenseDate?: string;
  participants?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
}) => {
  const { currentUser, registeredUsers } = useAuth();
  const { formatAmount } = useTheme();

  const defaultUserId = currentUser?.id || registeredUsers[0]?.id || 1;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
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

  // Mandatory locked user IDs based on Requirement #5:
  // - Case A: When logged-in user is selected in "Paid by", ONLY logged-in user is checked & disabled (locked)
  // - Case B: When another person is selected in "Paid by", BOTH logged-in user AND that person are checked & disabled (locked)
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
      setCategoryId(initialData.categoryId);
      setPaidById(initialData.paidById);
      setSelectedUserIds(initialData.participants.map(p => p.userId));
      setExpenseDate(initialData.expenseDate.slice(0, 10));
      setImages(initialData.images || []);
    } else {
      setTitle('');
      setDescription('');
      setAmount('');
      const firstCatId = categories[0]?.id || 1;
      setCategoryId(firstCatId);
      const initialPayer = defaultUserId;
      setPaidById(initialPayer);

      // Default State (Requirement #6):
      // By default, ONLY the mandatory locked user(s) are selected initially!
      const initialMandatory = currentUser?.id
        ? (initialPayer === currentUser.id ? [currentUser.id] : [currentUser.id, initialPayer])
        : [initialPayer];
      setSelectedUserIds(initialMandatory);

      setExpenseDate(new Date().toISOString().slice(0, 10));
      setImages([]);
    }
    setFieldErrors({});
    setErrorMsg('');
  }, [initialData, isOpen, defaultUserId, categories, currentUser?.id]);

  if (!isOpen) return null;

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
      // Locked user cannot be unchecked
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

  // Toggle Button (Requirement #6):
  // When not all users are selected -> "Select All"
  // Once all users are selected -> "Deselect All" (unchecks optional, keeps mandatory locked)
  const isAllSelected =
    registeredUsers.length > 0 &&
    registeredUsers.every(u => effectiveSelectedUserIds.includes(u.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all optional users, keeping only mandatory users
      setSelectedUserIds(mandatoryUserIds);
    } else {
      // Select everyone
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

    if (!expenseDate) {
      errors.expenseDate = 'Please select an expense date.';
    }

    if (effectiveSelectedUserIds.length === 0) {
      errors.participants = 'Please select at least one member to split this expense.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0 || isUploadingImages || isSubmitting) return;

    const objectUrls = files.map(file => URL.createObjectURL(file));
    setUploadingPreviews(objectUrls);
    setIsUploadingImages(true);
    setUploadProgress(15);
    setErrorMsg('');

    try {
      const res = await apiService.uploadImages(files, (percent) => {
        setUploadProgress(percent);
      });
      if (res.urls && res.urls.length > 0) {
        setImages(prev => [...prev, ...res.urls]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload bill photo.');
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
        categoryId: Number(categoryId),
        paidById: Number(paidById),
        participantUserIds: effectiveSelectedUserIds,
        expenseDate: new Date(expenseDate).toISOString(),
        images: images,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Expense' : 'Record New Expense'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? 'Changes will be automatically recorded in the logs'
                : 'Enter transaction details and configure split'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Weekend Dinner, Supermarket Groceries"
              aria-invalid={!!fieldErrors.title}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.title
                  ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.title}</span>
              </p>
            )}
          </div>

          {/* 2. Amount (INR / ₹) & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-slate-400 font-mono text-sm">
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
                  className={`w-full pl-8 pr-3 py-2 text-sm font-mono rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 tabular-nums transition-colors ${
                    fieldErrors.amount
                      ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Paid By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Paid by *
              </label>
              <select
                value={paidById}
                onChange={e => handlePaidByChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {registeredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {currentUser && u.id === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <DatePicker
                label="Expense Date"
                value={expenseDate}
                onChange={val => {
                  setExpenseDate(val);
                  if (fieldErrors.expenseDate) setFieldErrors(prev => ({ ...prev, expenseDate: undefined }));
                }}
                error={fieldErrors.expenseDate}
              />
            </div>
          </div>

          {/* 4. Split With Members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Split With ({effectiveSelectedUserIds.length} selected) *
              </label>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-2 border p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 max-h-48 overflow-y-auto transition-colors ${
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
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors border text-left ${
                      isMandatory
                        ? 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 cursor-not-allowed opacity-90'
                        : isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 font-medium cursor-pointer'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer'
                    }`}
                    title={isMandatory ? 'Mandatory participant (locked)' : undefined}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="truncate">
                        {u.name} {isCurrentUser ? '(You)' : ''}
                      </span>
                      {isMandatory && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                          {badgeText || 'Locked'}
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ml-1 ${
                        isSelected
                          ? isMandatory
                            ? 'bg-slate-500 dark:bg-slate-600 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
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
          </div>

          {/* 5. Live Split Preview */}
          {parsedAmount > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs">
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Split equally across{' '}
                  <strong className="font-semibold">{splitCount} members</strong>:
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300 tabular-nums">
                {formatAmount(perPersonShare)} / person
              </span>
            </div>
          )}

          {/* 6. Attach Bill / Receipt Photos (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                <span>Attach Bill / Receipt Photos</span>
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
              </label>
              {images.length > 0 && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
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

            {/* Two Action Buttons: Upload Bill & Take Photo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImages || isSubmitting}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Upload Bill</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploadingImages || isSubmitting}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Take Photo (Camera)</span>
              </button>
            </div>

            {/* Thumbnail previews with in-progress loader & '+' add more card */}
            {(images.length > 0 || isUploadingImages) && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* 1. Uploaded Images */}
                {images.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="relative group w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
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
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* 2. In-Progress Upload Preview Tiles */}
                {isUploadingImages && (
                  uploadingPreviews.length > 0 ? (
                    uploadingPreviews.map((previewUrl, pIdx) => (
                      <div
                        key={`uploading-${pIdx}`}
                        className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-indigo-400 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/30 animate-pulse bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center"
                      >
                        <img
                          src={previewUrl}
                          alt="Uploading receipt preview"
                          className="absolute inset-0 w-full h-full object-cover filter blur-[0.5px] brightness-75 scale-105"
                        />
                        <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-1.5 text-center z-10">
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin drop-shadow" />
                          <span className="text-[9px] font-bold text-white mt-0.5 font-mono tracking-tight drop-shadow">
                            {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading'}
                          </span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40 z-20">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-200"
                            style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-md ring-2 ring-indigo-400/30 flex flex-col items-center justify-center p-2 text-center animate-pulse">
                      <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
                        {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}
                      </span>
                    </div>
                  )
                )}

                {/* 3. Add More Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImages || isSubmitting}
                  title={isUploadingImages ? 'Please wait for current photo to finish uploading' : 'Add more bill photos'}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Add More</span>
                </button>
              </div>
            )}
          </div>

          {/* 7. Optional Description / Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add optional notes or itemized details..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploadingImages}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImages}
              title={isUploadingImages ? 'Please wait for photo upload to finish' : undefined}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isUploadingImages ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading ({uploadProgress}%)...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Record Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Zoomable Image Viewer for Bill Previews */}
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
