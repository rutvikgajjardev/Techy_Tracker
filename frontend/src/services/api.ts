import {
  Category,
  Expense,
  TimePeriodFilter,
  DashboardSummary,
  ExpenseFilters,
  User,
} from '../types';

export const TOKEN_STORAGE_KEY = 'techy_traker_jwt_token_v2';
export const ACTIVE_USER_STORAGE_KEY = 'techy_traker_active_user_v2';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Global HTTP request helper with automatic Authorization header
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (isJson && data?.error) ||
      (isJson && data?.message) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    
    // Auto-logout if token expired or invalid
    if (response.status === 401 && token) {
      console.warn('Authentication token expired or rejected. Clearing session.');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Standard SWR Fetcher
 */
export const swrFetcher = async <T = any>(url: string): Promise<T> => {
  return request<T>(url);
};

/**
 * Build URL search params for expenses query
 */
export function buildExpenseQueryParams(filters?: Partial<ExpenseFilters>): string {
  if (!filters) return '';
  const params = new URLSearchParams();

  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status.toLowerCase());
  }
  if (filters.categoryId && filters.categoryId !== 'all') {
    params.set('category_id', String(filters.categoryId));
  }
  if (filters.dateRange && filters.dateRange !== 'all') {
    params.set('date_range', filters.dateRange);
  }
  if (filters.customStartDate) {
    params.set('start_date', filters.customStartDate);
  }
  if (filters.customEndDate) {
    params.set('end_date', filters.customEndDate);
  }
  if (filters.paidByUserId && filters.paidByUserId !== 'all') {
    params.set('paid_by', String(filters.paidByUserId));
  }
  if (filters.sortBy) {
    params.set('sort', filters.sortBy);
  }
  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Build URL search params for dashboard summary query
 */
export function buildDashboardQueryParams(
  period: TimePeriodFilter = 'all_time',
  customStart?: string,
  customEnd?: string
): string {
  const params = new URLSearchParams();
  params.set('period', period);
  if (period === 'custom' && customStart && customEnd) {
    params.set('start_date', customStart);
    params.set('end_date', customEnd);
  }
  return `?${params.toString()}`;
}

/**
 * High-level API Service interacting directly with backend Flask endpoints
 */
export const apiService = {
  // ============================================
  // 1. AUTHENTICATION & USERS
  // ============================================
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(data.user));
    return { token: data.token, user: data.user };
  },

  async register(name: string, email: string, password: string, upi_id?: string): Promise<{ token: string; user: User }> {
    const body: Record<string, string> = { name, email, password };
    if (upi_id && upi_id.trim()) {
      body.upi_id = upi_id.trim();
    }
    const data = await request<{ success: boolean; message: string; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    if (data.user) {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(data.user));
    }
    return { token: data.token, user: data.user };
  },

  async updateProfile(payload: { name?: string; upi_id?: string | null }): Promise<{ user: User }> {
    const data = await request<{ success: boolean; message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(data.user));
    return { user: data.user };
  },

  async getCurrentUser(): Promise<User> {
    const data = await request<{ success: boolean; user: User }>('/auth/me');
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async getUsers(): Promise<User[]> {
    const data = await request<{ success: boolean; users: User[] }>('/auth/users');
    return data.users || [];
  },

  // ============================================
  // 2. HEALTH CHECK
  // ============================================
  async getHealth(): Promise<{ status: string; service: string; version: string }> {
    return request<{ status: string; service: string; version: string }>('/health');
  },

  // ============================================
  // 3. DASHBOARD METRICS
  // ============================================
  async getDashboardSummary(
    period: TimePeriodFilter = 'all_time',
    _currentUserId?: number,
    customStart?: string,
    customEnd?: string
  ): Promise<DashboardSummary> {
    const qs = buildDashboardQueryParams(period, customStart, customEnd);
    const data = await request<DashboardSummary>(`/dashboard/summary${qs}`);
    return data;
  },

  // ============================================
  // 4. CATEGORIES CRUD
  // ============================================
  async getCategories(): Promise<Category[]> {
    const data = await request<{ success: boolean; categories: Category[] }>('/categories');
    return data.categories || [];
  },

  async createCategory(payload: { name: string; icon?: string }): Promise<Category> {
    const data = await request<{ success: boolean; message: string; category: Category }>(
      '/categories',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return data.category;
  },

  async updateCategory(
    id: number,
    payload: { name: string; icon?: string }
  ): Promise<Category> {
    const data = await request<{ success: boolean; message: string; category: Category }>(
      `/categories/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    return data.category;
  },

  async deleteCategory(id: number): Promise<void> {
    await request<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // 5. EXPENSES CRUD & AUDIT
  // ============================================
  async getExpenses(filters?: Partial<ExpenseFilters>): Promise<Expense[]> {
    const qs = buildExpenseQueryParams(filters);
    const data = await request<{ success: boolean; count: number; expenses: Expense[] }>(
      `/expenses${qs}`
    );
    return data.expenses || [];
  },

  async getExpense(id: number): Promise<Expense> {
    const data = await request<{ success: boolean; expense: Expense }>(`/expenses/${id}`);
    return data.expense;
  },

  async createExpense(
    payload: {
      title: string;
      description?: string;
      amount: number;
      categoryId: number;
      paidById: number;
      participantUserIds: number[];
      expenseDate?: string;
      images?: string[];
    },
    _currentUser?: any
  ): Promise<Expense> {
    const data = await request<{ success: boolean; expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.expense;
  },

  async updateExpense(
    id: number,
    payload: {
      title?: string;
      description?: string;
      amount?: number;
      categoryId?: number;
      paidById?: number;
      participantUserIds?: number[];
      status?: 'PENDING' | 'COMPLETED';
      images?: string[];
    },
    _currentUser?: any
  ): Promise<Expense> {
    const data = await request<{ success: boolean; expense: Expense }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.expense;
  },

  async deleteExpense(id: number): Promise<void> {
    await request<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleParticipantSettle(expenseId: number, userId: number): Promise<Expense> {
    const data = await request<{ success: boolean; expense: Expense }>(
      `/expenses/${expenseId}/participants/${userId}/toggle-settle`,
      { method: 'POST' }
    );
    return data.expense;
  },

  // ============================================
  // 6. CLOUDINARY MULTI-IMAGE UPLOADER
  // ============================================
  async uploadImages(
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<{
    success: boolean;
    urls: string[];
    images: { url: string; public_id: string; filename: string }[];
  }> {
    const formData = new FormData();
    files.forEach(f => {
      formData.append('images', f);
    });

    const token = getAuthToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && onProgress) {
            // Keep at 95% until server response completes Cloudinary upload
            const percent = Math.min(Math.round((evt.loaded / evt.total) * 95), 95);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100);
            resolve({
              success: true,
              urls: data.urls || (data.url ? [data.url] : []),
              images: data.images || [],
            });
          } else {
            reject(new Error(data?.error || data?.message || 'Failed to upload images'));
          }
        } catch (e: any) {
          reject(new Error(e.message || 'Failed to parse upload response'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during image upload. Please check your connection.'));
      };

      xhr.send(formData);
    });
  },

  // ============================================
  // 7. PASSWORD VERIFICATION & CHANGE
  // ============================================
  async verifyPassword(currentPassword: string): Promise<boolean> {
    const data = await request<{ success: boolean; message: string }>('/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword }),
    });
    return data.success;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<string> {
    const data = await request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    return data.message || 'Password changed successfully';
  },

  // ============================================
  // 8. 2-STEP FORGOT PASSWORD VIA GMAIL SMTP OTP
  // ============================================
  // Step 1: Request 6-digit verification OTP sent to user's email
  async sendForgotPasswordOtp(email: string): Promise<string> {
    const data = await request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data.message || 'Verification code sent to your email';
  },

  // Step 2: Verify OTP and set new password
  async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<string> {
    const data = await request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
    });
    return data.message || 'Password reset successfully';
  },

  // Backward compatibility alias
  async resetPassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
    otp: string = ''
  ): Promise<string> {
    return this.resetPasswordWithOtp(email, otp, newPassword, confirmPassword);
  },
};
