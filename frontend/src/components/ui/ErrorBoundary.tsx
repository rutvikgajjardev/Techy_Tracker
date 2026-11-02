import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Exception in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearAndLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              An unexpected error occurred while rendering the page. Don't worry, your data is safe on the server.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 line-clamp-3 break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndLogout}
                className="w-full sm:w-auto py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset session and return to Login"
              >
                <LogOut className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
