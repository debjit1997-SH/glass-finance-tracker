import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCard } from '../components/ui/StatCard';
import { DueSoonBanner } from '../components/layout/DueSoonBanner';
import { GaugeChart } from '../components/ui/GaugeChart';
import { StatCardSkeleton, ChartSkeleton } from '../components/ui/GlassSkeleton';
import { getMonthlyEmiInstances } from '../services/calculations';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenExpense,
  onOpenIncome,
  onOpenTransfer,
}) => {
  const {
    isPageLoading,
    accounts,
    dashboardMetrics,
    emergencyHealth,
    settings,
    updateSettings,
    selectedMonth,
    incomes,
    expenses,
    emis,
    emiPayments,
  } = useFinance();

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(settings.savingsRateTarget.toString());

  // Save new user savings rate target
  const handleSaveTarget = async () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      await updateSettings({ savingsRateTarget: val });
    }
    setIsEditingTarget(false);
  };

  // Generate 6-month historical sparkline & trend data
  const trendData = React.useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const result: {
      monthKey: string;
      label: string;
      income: number;
      expense: number;
      emi: number;
      savingsRate: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      let targetM = m - i;
      let targetY = y;
      if (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      const key = `${targetY}-${String(targetM).padStart(2, '0')}`;
      const monthDate = new Date(targetY, targetM - 1, 1);
      const label = monthDate.toLocaleDateString('en-US', { month: 'short' });

      // Income in month
      const incTotal = incomes
        .filter((inc) => inc.date.startsWith(key))
        .reduce((s, inc) => s + (inc.status === 'Received' ? inc.actualAmount || inc.expectedAmount : inc.expectedAmount), 0);

      // Expense in month
      const expTotal = expenses
        .filter((exp) => exp.date.startsWith(key))
        .reduce((s, exp) => s + (exp.status === 'Paid' ? exp.actualAmount || exp.expectedAmount : exp.expectedAmount), 0);

      // EMI in month using active monthly instances
      const monthlyInstances = getMonthlyEmiInstances(emis, emiPayments, key);
      const emiTotal = monthlyInstances.reduce((s, inst) => s + inst.amount, 0);

      const netSavings = incTotal - expTotal - emiTotal;
      const rate = incTotal > 0 ? (netSavings / incTotal) * 100 : 0;

      result.push({
        monthKey: key,
        label,
        income: incTotal,
        expense: expTotal,
        emi: emiTotal,
        savingsRate: Math.round(rate),
      });
    }

    return result;
  }, [selectedMonth, incomes, expenses, emis, emiPayments]);

  const {
    openingBalance,
    totalIncome,
    totalExpense,
    totalEmi,
    netBalanceInHand,
    totalCardOutstanding,
    savingsRate,
  } = dashboardMetrics;

  const isTargetAchieved = savingsRate >= settings.savingsRateTarget;

  if (isPageLoading('dashboard') && accounts.length === 0 && expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartSkeleton height="h-72" />
          <ChartSkeleton height="h-72" />
          <ChartSkeleton height="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Due Soon Banner */}
      <DueSoonBanner />

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Opening Balance */}
        <StatCard
          title="Opening Balance"
          value={openingBalance}
          prefix={settings.currency}
          subtext="Liquid assets on month start"
          icon={<Wallet className="w-5 h-5" />}
          accentColor="blue"
        />

        {/* 2. Total Income */}
        <StatCard
          title="Total Income"
          value={totalIncome}
          prefix={settings.currency}
          subtext="Salary, consulting & yields"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          accentColor="emerald"
        />

        {/* 3. Total Expense excl. EMI */}
        <StatCard
          title="Total Expense"
          value={totalExpense}
          prefix={settings.currency}
          subtext="Excl. EMI loans"
          icon={<ArrowUpRight className="w-5 h-5" />}
          accentColor="rose"
        />

        {/* 4. Total EMI */}
        <StatCard
          title="Total EMI"
          value={totalEmi}
          prefix={settings.currency}
          subtext="Mortgage & auto debts"
          icon={<Calculator className="w-5 h-5" />}
          accentColor="purple"
        />

        {/* 5. Net Balance in Hand */}
        <StatCard
          title="Balance in Hand"
          value={netBalanceInHand}
          prefix={settings.currency}
          subtext="Live liquid checking & cash"
          icon={<PiggyBank className="w-5 h-5" />}
          accentColor="indigo"
        />

        {/* 6. Total Outstanding Credit Card */}
        <StatCard
          title="Credit Card Debt"
          value={totalCardOutstanding}
          prefix={settings.currency}
          subtext="Unbilled & statement dues"
          icon={<CreditCard className="w-5 h-5" />}
          accentColor="amber"
        />
      </div>

      {/* Second Row: Savings Rate KPI + Emergency Fund Gauge + Quick Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings Rate KPI Card with Sparkline & User Target */}
        <GlassCard glow={isTargetAchieved ? 'emerald' : 'amber'} className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">Savings Rate KPI</h3>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Target:</span>
                {isEditingTarget ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="w-14 px-1.5 py-0.5 rounded text-xs bg-slate-900 border border-purple-500/50 text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTarget}
                      className="text-[10px] px-1.5 py-0.5 bg-purple-600 text-white rounded font-bold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setTargetInput(settings.savingsRateTarget.toString());
                      setIsEditingTarget(true);
                    }}
                    className="text-xs font-bold text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 px-2 py-0.5 rounded border border-purple-500/30 transition-colors"
                    title="Click to change target"
                  >
                    {settings.savingsRateTarget}%
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              (Total Income − Total Expense − Total EMI) ÷ Total Income
            </p>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span
                  className={`text-4xl font-extrabold tracking-tight ${
                    isTargetAchieved ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {savingsRate.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 ml-2">this month</span>
              </div>

              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  isTargetAchieved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isTargetAchieved ? 'Target Met 🎯' : 'Under Target ⚠️'}
              </span>
            </div>
          </div>

          {/* 6-Month Savings Rate Sparkline */}
          <div className="mt-5 pt-3 border-t border-white/10">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>6-Month Savings Rate Trend</span>
              <span className="text-purple-300">Goal: {settings.savingsRateTarget}%</span>
            </div>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Savings Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="savingsRate"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Emergency Fund Health Check Gauge */}
        <GlassCard
          glow={emergencyHealth.isHealthy ? 'emerald' : 'amber'}
          className="p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">Emergency Fund Check</h3>
              </div>
              <button
                onClick={() => onNavigate('savings-goals')}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                Goals <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Current Emergency Fund ÷ 3-Month Avg Expense (excl. EMI)
            </p>
          </div>

          <div className="my-2">
            <GaugeChart
              value={emergencyHealth.monthsCovered}
              targetMin={emergencyHealth.targetMin}
              targetMax={emergencyHealth.targetMax}
              label={emergencyHealth.statusText}
              subtext={`Avg Expense: ${settings.currency}${Math.round(
                emergencyHealth.avgExpense
              ).toLocaleString('en-IN')}/mo`}
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span>
              Corpus: {settings.currency}
              {emergencyHealth.currentEmergencyFund.toLocaleString('en-IN')}
            </span>
            <span
              className={`font-semibold ${
                emergencyHealth.isHealthy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {emergencyHealth.isHealthy ? 'Safe Buffer' : 'Needs Buffer'}
            </span>
          </div>
        </GlassCard>

        {/* Quick Launch & Balance Overview */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Financial Velocity
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Instant logging and live balance reconciliation
            </p>

            <div className="space-y-2.5">
              <button
                onClick={onOpenExpense}
                className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-rose-500/30 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Record Expense</div>
                    <div className="text-[10px] text-slate-400">Grocery, dining, bills</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
              </button>

              <button
                onClick={onOpenIncome}
                className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-emerald-500/30 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Record Income</div>
                    <div className="text-[10px] text-slate-400">Salary, client payouts</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={onOpenTransfer}
                className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-cyan-500/30 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Inter-Account Transfer</div>
                    <div className="text-[10px] text-slate-400">Safe balance movement</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Runway check</span>
            <button
              onClick={() => onNavigate('runway')}
              className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              Open Calendar <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Third Row: Income vs Expense Trend Chart */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Income vs. Expense vs. EMI Breakdown (6-Month Trend)
            </h3>
            <p className="text-xs text-slate-400">
              Live visual comparison of earnings, routine expenditures, and debt obligations
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" /> Expense
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500" /> EMI
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) => `${settings.currency}${val >= 1000 ? `${val / 1000}k` : val}`}
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
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
              />
              <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="emi" name="emi" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
};
