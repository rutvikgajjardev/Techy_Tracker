import useSWR, { useSWRConfig } from 'swr';
import {
  Category,
  Expense,
  TimePeriodFilter,
  DashboardSummary,
  ExpenseFilters,
  User,
} from '../types';
import {
  swrFetcher,
  buildExpenseQueryParams,
  buildDashboardQueryParams,
  getAuthToken,
} from '../services/api';

/**
 * Hook to retrieve user-specific Dashboard Metrics, KPIs, and Charts with SWR
 */
export function useDashboard(
  period: TimePeriodFilter = 'all_time',
  customStart?: string,
  customEnd?: string
) {
  const token = getAuthToken();
  const query = buildDashboardQueryParams(period, customStart, customEnd);
  // Don't fetch if no token is available
  const key = token ? `/dashboard/summary${query}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardSummary>(
    key,
    swrFetcher,
    {
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 3000,
    }
  );

  return {
    summary: data || null,
    isLoading,
    isValidating,
    error,
    mutateDashboard: mutate,
  };
}

/**
 * Hook to fetch Categories list with SWR
 */
export function useCategories() {
  const token = getAuthToken();
  const key = token ? '/categories' : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    success: boolean;
    categories: Category[];
  }>(key, swrFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    categories: data?.categories || [],
    isLoading,
    isValidating,
    error,
    mutateCategories: mutate,
  };
}

/**
 * Hook to fetch filtered Expenses with SWR
 */
export function useExpenses(filters?: Partial<ExpenseFilters>) {
  const token = getAuthToken();
  const qs = buildExpenseQueryParams(filters);
  const key = token ? `/expenses${qs}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    success: boolean;
    count: number;
    expenses: Expense[];
  }>(key, swrFetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 500,
  });

  return {
    expenses: data?.expenses || [],
    count: data?.count || (data?.expenses ? data.expenses.length : 0),
    isLoading,
    isValidating,
    error,
    mutateExpenses: mutate,
  };
}

/**
 * Hook to fetch single Expense details (including full Audit Trail) with SWR
 */
export function useExpense(id: number | null | undefined) {
  const token = getAuthToken();
  const key = token && id ? `/expenses/${id}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    success: boolean;
    expense: Expense;
  }>(key, swrFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  return {
    expense: data?.expense || null,
    isLoading,
    isValidating,
    error,
    mutateExpense: mutate,
  };
}

/**
 * Hook to fetch active registered users for split selection and "Paid by" dropdown
 */
export function useUsers() {
  const token = getAuthToken();
  const key = token ? '/auth/users' : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    success: boolean;
    users: User[];
  }>(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    users: data?.users || [],
    isLoading,
    isValidating,
    error,
    mutateUsers: mutate,
  };
}

/**
 * Hook to check API Health
 */
export function useHealth() {
  const { data, error, isLoading } = useSWR<{
    status: string;
    service: string;
    version: string;
  }>('/health', swrFetcher, {
    refreshInterval: 30000,
    dedupingInterval: 10000,
  });

  return {
    health: data || null,
    isHealthy: data?.status === 'healthy',
    isLoading,
    error,
  };
}

/**
 * Utility hook to perform global SWR cache invalidations after mutations
 */
export function useAppMutations() {
  const { mutate } = useSWRConfig();

  const invalidateExpenses = () => {
    return mutate(
      (key) => typeof key === 'string' && (key.startsWith('/expenses') || key.startsWith('/dashboard/summary') || key.startsWith('/categories')),
      undefined,
      { revalidate: true }
    );
  };

  /**
   * Optimistically inject a newly created expense at the top of all active expense queries
   */
  const addExpenseToCache = (newExpense: Expense) => {
    return mutate(
      (key) => typeof key === 'string' && key.startsWith('/expenses'),
      (currentData: any) => {
        if (!currentData || !Array.isArray(currentData.expenses)) return currentData;
        const exists = currentData.expenses.some((e: Expense) => e.id === newExpense.id);
        if (exists) {
          return {
            ...currentData,
            expenses: currentData.expenses.map((e: Expense) =>
              e.id === newExpense.id ? newExpense : e
            ),
          };
        }
        return {
          ...currentData,
          count: (currentData.count ?? currentData.expenses.length) + 1,
          expenses: [newExpense, ...currentData.expenses],
        };
      },
      { revalidate: true }
    );
  };

  /**
   * Optimistically update an existing expense across active queries
   */
  const updateExpenseInCache = (updatedExpense: Expense) => {
    return mutate(
      (key) => typeof key === 'string' && key.startsWith('/expenses'),
      (currentData: any) => {
        if (!currentData || !Array.isArray(currentData.expenses)) return currentData;
        return {
          ...currentData,
          expenses: currentData.expenses.map((e: Expense) =>
            e.id === updatedExpense.id ? { ...e, ...updatedExpense } : e
          ),
        };
      },
      { revalidate: true }
    );
  };

  /**
   * Optimistically remove an expense across active queries
   */
  const removeExpenseFromCache = (expenseId: number) => {
    return mutate(
      (key) => typeof key === 'string' && key.startsWith('/expenses'),
      (currentData: any) => {
        if (!currentData || !Array.isArray(currentData.expenses)) return currentData;
        return {
          ...currentData,
          count: Math.max(0, (currentData.count ?? currentData.expenses.length) - 1),
          expenses: currentData.expenses.filter((e: Expense) => e.id !== expenseId),
        };
      },
      { revalidate: true }
    );
  };

  const invalidateCategories = () => {
    return mutate(
      (key) => typeof key === 'string' && (key.startsWith('/categories') || key.startsWith('/expenses') || key.startsWith('/dashboard/summary')),
      undefined,
      { revalidate: true }
    );
  };

  const invalidateAll = () => {
    return mutate(() => true, undefined, { revalidate: true });
  };

  return {
    invalidateExpenses,
    invalidateCategories,
    invalidateAll,
    addExpenseToCache,
    updateExpenseInCache,
    removeExpenseFromCache,
  };
}
