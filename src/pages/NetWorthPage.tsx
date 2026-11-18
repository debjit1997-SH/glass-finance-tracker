import { outstandingPrincipal } from '../services/financeRules';
import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCardSkeleton, ChartSkeleton } from '../components/ui/GlassSkeleton';
import {
  TrendingUp,
  Camera,
  ShieldCheck,
  Landmark,
  CreditCard,
  Calculator,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const NetWorthPage: React.FC = () => {
  const {
    accounts,
    liveBalances,
    emis,
    creditCards,
    dashboardMetrics,
    netWorthSnapshots,
    createMonthlyNetWorthSnapshot,
    selectedMonth,
    settings,
    isStoreLoading,
  } = useFinance();

  // Compute live current snapshot
  const liquidTotal = accounts
    .filter((a) => a.type === 'bank' || a.type === 'wallet')
    .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);

  const cashTotal = accounts
    .filter((a) => a.type === 'cash')
    .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);

  const investTotal = accounts
    .filter((a) => a.type === 'investment')
    .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);

  const totalCurrentAssets = liquidTotal + cashTotal + investTotal;

  const emiPrincipal = emis.reduce((sum, e) => sum + outstandingPrincipal(e), 0);
  const creditCardsDebt = dashboardMetrics.totalCardOutstanding;
  const totalCurrentLiabilities = emiPrincipal + creditCardsDebt;

  const currentNetWorth = totalCurrentAssets - totalCurrentLiabilities;

  // Chart data from recorded snapshots + current live
  const chartData = netWorthSnapshots.map((s) => ({
    month: s.month,
    Assets: s.totalAssets,
    Liabilities: s.totalLiabilities,
    NetWorth: s.netWorth,
  }));

  const handleCaptureSnapshot = async () => {
    await createMonthlyNetWorthSnapshot();
  };

  if (isStoreLoading('netWorthSnapshots') && netWorthSnapshots.length === 0 && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton height="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Net Worth Tracker &amp; Wealth Trajectory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total Assets (Liquid Bank, Cash, Investments) minus Total Liabilities (EMI Principal &amp; Card Debt)
          </p>
        </div>

        <button
          onClick={handleCaptureSnapshot}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Save {selectedMonth} Snapshot</span>
        </button>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Worth */}
        <GlassCard
          glow={currentNetWorth >= 0 ? 'emerald' : 'rose'}
          className="p-5 border-purple-500/25 relative overflow-hidden"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            Live Net Worth
          </div>
          <div
            className={`text-3xl font-extrabold mt-1 tracking-tight font-mono ${
              currentNetWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {currentNetWorth >= 0 ? '+' : ''}
            {settings.currency}
            {currentNetWorth.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {currentNetWorth >= 0
              ? 'Assets exceed liabilities'
              : 'Liabilities exceed assets (building debt equity)'}
          </div>
        </GlassCard>

        {/* Total Assets */}
        <GlassCard className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Assets
          </div>
          <div className="text-3xl font-bold text-white mt-1 tracking-tight font-mono">
            {settings.currency}
            {totalCurrentAssets.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Bank ({settings.currency}{liquidTotal.toLocaleString('en-IN')}) + Investments (
            {settings.currency}{investTotal.toLocaleString('en-IN')})
          </div>
        </GlassCard>

        {/* Total Liabilities */}
        <GlassCard className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Liabilities
          </div>
          <div className="text-3xl font-bold text-rose-300 mt-1 tracking-tight font-mono">
            {settings.currency}
            {totalCurrentLiabilities.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-rose-400 mt-1 flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            EMI Principal ({settings.currency}{emiPrincipal.toLocaleString('en-IN')}) + Cards (
            {settings.currency}{creditCardsDebt.toLocaleString('en-IN')})
          </div>
        </GlassCard>
      </div>

      {/* Historical Trend Chart */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Net Worth Growth Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Monthly historical progression of total assets, liabilities, and compounding net worth
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500" /> Assets
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" /> Liabilities
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Net Worth
            </span>
          </div>
        </div>

        <div className="h-72 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) =>
                  `${settings.currency}${val >= 100000 ? `${val / 100000}L` : val}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  fontSize: '12px',
                }}
                formatter={(val: any, name: any) => [
                  `${settings.currency}${Number(val).toLocaleString('en-IN')}`,
                  name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="Assets"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#assetGrad)"
              />
              <Area
                type="monotone"
                dataKey="Liabilities"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#liabGrad)"
              />
              <Area
                type="monotone"
                dataKey="NetWorth"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#netGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Assets detailed */}
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" />
            Asset Portfolio Breakdown
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">Checking &amp; Savings Balances</div>
                <div className="text-[11px] text-slate-400">Liquid bank accounts</div>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {settings.currency}
                {liquidTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">Investments &amp; Demat Portfolios</div>
                <div className="text-[11px] text-slate-400">Mutual funds, equities, PF</div>
              </div>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {settings.currency}
                {investTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">Cash in Hand</div>
                <div className="text-[11px] text-slate-400">Physical currency holdings</div>
              </div>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {settings.currency}
                {cashTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Liabilities detailed */}
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-rose-400" />
            Liability Obligations Breakdown
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">EMI Loan Principal Remaining</div>
                <div className="text-[11px] text-slate-400">Mortgages, auto loans, personal debt</div>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                {settings.currency}
                {emiPrincipal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">Credit Card Total Outstanding</div>
                <div className="text-[11px] text-slate-400">Unbilled swipes + statement dues</div>
              </div>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {settings.currency}
                {creditCardsDebt.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
