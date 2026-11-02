export type ExpenseStatus = 'PENDING' | 'COMPLETED';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  upi_id?: string | null;
  profileImage?: string | null;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  expenseCount?: number;
  totalSpent?: number;
}

export interface ExpenseParticipant {
  userId: number;
  name: string;
  email?: string;
  upi_id?: string | null;
  shareAmount: number;
  isSettled: boolean;
  settledAt?: string | null;
  owesToUserId?: number | null;
  owesToName?: string | null;
  owesToUpiId?: string | null;
}

export interface AuditDiffItem {
  field: string;
  old?: string | number | null;
  new?: string | number | null;
  added?: string[];
  removed?: string[];
}

export interface AuditLogEntry {
  id: number;
  expenseId: number;
  actorId: number;
  actorName: string;
  actorEmail?: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'SETTLED' | 'DELETED';
  summary: string;
  diff: AuditDiffItem[];
  createdAt: string;
}

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  status: ExpenseStatus;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  categoryName: string;
  createdById: number;
  createdByName: string;
  paidById: number;
  paidByName: string;
  paidByUpiId?: string | null;
  images?: string[];
  participants: ExpenseParticipant[];
  auditTrail?: AuditLogEntry[];
}

export type TimePeriodFilter = 'all_time' | 'this_year' | 'this_month' | 'this_week' | 'custom';

export interface DashboardKPIs {
  totalExpenses: number;
  sharedExpensesToPay: number;
  amountOwedToMe: number;
  netBalance: number;
  totalCount: number;
}

export interface CategoryDistribution {
  id: number;
  name: string;
  value: number;
  color: string;
  count: number;
}

export interface SpendingTrendPoint {
  date: string;
  amount: number;
}

export interface DashboardSummary {
  period: TimePeriodFilter;
  kpis: DashboardKPIs;
  categoryBreakdown: CategoryDistribution[];
  spendingTrends: SpendingTrendPoint[];
  recentExpenses: Expense[];
}

export interface ExpenseFilters {
  status: 'ALL' | 'PENDING' | 'COMPLETED';
  dateRange: 'all' | 'year' | 'month' | 'week' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  paidByUserId?: number | 'all';
  categoryId?: number | 'all';
  sortBy: 'newer' | 'older' | 'amount_high' | 'amount_low';
  search: string;
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}
