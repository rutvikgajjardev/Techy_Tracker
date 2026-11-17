import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Expense } from '../types';

/**
 * Exact Techy Tracker App Logo SVG (Purple container, ledger frame, trend arrow, and ₹ symbol)
 */
const TECHY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="techyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#techyGrad)" />
  <g transform="translate(14, 14) scale(2)">
    <rect x="4" y="7" width="28" height="22" rx="5" stroke="rgba(255,255,255,0.3)" stroke-width="1.75" fill="none" />
    <path d="M8 24L13.5 19L18 21.5L26.5 12.5" stroke="#A5B4FC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M23 12.5H26.5V16" stroke="#A5B4FC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M11 11.5H20.5M11 15.5H19.5M15.5 11.5C17.433 11.5 19 12.8431 19 14.5C19 16.1569 17.433 17.5 15.5 17.5H12.5L18.5 24.5" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>`;

let cachedLogoDataUrl = '';

/**
 * Renders the authentic Techy Tracker Logo into a crisp, high-resolution PNG Data URL.
 */
export async function getTechyTrackerLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  return new Promise((resolve) => {
    try {
      const blob = new Blob([TECHY_LOGO_SVG], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 256, 256);
          cachedLogoDataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(cachedLogoDataUrl);
          return;
        }
        URL.revokeObjectURL(url);
        resolve('/logo.png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('/logo.png');
      };

      img.src = url;
    } catch {
      resolve('/logo.png');
    }
  });
}

/**
 * Preloads an image URL and converts it into a Base64 Data URL.
 * Guarantees receipt images can be embedded directly into vector PDFs.
 */
export async function preloadImageAsDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve(url);
    }, 6000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(dataUrl);
          return;
        }
      } catch {
        // Fallback to original url
      }
      resolve(url);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(url);
    };

    img.src = url;
  });
}

/**
 * Generates a clean Base64 QR Code Data URL for UPI deep links.
 * Format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=INR&tn=<TITLE>
 */
export async function generateUpiQrDataUrl(upiUri: string): Promise<string> {
  if (!upiUri) return '';
  try {
    return await QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    return '';
  }
}

interface GenerateVectorPdfOptions {
  qrDataUrl?: string;
  preloadedImages?: string[];
}

/**
 * 100% PURE VECTOR PDF GENERATOR
 * - Directly downloads in 1 click as a .pdf file (NO browser print dialog).
 * - Zero DOM-to-image or PNG snapshot rasterization (selectable & searchable vector text).
 * - Exact layout matching:
 *   1. Top Header Swap: "Techy Tracker" on left, "OFFICIAL" badge on top-right.
 *   2. Title & Date Banner: Rounded card with clean two-column metadata.
 *   3. Expense Summary: Complete 4-side borders, right-hand border locked at x=196mm,
 *      and styled Category badge placed inside the Category table cell.
 *   4. Split Distribution: Complete 4-side bordered table with centered Payer/Participant badges.
 *   5. Attached Bills & Receipts: Scaled frames or clean placeholder.
 *   6. Payment & Settlement: Embedded QR code, clean details, and Instant UPI Transfer badge.
 */
export async function generateVectorExpenseSheetPdf(
  expense: Expense,
  options: GenerateVectorPdfOptions = {}
): Promise<void> {
  const { qrDataUrl = '', preloadedImages = [] } = options;

  // Initialize jsPDF with A4 Portrait (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Color Palette (RGB tuples for crisp vector drawing)
  const colors = {
    textPrimary: [15, 23, 42] as [number, number, number],      // #0f172a
    textSecondary: [51, 65, 85] as [number, number, number],    // #334155
    textMuted: [100, 116, 139] as [number, number, number],     // #64748b
    borderDark: [15, 23, 42] as [number, number, number],       // #0f172a
    borderMedium: [203, 213, 225] as [number, number, number],  // #cbd5e1
    borderLight: [226, 232, 240] as [number, number, number],   // #e2e8f0
    bgHeaderRow: [248, 250, 252] as [number, number, number],   // #f8fafc
    bgAltRow: [252, 252, 253] as [number, number, number],      // #fcfcfd
    bgCard: [248, 250, 252] as [number, number, number],        // #f8fafc
    brandPrimary: [67, 56, 202] as [number, number, number],    // #4338ca
    brandLight: [238, 242, 255] as [number, number, number],    // #eef2ff
    brandBorder: [199, 210, 254] as [number, number, number],   // #c7d2fe
    completedBg: [236, 253, 245] as [number, number, number],   // #ecfdf5
    completedText: [6, 95, 70] as [number, number, number],     // #065f46
    completedBorder: [167, 243, 208] as [number, number, number],// #a7f3d0
    white: [255, 255, 255] as [number, number, number],
  };

  // Geometry bounds: Page is 210mm wide. Content starts at x = 14, width = 182, ends at x = 196.
  const leftX = 14;
  const contentWidth = 182;
  const rightX = leftX + contentWidth; // 196mm exact

  // Formatters
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmountStr = (val: number) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
    return `Rs. ${formatted}`;
  };

  const participants = expense.participants || [];
  const images = preloadedImages.length > 0 ? preloadedImages : (expense.images || []);
  const nowFormatted = formatDateTime(new Date().toISOString());

  // =========================================================================
  // 1. TOP HEADER: App Branding (Left) & Voucher Info (Right)
  // =========================================================================
  let curY = 14;

  // Exact Authentic App Logo (Purple box with ledger frame, trend arrow, and ₹ symbol)
  const logoDataUrl = await getTechyTrackerLogoDataUrl();
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', leftX, curY, 11, 11, undefined, 'FAST');
    } catch {
      pdf.setFillColor(...colors.brandPrimary);
      pdf.roundedRect(leftX, curY, 11, 11, 2.5, 2.5, 'F');
    }
  } else {
    pdf.setFillColor(...colors.brandPrimary);
    pdf.roundedRect(leftX, curY, 11, 11, 2.5, 2.5, 'F');
  }

  // App Title: "Techy Tracker" (Selectable Vector Text)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...colors.textPrimary);
  pdf.text('Techy Tracker', leftX + 13.5, curY + 6.2);

  const techyW = pdf.getTextWidth('Techy Tracker');

  // OFFICIAL Badge Placed Beside "Techy Tracker"
  const officialBadgeW = 18;
  const officialBadgeH = 5.2;
  const officialBadgeX = leftX + 13.5 + techyW + 3;
  const officialBadgeY = curY + 2.0;

  pdf.setFillColor(...colors.brandLight);
  pdf.setDrawColor(...colors.brandBorder);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(officialBadgeX, officialBadgeY, officialBadgeW, officialBadgeH, 1.2, 1.2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...colors.brandPrimary);
  pdf.text('OFFICIAL', officialBadgeX + officialBadgeW / 2, officialBadgeY + 3.55, { align: 'center' });

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('Personal & Group Expense Manager · Transaction Record', leftX + 13.5, curY + 10.2);

  // Top-Right Header: EXPENSE SHEET / VOUCHER Black Box
  const voucherBoxW = 44;
  const voucherBoxH = 5.5;
  const voucherBoxX = rightX - voucherBoxW;
  const voucherBoxY = curY;

  pdf.setFillColor(...colors.textPrimary); // #0f172a
  pdf.roundedRect(voucherBoxX, voucherBoxY, voucherBoxW, voucherBoxH, 1.2, 1.2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.white);
  pdf.text('EXPENSE SHEET / VOUCHER', voucherBoxX + voucherBoxW / 2, voucherBoxY + 3.75, { align: 'center' });

  // Voucher Ref below black box
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  const voucherRefStr = `Voucher Ref: #EXP-${String(expense.id).padStart(5, '0')}`;
  pdf.text(voucherRefStr, rightX, curY + 9.2, { align: 'right' });

  // Category and Status Badges below Voucher Ref
  const badgeRowY = curY + 11.2;
  const isCompleted = expense.status === 'COMPLETED';
  const statusText = isCompleted ? 'Completed' : 'Pending';
  const statusBadgeW = 18;
  const statusBadgeH = 4.8;
  const statusBadgeX = rightX - statusBadgeW;

  pdf.setFillColor(...(isCompleted ? colors.completedBg : [254, 243, 199]));
  pdf.setDrawColor(...(isCompleted ? colors.completedBorder : [253, 230, 138]));
  pdf.setLineWidth(0.25);
  pdf.roundedRect(statusBadgeX, badgeRowY, statusBadgeW, statusBadgeH, 1.2, 1.2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...(isCompleted ? colors.completedText : [180, 83, 9]));
  pdf.text(statusText, statusBadgeX + statusBadgeW / 2, badgeRowY + 3.3, { align: 'center' });

  // Category Badge
  const categoryName = expense.categoryName || 'General';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  const catTextW = pdf.getTextWidth(categoryName);
  const catBadgeW = Math.max(18, catTextW + 5);
  const catBadgeX = statusBadgeX - catBadgeW - 2.5;

  pdf.setFillColor(...colors.brandLight);
  pdf.setDrawColor(...colors.brandBorder);
  pdf.roundedRect(catBadgeX, badgeRowY, catBadgeW, statusBadgeH, 1.2, 1.2, 'FD');
  pdf.setTextColor(...colors.brandPrimary);
  pdf.text(categoryName, catBadgeX + catBadgeW / 2, badgeRowY + 3.3, { align: 'center' });

  // Divider Line underneath Header
  curY += 18.5;
  pdf.setDrawColor(...colors.borderDark);
  pdf.setLineWidth(0.4);
  pdf.line(leftX, curY, rightX, curY);

  // =========================================================================
  // 2. EXPENSE TITLE & DATE BANNER
  // =========================================================================
  curY += 4;
  const bannerH = 13.5;

  pdf.setFillColor(...colors.bgCard);
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(leftX, curY, contentWidth, bannerH, 2, 2, 'FD');

  // Left: Expense Title / Purpose
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('EXPENSE TITLE / PURPOSE', leftX + 4, curY + 4.2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...colors.textPrimary);
  const cleanTitle = (expense.title || 'Expense').substring(0, 50);
  pdf.text(cleanTitle, leftX + 4, curY + 9.8);

  // Right: Expense Date
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('EXPENSE DATE', rightX - 4, curY + 4.2, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(formatDateOnly(expense.expenseDate), rightX - 4, curY + 9.8, { align: 'right' });

  curY += bannerH + 5;

  // =========================================================================
  // 3. EXPENSE SUMMARY TABLE (Full 4-Side Borders)
  // =========================================================================
  // Section Header with Circular Purple Bullet Dot
  pdf.setFillColor(...colors.brandPrimary);
  pdf.circle(leftX + 1.2, curY + 2.0, 1.1, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('EXPENSE SUMMARY', leftX + 3.8, curY + 3.0);

  curY += 5.5;

  // Table Column Coordinates:
  // Col 1 (Label): width 38mm (14 to 52)
  // Col 2 (Value): width 53mm (52 to 105)
  // Col 3 (Label): width 38mm (105 to 143)
  // Col 4 (Value): width 53mm (143 to 196)
  const col1X = leftX;          // 14
  const col2X = leftX + 38;     // 52
  const col3X = leftX + 91;     // 105
  const col4X = leftX + 129;    // 143
  const tableEndX = rightX;     // 196

  const summaryStartY = curY;

  // Row 1: Total Amount & Paid By (Height: 13mm)
  const r1H = 13;
  // Col 1 Background
  pdf.setFillColor(...colors.bgHeaderRow);
  pdf.rect(col1X, curY, 38, r1H, 'F');
  // Col 2 Background (Brand Light)
  pdf.setFillColor(...colors.brandLight);
  pdf.rect(col2X, curY, 53, r1H, 'F');
  // Col 3 Background
  pdf.setFillColor(...colors.bgHeaderRow);
  pdf.rect(col3X, curY, 38, r1H, 'F');
  // Col 4 Background
  pdf.setFillColor(...colors.white);
  pdf.rect(col4X, curY, 53, r1H, 'F');

  // Text Row 1
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Total Amount', col1X + 3, curY + 7.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...colors.brandPrimary);
  pdf.text(formatAmountStr(expense.amount), col2X + 4, curY + 8);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Expense By (Paid By)', col3X + 3, curY + 7.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...colors.textPrimary);
  pdf.text(expense.paidByName || 'N/A', col4X + 4, curY + 5.5);

  if (expense.paidByUpiId) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...colors.brandPrimary);
    pdf.text(`UPI: ${expense.paidByUpiId}`, col4X + 4, curY + 9.5);
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.textMuted);
    pdf.text('No UPI registered', col4X + 4, curY + 9.5);
  }

  // Row 1 Bottom Divider
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(leftX, curY + r1H, rightX, curY + r1H);
  curY += r1H;

  // Row 2: Created Time & Last Updated Time (Height: 8mm)
  const r2H = 8;
  pdf.setFillColor(...colors.bgHeaderRow);
  pdf.rect(col1X, curY, 38, r2H, 'F');
  pdf.rect(col3X, curY, 38, r2H, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Created Time', col1X + 3, curY + 5.2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(formatDateTime(expense.createdAt), col2X + 4, curY + 5.2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Last Updated Time', col3X + 3, curY + 5.2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(formatDateTime(expense.updatedAt), col4X + 4, curY + 5.2);

  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(leftX, curY + r2H, rightX, curY + r2H);
  curY += r2H;

  // Row 3: Category & Recorded By (Height: 8.5mm)
  const r3H = 8.5;
  pdf.setFillColor(...colors.bgHeaderRow);
  pdf.rect(col1X, curY, 38, r3H, 'F');
  pdf.rect(col3X, curY, 38, r3H, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Category', col1X + 3, curY + 5.5);

  // Plain Text Category (Matching Recorded By font style and color)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(expense.categoryName || 'General', col2X + 4, curY + 5.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Recorded By', col3X + 3, curY + 5.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(expense.createdByName || expense.paidByName || 'N/A', col4X + 4, curY + 5.5);

  curY += r3H;

  // Optional Row 4: Description / Notes
  if (expense.description) {
    pdf.setDrawColor(...colors.borderLight);
    pdf.setLineWidth(0.25);
    pdf.line(leftX, curY, rightX, curY);

    const descH = 8.5;
    pdf.setFillColor(...colors.bgHeaderRow);
    pdf.rect(col1X, curY, 38, descH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.textSecondary);
    pdf.text('Description / Notes', col1X + 3, curY + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...colors.textSecondary);
    const cleanDesc = expense.description.substring(0, 110);
    pdf.text(cleanDesc, col2X + 4, curY + 5.5);

    curY += descH;
  }

  const summaryTotalH = curY - summaryStartY;

  // Draw Vertical Internal Grid Lines for Expense Summary Table
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(col2X, summaryStartY, col2X, curY);
  pdf.line(col3X, summaryStartY, col3X, curY);
  pdf.line(col4X, summaryStartY, col4X, curY);

  // Complete 4-Side Borders (Ensures Right Border at x=196 is 100% visible)
  pdf.setDrawColor(...colors.borderMedium);
  pdf.setLineWidth(0.35);
  pdf.rect(leftX, summaryStartY, contentWidth, summaryTotalH, 'D');

  curY += 5.5;

  // =========================================================================
  // 4. SPLIT DISTRIBUTION TABLE (Full 4-Side Borders, Right-Hand Border Intact)
  // =========================================================================
  pdf.setFillColor(...colors.brandPrimary);
  pdf.circle(leftX + 1.2, curY + 2.0, 1.1, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text(`SPLIT DISTRIBUTION (${participants.length} MEMBERS)`, leftX + 3.8, curY + 3.0);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('List of members included in this expense split', rightX, curY + 3.0, { align: 'right' });

  curY += 5.5;

  const splitStartY = curY;
  const splitCol1W = 16;  // Sr. No. (14 to 30)
  const splitCol2W = 126; // Member Name (30 to 156)
  const splitCol3W = 40;  // Role in Expense (156 to 196)

  // Split Table Header
  const splitHeaderH = 7;
  pdf.setFillColor(...colors.bgHeaderRow);
  pdf.rect(leftX, curY, contentWidth, splitHeaderH, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('Sr. No.', leftX + splitCol1W / 2, curY + 4.4, { align: 'center' });
  pdf.text('Member Name', leftX + splitCol1W + 4, curY + 4.4);
  pdf.text('Role in Expense', rightX - splitCol3W / 2, curY + 4.4, { align: 'center' });

  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(leftX, curY + splitHeaderH, rightX, curY + splitHeaderH);
  curY += splitHeaderH;

  // Split Table Rows
  const rowHeight = 7.5;
  if (participants.length === 0) {
    pdf.setFillColor(...colors.white);
    pdf.rect(leftX, curY, contentWidth, rowHeight, 'F');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...colors.textMuted);
    pdf.text('No participants specified for this expense.', leftX + contentWidth / 2, curY + 4.8, { align: 'center' });
    curY += rowHeight;
  } else {
    participants.forEach((member, idx) => {
      const isPayer = member.userId === expense.paidById || member.name === expense.paidByName;
      const rowBg = idx % 2 === 0 ? colors.white : colors.bgAltRow;

      pdf.setFillColor(...rowBg);
      pdf.rect(leftX, curY, contentWidth, rowHeight, 'F');

      // Col 1: Sr. No.
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...colors.textMuted);
      pdf.text(String(idx + 1), leftX + splitCol1W / 2, curY + 4.8, { align: 'center' });

      // Col 2: Member Name + optional email
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.textPrimary);
      pdf.text(member.name || 'Member', leftX + splitCol1W + 4, curY + 4.8);

      if (member.email) {
        const nameW = pdf.getTextWidth(member.name || 'Member');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.textMuted);
        pdf.text(`(${member.email})`, leftX + splitCol1W + 4 + nameW + 2, curY + 4.8);
      }

      // Col 3: Role Badge
      const badgeW = isPayer ? 22 : 26;
      const badgeH = 5;
      const badgeX = rightX - splitCol3W / 2 - badgeW / 2;
      const badgeY = curY + 1.25;

      if (isPayer) {
        pdf.setFillColor(...colors.brandLight);
        pdf.setDrawColor(...colors.brandBorder);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.brandPrimary);
        pdf.text('Payer', badgeX + badgeW / 2, badgeY + 3.35, { align: 'center' });
      } else {
        pdf.setFillColor(...colors.bgHeaderRow);
        pdf.setDrawColor(...colors.borderLight);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.textSecondary);
        pdf.text('Participant', badgeX + badgeW / 2, badgeY + 3.35, { align: 'center' });
      }

      // Bottom Row Divider
      pdf.setDrawColor(...colors.borderLight);
      pdf.setLineWidth(0.25);
      pdf.line(leftX, curY + rowHeight, rightX, curY + rowHeight);
      curY += rowHeight;
    });
  }

  // Draw Vertical Lines for Split Table
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(leftX + splitCol1W, splitStartY, leftX + splitCol1W, curY);
  pdf.line(leftX + splitCol1W + splitCol2W, splitStartY, leftX + splitCol1W + splitCol2W, curY);

  // Complete 4-Side Borders for Split Table (Right border guaranteed at x=196)
  pdf.setDrawColor(...colors.borderMedium);
  pdf.setLineWidth(0.35);
  pdf.rect(leftX, splitStartY, contentWidth, curY - splitStartY, 'D');

  curY += 5.5;

  // =========================================================================
  // 5. ATTACHED BILLS & RECEIPTS
  // =========================================================================
  pdf.setFillColor(...colors.brandPrimary);
  pdf.circle(leftX + 1.2, curY + 2.0, 1.1, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('ATTACHED BILLS & RECEIPTS', leftX + 3.8, curY + 3.0);

  if (images.length > 0) {
    const receiptBadgeW = 28;
    const receiptBadgeH = 4.8;
    const receiptBadgeY = curY - 0.4;
    pdf.setFillColor(...colors.bgHeaderRow);
    pdf.setDrawColor(...colors.borderLight);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(rightX - receiptBadgeW, receiptBadgeY, receiptBadgeW, receiptBadgeH, 1.2, 1.2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...colors.textSecondary);
    pdf.text(`${images.length} Receipts Attached`, rightX - receiptBadgeW / 2, receiptBadgeY + 3.25, { align: 'center' });
  }

  curY += 5.5;

  const billsBoxH = images.length > 0 ? 34 : 14;
  pdf.setFillColor(...colors.bgCard);
  pdf.setDrawColor(...colors.borderMedium);
  pdf.setLineWidth(0.35);

  if (images.length === 0) {
    // Empty state with dashed border
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(leftX, curY, contentWidth, billsBoxH, 2, 2, 'FD');
    pdf.setLineDashPattern([], 0); // Reset

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.textMuted);
    pdf.text('No receipt or bill photos attached for this expense.', leftX + contentWidth / 2, curY + 8, { align: 'center' });
  } else {
    pdf.roundedRect(leftX, curY, contentWidth, billsBoxH, 2, 2, 'FD');

    // Render up to 2 receipts side-by-side
    const displayCount = Math.min(images.length, 2);
    const imgFrameW = 55;
    const imgFrameH = 26;
    const startOffset = leftX + (contentWidth - displayCount * (imgFrameW + 10) + 10) / 2;

    for (let i = 0; i < displayCount; i++) {
      const frameX = startOffset + i * (imgFrameW + 10);
      const frameY = curY + 4;

      pdf.setFillColor(...colors.white);
      pdf.setDrawColor(...colors.borderLight);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(frameX, frameY, imgFrameW, imgFrameH, 1.5, 1.5, 'FD');

      try {
        pdf.addImage(images[i], 'JPEG', frameX + 2, frameY + 2, imgFrameW - 4, imgFrameH - 7, undefined, 'FAST');
      } catch (err) {
        console.warn('Image embedding fallback:', err);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...colors.textSecondary);
      pdf.text(`Receipt #${i + 1}`, frameX + imgFrameW / 2, frameY + imgFrameH - 2, { align: 'center' });
    }
  }

  curY += billsBoxH + 5.5;

  // =========================================================================
  // 6. PAYMENT & SETTLEMENT BOX (Bottom)
  // =========================================================================
  const settleBoxH = 38;
  pdf.setFillColor(...colors.bgCard);
  pdf.setDrawColor(...colors.borderMedium);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(leftX, curY, contentWidth, settleBoxH, 2.5, 2.5, 'FD');

  // Left: Scannable UPI QR Code Card
  const qrBoxW = 28;
  const qrBoxH = 28;
  const qrX = leftX + 4;
  const qrY = curY + 3.5;

  pdf.setFillColor(...colors.white);
  pdf.setDrawColor(...colors.borderMedium);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(qrX, qrY, qrBoxW, qrBoxH, 1.5, 1.5, 'FD');

  if (qrDataUrl) {
    try {
      pdf.addImage(qrDataUrl, 'PNG', qrX + 1.5, qrY + 1.5, qrBoxW - 3, qrBoxH - 3, undefined, 'FAST');
    } catch (err) {
      console.warn('QR code embedding fallback:', err);
    }
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...colors.textMuted);
    pdf.text('QR Not Available', qrX + qrBoxW / 2, qrY + qrBoxH / 2, { align: 'center' });
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colors.textSecondary);
  pdf.text('SCAN TO PAY', qrX + qrBoxW / 2, qrY + qrBoxH + 3.8, { align: 'center' });

  // Right Side of Settlement: Header + Badge
  const settleDetailsX = leftX + qrBoxW + 10;
  const settleHeaderY = curY + 6.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...colors.textPrimary);
  pdf.text('PAYMENT & SETTLEMENT', settleDetailsX, settleHeaderY);

  // Top-Right of Settlement Box: "Instant UPI Transfer" Badge
  const instantBadgeW = 34;
  const instantBadgeH = 5.2;
  const instantBadgeX = rightX - instantBadgeW - 4;
  const instantBadgeY = curY + 3.5;

  pdf.setFillColor(...colors.completedBg);
  pdf.setDrawColor(...colors.completedBorder);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(instantBadgeX, instantBadgeY, instantBadgeW, instantBadgeH, 1.2, 1.2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colors.completedText);
  pdf.text('Instant UPI Transfer', instantBadgeX + instantBadgeW / 2, instantBadgeY + 3.40, { align: 'center' });

  // Divider line under Settlement Header
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(settleDetailsX, curY + 10, rightX - 4, curY + 10);

  // Settlement Details: Key-Value Rows
  const labelColW = 26;
  const valColX = settleDetailsX + labelColW;

  // Row 1: Payee Name
  let rowY = curY + 15;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('Payee Name:', settleDetailsX, rowY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...colors.textPrimary);
  pdf.text(expense.paidByName || 'N/A', valColX, rowY);

  // Row 2: Payer UPI ID
  rowY += 5.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('Payer UPI ID:', settleDetailsX, rowY);

  if (expense.paidByUpiId) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...colors.brandPrimary);
    pdf.text(expense.paidByUpiId, valColX, rowY);
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...colors.textMuted);
    pdf.text('UPI ID not provided', valColX, rowY);
  }

  // Row 3: Expense Total
  rowY += 5.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('Expense Total:', settleDetailsX, rowY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.textPrimary);
  pdf.text(formatAmountStr(expense.amount), valColX, rowY);

  // Instruction footer inside settlement box
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colors.textMuted);
  pdf.text(
    `Scan this dynamic UPI QR Code using Google Pay, PhonePe, Paytm, or BHIM to settle directly with ${expense.paidByName || 'the payer'}.`,
    settleDetailsX,
    curY + 34
  );

  // =========================================================================
  // 7. FORMAL FOOTER (Bottom of A4 Page)
  // =========================================================================
  const footerY = 284;
  pdf.setDrawColor(...colors.borderLight);
  pdf.setLineWidth(0.25);
  pdf.line(leftX, footerY, rightX, footerY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...colors.textMuted);
  pdf.text('Techy Tracker Expense Management System · Official Record', leftX, footerY + 4);
  pdf.text(`Generated on: ${nowFormatted}`, rightX, footerY + 4, { align: 'right' });

  // =========================================================================
  // 8. DIRECT 1-CLICK DOWNLOAD (No print popup, no browser headers)
  // =========================================================================
  const safeFilename = `Expense_Sheet_${cleanTitle.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${expense.id}.pdf`;
  pdf.save(safeFilename);
}

// Backwards-compatible alias
export const exportElementToPdf = async (
  _element: HTMLElement,
  _filename: string
): Promise<void> => {
  // Aliased to no-op if called directly; modal uses generateVectorExpenseSheetPdf
};
