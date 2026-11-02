import React from 'react';
import { Wallet, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { DashboardKPIs } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const { formatAmount } = useTheme();

  const cards = [
    {
      id: 'total',
      title: 'Total Expenses',
      amount: kpis.totalExpenses,
      subtitle: `${kpis.totalCount} recorded transactions`,
      icon: Wallet,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'shared_to_pay',
      title: 'Shared Expenses (To Pay)',
      amount: kpis.sharedExpensesToPay,
      subtitle: 'Amount pending for your settlement',
      icon: Clock,
      iconBg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'owed_to_me',
      title: 'To Receive',
      amount: kpis.amountOwedToMe,
      subtitle: 'Amount others owe you',
      icon: ArrowDownLeft,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'net_balance',
      title: 'Net Settlement Balance',
      amount: Math.abs(kpis.netBalance),
      subtitle: kpis.netBalance >= 0 ? 'You are in credit' : 'You have net dues',
      icon: ArrowUpRight,
      iconBg:
        kpis.netBalance >= 0
          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
      prefix: kpis.netBalance >= 0 ? '+' : '-',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {c.title}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              {c.prefix && (
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {c.prefix}
                </span>
              )}
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                {formatAmount(c.amount)}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              {c.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
};
