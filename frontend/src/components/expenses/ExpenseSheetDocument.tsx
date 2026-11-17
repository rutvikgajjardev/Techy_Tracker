import React from 'react';
import { Expense } from '../../types';

interface ExpenseSheetDocumentProps {
  expense: Expense;
  qrDataUrl?: string;
  preloadedImages?: string[];
  documentId?: string;
}

/**
 * Pixel-Perfect Printable A4 Expense Sheet Component.
 * - Dimensions strictly locked to A4 (794px x 1123px at 96 DPI).
 * - Rendered cleanly via html-to-image (SVG foreignObject native browser rendering).
 * - Badges use standard inline-flex with alignItems: 'center' and balanced padding.
 * - Crisp borders, consistent table vertical alignments, and print-safe hex colors.
 */
export const ExpenseSheetDocument: React.FC<ExpenseSheetDocumentProps> = ({
  expense,
  qrDataUrl = '',
  preloadedImages = [],
  documentId = 'expense-sheet-capture',
}) => {
  // Format dates cleanly
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const participants = expense.participants || [];
  const images = preloadedImages.length > 0 ? preloadedImages : (expense.images || []);
  const nowFormatted = formatDateTime(new Date().toISOString());

  // Palette: Clean, print-safe hex colors
  const colors = {
    bgPage: '#ffffff',
    bgHeaderRow: '#f8fafc',
    bgAltRow: '#fcfcfd',
    bgCard: '#f8fafc',
    borderDark: '#0f172a',
    borderMedium: '#cbd5e1',
    borderLight: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    brandPrimary: '#4338ca',
    brandLight: '#eef2ff',
    brandBorder: '#c7d2fe',
    completedBg: '#ecfdf5',
    completedText: '#065f46',
    completedBorder: '#a7f3d0',
  };

  const fontSans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const fontMono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  return (
    <div
      id={documentId}
      style={{
        width: '794px',
        height: '1123px',
        maxWidth: '794px',
        minWidth: '794px',
        maxHeight: '1123px',
        minHeight: '1123px',
        margin: '0 auto',
        padding: '32px 36px',
        boxSizing: 'border-box',
        backgroundColor: colors.bgPage,
        color: colors.textPrimary,
        fontFamily: fontSans,
        fontSize: '11px',
        lineHeight: 1.4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div>
        {/* 
          =====================================================================
          1. SHEET HEADER: App Branding (Left) & OFFICIAL Badge (Right Swap)
          =====================================================================
        */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            marginBottom: '16px',
            borderBottom: `2px solid ${colors.borderDark}`,
          }}
        >
          {/* Top-Left: Logo & App Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: colors.brandPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '28px', height: '28px' }}
              >
                <rect
                  x="4"
                  y="7"
                  width="28"
                  height="22"
                  rx="5"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.75"
                />
                <path
                  d="M8 24L13.5 19L18 21.5L26.5 12.5"
                  stroke="#c7d2fe"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 12.5H26.5V16"
                  stroke="#c7d2fe"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 11.5H20.5M11 15.5H19.5M15.5 11.5C17.433 11.5 19 12.8431 19 14.5C19 16.1569 17.433 17.5 15.5 17.5H12.5L18.5 24.5"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: colors.textPrimary,
                    lineHeight: '26px',
                  }}
                >
                  Techy Tracker
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: colors.textMuted,
                  marginTop: '3px',
                  fontWeight: 500,
                }}
              >
                Personal &amp; Group Expense Manager · Transaction Record
              </div>
            </div>
          </div>

          {/* Top-Right: OFFICIAL Badge Swap (Clean, Centered Tag) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: colors.brandLight,
                color: colors.brandPrimary,
                border: `1px solid ${colors.brandBorder}`,
                boxSizing: 'border-box',
                lineHeight: 1,
              }}
            >
              OFFICIAL
            </span>
          </div>
        </div>

        {/* 
          =====================================================================
          2. EXPENSE TITLE BANNER (Clean, flush-aligned card)
          =====================================================================
        */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: colors.textMuted,
                display: 'block',
              }}
            >
              EXPENSE TITLE / PURPOSE
            </span>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: colors.textPrimary,
                marginTop: '2px',
              }}
            >
              {expense.title}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: colors.textMuted,
                display: 'block',
              }}
            >
              EXPENSE DATE
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: colors.textSecondary,
                fontFamily: fontMono,
              }}
            >
              {formatDateOnly(expense.expenseDate)}
            </span>
          </div>
        </div>

        {/* 
          =====================================================================
          3. EXPENSE SUMMARY GRID (Table / Sheet Format)
          =====================================================================
        */}
        <div style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '3.5px',
                height: '14px',
                backgroundColor: colors.brandPrimary,
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: colors.textSecondary,
                lineHeight: 1,
              }}
            >
              EXPENSE SUMMARY
            </span>
          </div>

          <table
            style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              border: `1px solid ${colors.borderMedium}`,
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
          >
            <tbody>
              {/* Row 1: Total Amount & Paid By */}
              <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td
                  style={{
                    width: '20%',
                    padding: '10px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Total Amount
                </td>
                <td
                  style={{
                    width: '30%',
                    padding: '10px 12px',
                    borderRight: `1px solid ${colors.borderMedium}`,
                    backgroundColor: colors.brandLight,
                    verticalAlign: 'middle',
                  }}
                >
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: colors.brandPrimary,
                      lineHeight: '22px',
                    }}
                  >
                    {formatCurrency(expense.amount)}
                  </span>
                </td>
                <td
                  style={{
                    width: '20%',
                    padding: '10px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Expense By (Paid By)
                </td>
                <td style={{ width: '30%', padding: '10px 12px', color: colors.textPrimary, verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: colors.textPrimary }}>
                    {expense.paidByName}
                  </div>
                  {expense.paidByUpiId ? (
                    <div
                      style={{
                        fontFamily: fontMono,
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.brandPrimary,
                        marginTop: '2px',
                      }}
                    >
                      UPI: {expense.paidByUpiId}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', color: colors.textMuted, fontStyle: 'italic', marginTop: '2px' }}>
                      No UPI registered
                    </div>
                  )}
                </td>
              </tr>

              {/* Row 2: Created Time & Last Updated Time */}
              <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td
                  style={{
                    padding: '9px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Created Time
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    borderRight: `1px solid ${colors.borderMedium}`,
                    color: colors.textSecondary,
                    verticalAlign: 'middle',
                  }}
                >
                  {formatDateTime(expense.createdAt)}
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Last Updated Time
                </td>
                <td style={{ padding: '9px 12px', color: colors.textSecondary, verticalAlign: 'middle' }}>
                  {formatDateTime(expense.updatedAt)}
                </td>
              </tr>

              {/* Row 3: Category & Recorded By */}
              <tr style={{ borderBottom: expense.description ? `1px solid ${colors.borderLight}` : 'none' }}>
                <td
                  style={{
                    padding: '9px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Category
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    borderRight: `1px solid ${colors.borderMedium}`,
                    color: colors.textSecondary,
                    verticalAlign: 'middle',
                  }}
                >
                  {expense.categoryName || 'General'}
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    backgroundColor: colors.bgHeaderRow,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Recorded By
                </td>
                <td style={{ padding: '9px 12px', color: colors.textSecondary, verticalAlign: 'middle' }}>
                  {expense.createdByName || expense.paidByName}
                </td>
              </tr>

              {/* Row 4: Description (if provided) */}
              {expense.description && (
                <tr>
                  <td
                    style={{
                      padding: '9px 12px',
                      backgroundColor: colors.bgHeaderRow,
                      fontWeight: 600,
                      color: colors.textSecondary,
                      borderRight: `1px solid ${colors.borderLight}`,
                      verticalAlign: 'top',
                    }}
                  >
                    Description / Notes
                  </td>
                  <td colSpan={3} style={{ padding: '9px 12px', color: colors.textSecondary, lineHeight: 1.4, verticalAlign: 'top' }}>
                    {expense.description}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 
          =====================================================================
          4. SPLIT DISTRIBUTION (Strictly ONLY member names, no extra math)
          =====================================================================
        */}
        <div style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '3.5px',
                  height: '14px',
                  backgroundColor: colors.brandPrimary,
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  lineHeight: 1,
                }}
              >
                SPLIT DISTRIBUTION ({participants.length} {participants.length === 1 ? 'MEMBER' : 'MEMBERS'})
              </span>
            </div>
            <span style={{ fontSize: '10px', color: colors.textMuted }}>
              List of members included in this expense split
            </span>
          </div>

          <table
            style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              border: `1px solid ${colors.borderMedium}`,
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: colors.bgHeaderRow, borderBottom: `1px solid ${colors.borderLight}` }}>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    width: '54px',
                    verticalAlign: 'middle',
                  }}
                >
                  Sr. No.
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: colors.textSecondary,
                    borderRight: `1px solid ${colors.borderLight}`,
                    verticalAlign: 'middle',
                  }}
                >
                  Member Name
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: colors.textSecondary,
                    width: '110px',
                    verticalAlign: 'middle',
                  }}
                >
                  Role in Expense
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: colors.textMuted, fontStyle: 'italic' }}>
                    No participants specified for this expense.
                  </td>
                </tr>
              ) : (
                participants.map((member, idx) => {
                  const isPayer = member?.userId === expense?.paidById || member?.name === expense?.paidByName;
                  const rowBg = idx % 2 === 0 ? '#ffffff' : colors.bgAltRow;

                  return (
                    <tr
                      key={member?.userId || idx}
                      style={{
                        borderBottom: `1px solid ${colors.borderLight}`,
                        backgroundColor: rowBg,
                      }}
                    >
                      <td
                        style={{
                          padding: '7px 10px',
                          textAlign: 'center',
                          color: colors.textMuted,
                          borderRight: `1px solid ${colors.borderLight}`,
                          fontWeight: 600,
                          verticalAlign: 'middle',
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: '7px 12px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: colors.textPrimary,
                          borderRight: `1px solid ${colors.borderLight}`,
                          verticalAlign: 'middle',
                        }}
                      >
                        <span>{member?.name || 'Member'}</span>
                        {member?.email && (
                          <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 400, marginLeft: '6px' }}>
                            ({member.email})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {isPayer ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2.5px 10px',
                              borderRadius: '4px',
                              backgroundColor: colors.brandLight,
                              color: colors.brandPrimary,
                              border: `1px solid ${colors.brandBorder}`,
                              boxSizing: 'border-box',
                              lineHeight: 1,
                            }}
                          >
                            Payer
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '2.5px 10px',
                              borderRadius: '4px',
                              backgroundColor: colors.bgHeaderRow,
                              color: colors.textSecondary,
                              border: `1px solid ${colors.borderLight}`,
                              boxSizing: 'border-box',
                              lineHeight: 1,
                            }}
                          >
                            Participant
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 
          =====================================================================
          5. ATTACHED BILLS & RECEIPTS (Clean, Balanced Frame)
          =====================================================================
        */}
        <div style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '3.5px',
                  height: '14px',
                  backgroundColor: colors.brandPrimary,
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  lineHeight: 1,
                }}
              >
                ATTACHED BILLS &amp; RECEIPTS
              </span>
            </div>
            {images.length > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '4px',
                  backgroundColor: colors.bgHeaderRow,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.borderLight}`,
                  boxSizing: 'border-box',
                  lineHeight: 1,
                }}
              >
                {images.length} {images.length === 1 ? 'Receipt Attached' : 'Receipts Attached'}
              </span>
            )}
          </div>

          {images.length === 0 ? (
            <div
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1px dashed ${colors.borderMedium}`,
                borderRadius: '6px',
                padding: '12px',
                textAlign: 'center',
                backgroundColor: colors.bgCard,
              }}
            >
              <p style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic', margin: 0 }}>
                No receipt or bill photos attached for this expense.
              </p>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1px solid ${colors.borderLight}`,
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: colors.bgCard,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {images.map((imgUrl, imgIdx) => (
                <div
                  key={imgIdx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    border: `1px solid ${colors.borderLight}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      width: images.length === 1 ? '240px' : '180px',
                      height: '110px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Attached Bill ${imgIdx + 1}`}
                      crossOrigin="anonymous"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: '5px',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: colors.textSecondary,
                    }}
                  >
                    Receipt #{imgIdx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 
          =====================================================================
          6. PAYMENT & SETTLEMENT BOX (Structured Key-Value Table)
          =====================================================================
        */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${colors.borderMedium}`,
            borderRadius: '8px',
            padding: '14px 18px',
            backgroundColor: colors.bgCard,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
            {/* Left: Dynamic Scannable UPI QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  padding: '4px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${colors.borderMedium}`,
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '9px', color: colors.textMuted, textAlign: 'center', padding: '4px' }}>
                    QR Not Available
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: colors.textSecondary,
                  marginTop: '4px',
                }}
              >
                SCAN TO PAY
              </span>
            </div>

            {/* Right: Settlement Details & Payer Info with Table Grid */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${colors.borderLight}`,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: colors.textPrimary,
                  }}
                >
                  PAYMENT &amp; SETTLEMENT
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2.5px 10px',
                    borderRadius: '4px',
                    color: colors.completedText,
                    backgroundColor: colors.completedBg,
                    border: `1px solid ${colors.completedBorder}`,
                    boxSizing: 'border-box',
                    lineHeight: 1,
                  }}
                >
                  Instant UPI Transfer
                </span>
              </div>

              {/* Table-based Key-Value Alignment */}
              <table style={{ width: '100%', marginTop: '8px', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: '95px',
                        padding: '3px 0',
                        color: colors.textMuted,
                        fontWeight: 600,
                        verticalAlign: 'middle',
                      }}
                    >
                      Payee Name:
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        fontWeight: 700,
                        color: colors.textPrimary,
                        fontSize: '12px',
                        verticalAlign: 'middle',
                      }}
                    >
                      {expense.paidByName}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: '95px',
                        padding: '3px 0',
                        color: colors.textMuted,
                        fontWeight: 600,
                        verticalAlign: 'middle',
                      }}
                    >
                      Payer UPI ID:
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        verticalAlign: 'middle',
                      }}
                    >
                      {expense.paidByUpiId ? (
                        <span
                          style={{
                            fontFamily: fontMono,
                            fontWeight: 700,
                            color: colors.brandPrimary,
                            fontSize: '11px',
                          }}
                        >
                          {expense.paidByUpiId}
                        </span>
                      ) : (
                        <span style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: '10px' }}>
                          UPI ID not provided
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: '95px',
                        padding: '3px 0',
                        color: colors.textMuted,
                        fontWeight: 600,
                        verticalAlign: 'middle',
                      }}
                    >
                      Expense Total:
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        fontWeight: 800,
                        color: colors.textPrimary,
                        fontSize: '14px',
                        verticalAlign: 'middle',
                      }}
                    >
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: '10px', color: colors.textMuted, margin: '4px 0 0 0', lineHeight: 1.3 }}>
                Scan this dynamic UPI QR Code using Google Pay, PhonePe, Paytm, or BHIM to settle directly with {expense.paidByName}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 
        =====================================================================
        7. FORMAL FOOTER: Timestamp & Verification Note (Locked to bottom)
        =====================================================================
      */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingTop: '8px',
          borderTop: `1px solid ${colors.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: colors.textMuted,
        }}
      >
        <div>Techy Tracker Expense Management System · Official Record</div>
        <div>Generated on: {nowFormatted}</div>
      </div>
    </div>
  );
};
