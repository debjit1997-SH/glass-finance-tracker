import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { StatCardSkeleton, ChartSkeleton, AccountCardSkeleton } from '../components/ui/GlassSkeleton';
import {
  PieChart,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const BudgetVsActualPage: React.FC = () => {
  const {
    budgetCategories: contextBudgetCategories,
    expenses,
    selectedMonth,
    updateBudgetCategoryLimit,
    settings,
    isStoreLoading,
  } = useFinance();

  // If budgetCategories is empty, provide sensible default categories
  const budgetCategories = useMemo(() => {
    return contextBudgetCategories.length > 0 ? contextBudgetCategories : [
      { id: 'b-food', category: 'Food & Dining', monthlyLimit: 15000 },
      { id: 'b-groceries', category: 'Groceries', monthlyLimit: 12000 },
      { id: 'b-rent', category: 'Housing & Rent', monthlyLimit: 25000 },
      { id: 'b-util', category: 'Utilities', monthlyLimit: 5000 },
      { id: 'b-trans', category: 'Transportation', monthlyLimit: 6000 },
      { id: 'b-ent', category: 'Entertainment', monthlyLimit: 4000 },
      { id: 'b-shop', category: 'Shopping', monthlyLimit: 8000 },
      { id: 'b-health', category: 'Health & Fitness', monthlyLimit: 3000 },
      { id: 'b-misc', category: 'Miscellaneous', monthlyLimit: 5000 },
    ];
  }, [contextBudgetCategories]);

  const [editingCategory, setEditingCategory] = useState<{
    name: string;
    limit: number;
  } | null>(null);

  const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6);
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<string>('All');

  // Sum actual expenses per category for selectedMonth directly in frontend from expenses
  const monthlyCategorySpending = useMemo(() => {
    const map = new Map<string, number>();
    budgetCategories.forEach((c) => map.set(c.category, 0));

    expenses
      .filter((e) => e.date.startsWith(selectedMonth) && e.status === 'Paid')
      .forEach((e) => {
        const current = map.get(e.category) || 0;
        map.set(e.category, current + (e.actualAmount ?? e.expectedAmount));
      });

    return map;
  }, [budgetCategories, expenses, selectedMonth]);

  // Aggregate totals
  const totalBudget = budgetCategories.reduce((s, c) => s + c.monthlyLimit, 0);
  const totalActual = Array.from(monthlyCategorySpending.values()).reduce(
    (s, v) => s + v,
    0
  );
  const totalVariance = totalBudget - totalActual;
  const totalPercentUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // Multi-month category trend computation
  const trendData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthsList: { key: string; label: string }[] = [];

    for (let i = trendRange - 1; i >= 0; i--) {
      let targetM = m - i;
      let targetY = y;
      if (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      const key = `${targetY}-${String(targetM).padStart(2, '0')}`;
      const monthDate = new Date(targetY, targetM - 1, 1);
      monthsList.push({
        key,
        label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      });
    }

    return monthsList.map(({ key, label }) => {
      const entry: any = { month: label };
      const paidInMonth = expenses.filter(
        (e) => e.date.startsWith(key) && e.status === 'Paid'
      );

      budgetCategories.forEach((cat) => {
        const catSpent = paidInMonth
          .filter((e) => e.category === cat.category)
          .reduce((sum, e) => sum + (e.actualAmount ?? e.expectedAmount), 0);
        entry[cat.category] = catSpent;
      });

      return entry;
    });
  }, [selectedMonth, trendRange, expenses, budgetCategories]);

  // Distinct chart line colors
  const categoryColors = [
    '#10b981', // emerald
    '#a855f7', // purple
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#f43f5e', // rose
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#94a3b8', // slate
  ];

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await updateBudgetCategoryLimit(editingCategory.name, editingCategory.limit);
    setEditingCategory(null);
  };

  if (isStoreLoading('budgetCategories') && contextBudgetCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton height="h-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Budget vs. Actual Spending
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Live variance analysis and multi-month creep detection per category
        </p>
      </div>

      {/* Aggregate Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Monthly Budget
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {totalBudget.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Sum of all category targets
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Actual Spent
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {settings.currency}
            {totalActual.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Paid routine expenses</div>
        </GlassCard>

        <GlassCard
          glow={totalVariance >= 0 ? 'emerald' : 'rose'}
          className="p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Variance
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalVariance >= 0 ? '+' : ''}
            {settings.currency}
            {totalVariance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalVariance >= 0 ? 'Under total budget' : 'Over total budget'}
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overall Budget Used
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {totalPercentUsed.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalPercentUsed > 100
                  ? 'bg-rose-500'
                  : totalPercentUsed > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, totalPercentUsed)}%` }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Category Cards Grid */}
      <div>
        <h3 className="text-sm font-bold text-white tracking-tight mb-3">
          Category Budgets & Progress
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetCategories.map((cat, idx) => {
            const actual = monthlyCategorySpending.get(cat.category) || 0;
            const variance = cat.monthlyLimit - actual;
            const percentUsed =
              cat.monthlyLimit > 0 ? (actual / cat.monthlyLimit) * 100 : 0;
            const isOver = variance < 0;

            const progressColor =
              percentUsed > 100
                ? 'bg-rose-500 shadow-glass-glow-rose'
                : percentUsed > 75
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <GlassCard
                key={cat.id}
                glow={isOver ? 'rose' : 'none'}
                className="p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            categoryColors[idx % categoryColors.length],
                        }}
                      />
                      {cat.category}
                    </span>

                    <button
                      onClick={() =>
                        setEditingCategory({
                          name: cat.category,
                          limit: cat.monthlyLimit,
                        })
                      }
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
                      title="Edit Budget Target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Monthly Budget:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {settings.currency}
                        {cat.monthlyLimit.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Actual Spent:</span>
                      <span className="font-mono font-bold text-rose-300">
                        {settings.currency}
                        {actual.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5">
                      <span>Variance:</span>
                      <span
                        className={`font-mono font-bold ${
                          isOver ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isOver ? '-' : '+'}
                        {settings.currency}
                        {Math.abs(variance).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Status */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-slate-400 font-medium">
                      {percentUsed.toFixed(0)}% utilized
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver
                          ? 'text-rose-400'
                          : percentUsed > 75
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isOver
                        ? 'Over Budget'
                        : percentUsed > 75
                        ? 'Near Limit'
                        : 'On Track'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(100, percentUsed)}%` }}
                    />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* 6-Month Category Trend Chart (Lives on this same page per prompt specification!) */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Category Creep Trend Chart
            </h3>
            <p className="text-xs text-slate-400">
              Reveals slow, continuous expenditure creeps in Food, Dining, Travel, or Utilities over time
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Range Toggle: 3, 6, 12 months */}
            <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-white/10 text-xs">
              {[3, 6, 12].map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r as any)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    trendRange === r
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}M
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={selectedTrendCategory}
              onChange={(e) => setSelectedTrendCategory(e.target.value)}
              className="glass-input py-1 px-3 text-xs bg-slate-900"
            >
              <option value="All">All Categories</option>
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.06)"
              />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) =>
                  `${settings.currency}${val >= 1000 ? `${val / 1000}k` : val}`
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
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {budgetCategories
                .filter(
                  (c) =>
                    selectedTrendCategory === 'All' ||
                    selectedTrendCategory === c.category
                )
                .map((cat, idx) => (
                  <Line
                    key={cat.id}
                    type="monotone"
                    dataKey={cat.category}
                    stroke={categoryColors[idx % categoryColors.length]}
                    strokeWidth={selectedTrendCategory === cat.category ? 3 : 2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Edit Category Limit Modal */}
      {editingCategory && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          title={`Edit ${editingCategory.name} Budget`}
          subtitle="Set target monthly spending allowance"
        >
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Monthly Target Allowance ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editingCategory.limit}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    limit: parseFloat(e.target.value) || 0,
                  })
                }
                className="glass-input w-full mt-1 text-sm font-semibold"
                autoFocus
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Save Budget
              </button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
};
