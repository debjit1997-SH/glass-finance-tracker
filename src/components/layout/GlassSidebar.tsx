import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Calculator,
  ArrowLeftRight,
  CreditCard,
  Target,
  TrendingUp,
  Repeat,
  BadgePercent,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export type NavTab =
  | 'dashboard'
  | 'accounts'
  | 'account-adjustment'
  | 'income'
  | 'expenses'
  | 'budget'
  | 'emi'
  | 'transfers'
  | 'credit-cards'
  | 'savings-goals'
  | 'net-worth'
  | 'recurring-bills'
  | 'tax-saver'
  | 'runway';

interface GlassSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { dueSoonItems } = useFinance();

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
    group: 'Core' | 'Advanced' | 'Planning';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: dueSoonItems.length > 0 ? dueSoonItems.length : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      group: 'Core',
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <Wallet className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'account-adjustment',
      label: 'Account adjustment',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'income',
      label: 'Income Log',
      icon: <ArrowDownLeft className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <ArrowUpRight className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'budget',
      label: 'Budget vs Actual',
      icon: <PieChart className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'emi',
      label: 'EMI & Payoff',
      icon: <Calculator className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'transfers',
      label: 'Transfers',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'credit-cards',
      label: 'Credit Cards',
      icon: <CreditCard className="w-4 h-4" />,
      group: 'Core',
    },
    {
      id: 'savings-goals',
      label: 'Savings Goals',
      icon: <Target className="w-4 h-4" />,
      group: 'Advanced',
    },
    {
      id: 'net-worth',
      label: 'Net Worth',
      icon: <TrendingUp className="w-4 h-4" />,
      group: 'Advanced',
    },
    {
      id: 'recurring-bills',
      label: 'Recurring & templates',
      icon: <Repeat className="w-4 h-4" />,
      group: 'Advanced',
    },
    {
      id: 'tax-saver',
      label: '80C / 80D Tax',
      icon: <BadgePercent className="w-4 h-4" />,
      group: 'Advanced',
    },
    {
      id: 'runway',
      label: 'Runway Calendar',
      icon: <CalendarDays className="w-4 h-4" />,
      group: 'Planning',
    },
  ];

  const handleSelect = (id: NavTab) => {
    setActiveTab(id);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-[61px] left-0 h-[calc(100vh-61px)] w-64 bg-slate-950/70 backdrop-blur-2xl border-r border-white/10 z-30 flex flex-col justify-between p-3.5 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto space-y-6 pr-1">
          {/* Group 1: Core Pages */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Tracker
            </span>
            <div className="mt-1.5 space-y-1">
              {navItems
                .filter((i) => i.group === 'Core')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/40 shadow-sm shadow-purple-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isActive
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badgeColor ||
                            'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Group 2: Advanced Wealth */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Wealth & Tax
            </span>
            <div className="mt-1.5 space-y-1">
              {navItems
                .filter((i) => i.group === 'Advanced')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/40 shadow-sm shadow-purple-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isActive
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Group 3: Forward Planning */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cashflow Projection
            </span>
            <div className="mt-1.5 space-y-1">
              {navItems
                .filter((i) => i.group === 'Planning')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/40 shadow-sm shadow-purple-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isActive
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="pt-3 border-t border-white/10 px-2 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            IndexedDB Local
          </span>
          <span className="text-[10px] text-slate-400 font-mono">v1.0</span>
        </div>
      </aside>
    </>
  );
};
