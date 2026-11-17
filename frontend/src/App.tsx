import React, { useState, useEffect } from 'react';
import { SWRConfig } from 'swr';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { UpiSettingsPage } from './pages/UpiSettingsPage';
import { AuthPage } from './pages/AuthPage';
import { ConfirmDialog } from './components/ui/Dialog';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { ProfileModal } from './components/ui/ProfileModal';
import { Expense } from './types';
import { apiService, swrFetcher } from './services/api';
import { useCategories, useAppMutations } from './hooks/useApi';

const MainAppContent: React.FC = () => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('techy_sidebar_collapsed') === 'true';
  });

  // SWR categories hook for form and views
  const { categories } = useCategories();
  const {
    invalidateExpenses,
    invalidateCategories,
    addExpenseToCache,
    updateExpenseInCache,
    removeExpenseFromCache,
  } = useAppMutations();

  // Syncing state & recent created tracking for smooth visual transitions
  const [isSyncingExpense, setIsSyncingExpense] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [recentCreatedId, setRecentCreatedId] = useState<number | null>(null);

  // Expense Selection & Form State
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [formExpense, setFormExpense] = useState<Expense | null>(null);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordActive, setIsChangePasswordActive] = useState(false);
  const [isUpiSettingsActive, setIsUpiSettingsActive] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Guarantee that every time a user logs in or switches accounts, they always start cleanly on the Dashboard screen
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setCurrentTab('dashboard');
      setIsExpenseFormOpen(false);
      setFormExpense(null);
      setIsChangePasswordActive(false);
      setIsUpiSettingsActive(false);
      setSelectedExpense(null);
    }
  }, [isAuthenticated, currentUser?.id]);

  // If user is not logged in, show Login / Register screen
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthPage />
      </>
    );
  }

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('techy_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Handlers
  const handleOpenNewExpense = () => {
    setFormExpense(null);
    setIsExpenseFormOpen(true);
    setSelectedExpense(null);
    setCurrentTab('expenses');
  };

  const handleOpenEditExpense = (expense: Expense) => {
    if (expense.status === 'COMPLETED') {
      addToast('info', 'Completed expenses cannot be edited.');
      return;
    }
    setFormExpense(expense);
    setIsExpenseFormOpen(true);
    setSelectedExpense(null);
    setCurrentTab('expenses');
  };

  const handleOpenDetailView = async (expense: Expense) => {
    setSelectedExpense(expense);
    setIsExpenseFormOpen(false);
    setFormExpense(null);
    setCurrentTab('expenses');

    // Fetch full expense details from backend to ensure all participants, audit trail, images are fully populated
    if (!expense.participants || !expense.auditTrail) {
      try {
        const fullExpense = await apiService.getExpense(expense.id);
        if (fullExpense) {
          setSelectedExpense(fullExpense);
        }
      } catch (err) {
        console.warn('Could not fetch full expense detail:', err);
      }
    }
  };

  const handleRequestDeleteExpense = (expense: Expense) => {
    setDeletingExpense(expense);
    setDeletingExpenseId(expense.id);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpense || isDeletingExpense) return;
    const target = deletingExpense;
    setIsDeletingExpense(true);
    setDeletingExpenseId(target.id);
    try {
      await apiService.deleteExpense(target.id);
      await removeExpenseFromCache(target.id);
      addToast('success', `Expense "${target.title}" deleted successfully.`);
      if (selectedExpense?.id === target.id) {
        setSelectedExpense(null);
      }
      setDeletingExpense(null);
      // Revalidate SWR caches instantly across all tabs & views
      await invalidateExpenses();
      await invalidateCategories();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete expense.');
    } finally {
      setIsDeletingExpense(false);
      setDeletingExpenseId(null);
    }
  };

  const handleSaveExpense = async (data: any) => {
    try {
      if (formExpense) {
        // Edit mode: await API update directly, then close form smoothly
        const updated = await apiService.updateExpense(formExpense.id, data, currentUser);
        await updateExpenseInCache(updated);
        addToast('success', `Expense "${updated.title}" updated.`);
        if (selectedExpense?.id === updated.id) {
          setSelectedExpense(updated);
        }
        setIsExpenseFormOpen(false);
        setFormExpense(null);
        await invalidateExpenses();
        await invalidateCategories();
      } else {
        // Create mode: await API creation directly, then close form smoothly
        const created = await apiService.createExpense(data, currentUser);
        await addExpenseToCache(created);
        setRecentCreatedId(created.id);
        addToast('success', `Expense "${created.title}" recorded successfully.`);
        setIsExpenseFormOpen(false);
        setFormExpense(null);
        await invalidateExpenses();
        await invalidateCategories();

        // Clear highlight badge after 4.5 seconds
        setTimeout(() => {
          setRecentCreatedId(null);
        }, 4500);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error saving expense.');
      throw err;
    }
  };

  const handleToggleExpenseStatus = async (expense: Expense) => {
    const nextStatus = expense.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const updated = await apiService.updateExpense(
        expense.id,
        { status: nextStatus },
        currentUser
      );
      setSelectedExpense(updated);
      addToast('success', `Status updated to ${nextStatus}.`);
      await invalidateExpenses();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to toggle status.');
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    setCurrentTab('dashboard');
    setIsExpenseFormOpen(false);
    setFormExpense(null);
    setIsChangePasswordActive(false);
    setIsUpiSettingsActive(false);
    setSelectedExpense(null);
    logout();
    addToast('info', 'You have been logged out of Techy Tracker.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex transition-colors duration-200">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          setIsChangePasswordActive(false);
          setIsUpiSettingsActive(false);
          // Always land on the main screen of the selected tab, closing any in-progress expense form or detail view
          setIsExpenseFormOpen(false);
          setFormExpense(null);
          setSelectedExpense(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onRequestLogout={() => setIsLogoutDialogOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenChangePassword={() => {
          setIsUpiSettingsActive(false);
          setIsChangePasswordActive(true);
        }}
        onOpenUpiSettings={() => {
          setIsChangePasswordActive(false);
          setIsUpiSettingsActive(true);
        }}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'
        }`}
      >
        {/* Top Header */}
        <Header
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1">
          {isChangePasswordActive ? (
            <ChangePasswordPage
              onBack={() => setIsChangePasswordActive(false)}
              onSuccessToast={msg => addToast('success', msg)}
            />
          ) : isUpiSettingsActive ? (
            <UpiSettingsPage
              onBack={() => setIsUpiSettingsActive(false)}
              onNotify={(type, msg) => addToast(type, msg)}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  onNavigateToExpenses={() => {
                    setCurrentTab('expenses');
                    setIsExpenseFormOpen(false);
                    setFormExpense(null);
                    setSelectedExpense(null);
                  }}
                  onSelectExpense={handleOpenDetailView}
                  onNotify={(type, msg) => addToast(type, msg)}
                  onOpenNewExpense={handleOpenNewExpense}
                />
              )}

              {currentTab === 'expenses' && (
                <ExpensesPage
                  onSelectExpense={handleOpenDetailView}
                  onEditExpense={handleOpenEditExpense}
                  onRequestDeleteExpense={handleRequestDeleteExpense}
                  onOpenNewExpense={handleOpenNewExpense}
                  isFormOpen={isExpenseFormOpen}
                  formExpense={formExpense}
                  onCloseForm={() => {
                    setIsExpenseFormOpen(false);
                    setFormExpense(null);
                  }}
                  onSubmitForm={handleSaveExpense}
                  selectedExpense={selectedExpense}
                  onCloseDetail={() => setSelectedExpense(null)}
                  onToggleStatus={handleToggleExpenseStatus}
                  categories={categories}
                  isSyncingExpense={isSyncingExpense}
                  syncMessage={syncMessage}
                  recentCreatedId={recentCreatedId}
                  deletingExpenseId={deletingExpenseId}
                />
              )}

              {currentTab === 'categories' && (
                <CategoriesPage
                  onNotify={(type, msg) => addToast(type, msg)}
                  onSelectExpense={handleOpenDetailView}
                  onEditExpense={handleOpenEditExpense}
                  onRequestDeleteExpense={handleRequestDeleteExpense}
                  onOpenNewExpense={handleOpenNewExpense}
                  deletingExpenseId={deletingExpenseId}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Confirm Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title={`Delete "${deletingExpense?.title}"?`}
        message="Are you sure you want to permanently delete this expense? This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        tone="danger"
        isLoading={isDeletingExpense}
        loadingLabel="Deleting Expense..."
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => {
          if (!isDeletingExpense) {
            setDeletingExpense(null);
            setDeletingExpenseId(null);
          }
        }}
      />

      {/* Confirm Logout Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Logout of Techy Tracker?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutDialogOpen(false)}
      />

      {/* Profile & UPI Management Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2500,
        shouldRetryOnError: false,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
