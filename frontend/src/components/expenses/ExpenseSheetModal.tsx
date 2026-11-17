import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Expense } from '../../types';
import { ExpenseSheetDocument } from './ExpenseSheetDocument';
import {
  generateVectorExpenseSheetPdf,
  generateUpiQrDataUrl,
  preloadImageAsDataUrl,
} from '../../utils/pdfGenerator';

interface ExpenseSheetModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Interactive Modal for Previewing and Downloading the dynamic Expense Sheet PDF.
 * Generates 100% pure vector PDF directly with 1-click (no print popup, no DOM-to-image).
 * Supports Light Mode and Dark Mode across the entire preview UI.
 */
export const ExpenseSheetModal: React.FC<ExpenseSheetModalProps> = ({
  expense,
  isOpen,
  onClose,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [preloadedImages, setPreloadedImages] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Clean filename generator
  const getPdfFilename = (exp: Expense) => {
    const cleanTitle = exp.title
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    return `Expense_Sheet_${cleanTitle || 'Voucher'}_${exp.id}`;
  };

  // Preload QR Code and Receipt Images whenever the modal opens or the expense changes
  useEffect(() => {
    if (!isOpen || !expense) {
      setQrDataUrl('');
      setPreloadedImages([]);
      setIsPreparing(false);
      setIsExporting(false);
      setDownloadSuccess(false);
      setExportError(null);
      return;
    }

    let isMounted = true;
    setIsPreparing(true);
    setDownloadSuccess(false);
    setExportError(null);

    const prepareAssets = async () => {
      try {
        // 1. Generate standard UPI Deep Link and dynamic QR Code
        const payerUpi = (expense.paidByUpiId || '').trim();
        const payerName = (expense.paidByName || 'Payee').trim();
        const amountStr = Number(expense.amount || 0).toFixed(2);
        const expenseTitle = (expense.title || 'Expense').trim();

        if (payerUpi) {
          const upiUri = `upi://pay?pa=${encodeURIComponent(payerUpi)}&pn=${encodeURIComponent(payerName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(`Expense Sheet: ${expenseTitle}`)}`;
          const qrCode = await generateUpiQrDataUrl(upiUri);
          if (isMounted) setQrDataUrl(qrCode);
        } else {
          if (isMounted) setQrDataUrl('');
        }

        // 2. Preload attached bill images into Base64 Data URLs for PDF embedding
        const imagesToLoad = expense.images || [];
        if (imagesToLoad.length > 0) {
          const dataUrls = await Promise.all(
            imagesToLoad.map((img) => preloadImageAsDataUrl(img))
          );
          if (isMounted) setPreloadedImages(dataUrls);
        } else {
          if (isMounted) setPreloadedImages([]);
        }
      } catch (err: any) {
        console.error('Error preparing expense sheet assets:', err);
      } finally {
        if (isMounted) setIsPreparing(false);
      }
    };

    prepareAssets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  // Handle 1-Click Pure Vector PDF Direct Download
  const handleDownloadPdf = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportError(null);
    setDownloadSuccess(false);

    try {
      await generateVectorExpenseSheetPdf(expense, {
        qrDataUrl,
        preloadedImages,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to generate vector Expense Sheet PDF:', err);
      setExportError(err?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Expense Sheet Preview"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 
          =====================================================================
          TOP TOOLBAR: Title, Direct 1-Click Vector PDF Download, Close
          =====================================================================
        */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Expense Sheet & Voucher Preview
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hidden sm:inline-block">
                  Pure Vector A4
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {expense.title} · #{String(expense.id).padStart(5, '0')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct 1-Click Vector PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPreparing || isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Download pure vector PDF directly (1-click)"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Vector PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Expense Sheet (PDF)</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              aria-label="Close Preview"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {downloadSuccess && (
          <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Expense Sheet PDF downloaded successfully as <strong>{getPdfFilename(expense)}.pdf</strong>
            </span>
          </div>
        )}

        {exportError && (
          <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{exportError}</span>
          </div>
        )}

        {/* 
          =====================================================================
          A4 PAPER PREVIEW CONTAINER (Scrollable canvas with paper drop-shadow)
          =====================================================================
        */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center items-start">
          {isPreparing ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">
                Preparing high-resolution sheet assets & QR code...
              </p>
            </div>
          ) : (
            <div className="shadow-2xl shadow-slate-400/40 dark:shadow-black/70 rounded-md overflow-hidden ring-1 ring-slate-300 dark:ring-slate-800/80">
              <div ref={documentRef}>
                <ExpenseSheetDocument
                  expense={expense}
                  qrDataUrl={qrDataUrl}
                  preloadedImages={preloadedImages}
                  documentId="expense-sheet-capture"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Exact 1:1 preview of the downloaded A4 document</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
