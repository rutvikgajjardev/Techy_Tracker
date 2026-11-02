import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  formatAmount: (amount: number, decimals?: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('techy_traker_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark', 'bg-slate-950', 'text-slate-50');
      body.classList.remove('bg-slate-50', 'text-slate-900', 'bg-neutral-50', 'text-neutral-900');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark', 'bg-slate-950', 'text-slate-50');
      body.classList.add('bg-slate-50', 'text-slate-900');
    }
    localStorage.setItem('techy_traker_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Hardcoded exclusively to Indian Rupees (INR / ₹)
  const formatAmount = (amount: number, decimals = 2) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        formatAmount,
      }}
    >
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
