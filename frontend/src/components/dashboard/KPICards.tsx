import React from 'react';
import { Wallet, Receipt, Scale, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { DashboardKPIs } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const { formatAmount } = useTheme();

  const isNetPositive = kpis.netBalance > 0.001;
  const isNetNegative = kpis.netBalance < -0.001;

  const cards = [
    {
      id: 'total_spend',
      title: 'My Total Spend',
      displayValue: formatAmount(kpis.totalExpenses),
      subtitle: 'Your personal consumption share',
      icon: Wallet,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'recorded_bills',
      title: 'Recorded Bills',
      displayValue: `${kpis.totalCount} ${kpis.totalCount === 1 ? 'Transaction' : 'Transactions'}`,
      subtitle: 'Total shared & personal bills in period',
      icon: Receipt,
      iconBg: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'overall_balance',
      title: 'Overall Net Balance',
      displayValue: `${isNetPositive ? '+ ' : isNetNegative ? '- ' : ''}${formatAmount(Math.abs(kpis.netBalance))}`,
      subtitle: isNetPositive
        ? 'You are owed money overall (to collect)'
        : isNetNegative
          ? 'You have net dues overall (to pay)'
          : 'All mutual balances settled (zero dues)',
      icon: isNetPositive ? ArrowUpRight : isNetNegative ? ArrowDownLeft : CheckCircle2,
      iconBg: isNetPositive
        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
        : isNetNegative
          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                {c.displayValue}
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
