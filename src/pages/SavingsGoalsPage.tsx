import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { StatCardSkeleton, AccountCardSkeleton } from '../components/ui/GlassSkeleton';
import { SavingsGoal } from '../types/finance';
import {
  Target,
  Plus,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Coins,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SavingsGoalsPageProps {
  onOpenAddGoal: () => void;
}

export const SavingsGoalsPage: React.FC<SavingsGoalsPageProps> = ({ onOpenAddGoal }) => {
  const {
    savingsGoals,
    accounts,
    contributeToGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    emergencyHealth,
    settings,
    isStoreLoading,
  } = useFinance();

  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const today = new Date();

  // Calculate monthly required for each goal: (Target - Current) / months remaining
  const enrichedGoals = savingsGoals.map((goal) => {
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth())
    );

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentSaved);
    const monthlyRequired = Math.ceil(remainingAmount / monthsRemaining);
    const percentCompleted =
      goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100))
        : 0;

    return {
      ...goal,
      monthsRemaining,
      remainingAmount,
      monthlyRequired,
      percentCompleted,
    };
  });

  const totalTargetCorpus = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavedCorpus = savingsGoals.reduce((sum, g) => sum + g.currentSaved, 0);
  const totalMonthlyCommitment = enrichedGoals.reduce(
    (sum, g) => sum + (g.remainingAmount > 0 ? g.monthlyRequired : 0),
    0
  );

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal || !contributionAmount) return;

    const amt = parseFloat(contributionAmount);
    await contributeToGoal(contributingGoal.id, amt, fromAccountId);

    if (contributingGoal.currentSaved + amt >= contributingGoal.targetAmount) {
      // Milestone celebration!
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }

    setContributingGoal(null);
    setContributionAmount('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    await updateSavingsGoal(editingGoal);
    setEditingGoal(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete savings goal "${name}"?`)) {
      await deleteSavingsGoal(id);
    }
  };

  if (isStoreLoading('savingsGoals') && savingsGoals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Savings Goals &amp; Sinking Funds
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated monthly required allocations for safety, travel, gadgets, and milestones
          </p>
        </div>

        <button
          onClick={onOpenAddGoal}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Saved Across Goals
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {settings.currency}
            {totalSavedCorpus.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Target Corpus: {settings.currency}
            {totalTargetCorpus.toLocaleString('en-IN')}
          </div>
        </GlassCard>

        <GlassCard glow="indigo" className="p-4 border-indigo-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Monthly Required Savings
          </div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">
            {settings.currency}
            {totalMonthlyCommitment.toLocaleString('en-IN')}
            <span className="text-xs text-slate-400 font-normal"> / mo</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Auto-calculated = (Target − Current) ÷ Months Remaining
          </div>
        </GlassCard>

        <GlassCard glow="emerald" className="p-4 border-emerald-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Emergency Fund Health
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {emergencyHealth.monthsCovered} Months
          </div>
          <div className="text-[11px] text-emerald-300 mt-0.5">
            {emergencyHealth.statusText} (Target: 3-6 mo)
          </div>
        </GlassCard>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {enrichedGoals.map((goal) => {
          const isDone = goal.currentSaved >= goal.targetAmount;

          return (
            <GlassCard
              key={goal.id}
              glow={isDone ? 'emerald' : 'none'}
              className="p-5 flex flex-col justify-between relative overflow-hidden group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-purple-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{goal.name}</h4>
                      <span className="text-[11px] text-purple-300 uppercase font-semibold">
                        {goal.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id, goal.name)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Circle & Metrics */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Target Amount:</span>
                    <span className="font-mono font-semibold text-white">
                      {settings.currency}
                      {goal.targetAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Current Saved:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {settings.currency}
                      {goal.currentSaved.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                    <span>Target Date:</span>
                    <span className="font-mono text-slate-300">
                      {goal.targetDate} ({goal.monthsRemaining} mo left)
                    </span>
                  </div>

                  {!isDone && (
                    <div className="flex items-center justify-between text-xs text-indigo-300 pt-1 font-semibold">
                      <span>Monthly Required:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {settings.currency}
                        {goal.monthlyRequired.toLocaleString('en-IN')} / mo
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">
                      {goal.percentCompleted}% saved
                    </span>
                    <span
                      className={`font-semibold ${
                        isDone ? 'text-emerald-400' : 'text-purple-300'
                      }`}
                    >
                      {isDone ? 'Goal Reached! 🎉' : `${settings.currency}${goal.remainingAmount.toLocaleString('en-IN')} to go`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? 'bg-emerald-500 shadow-glass-glow-emerald'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{ width: `${goal.percentCompleted}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Sinking Fund</span>
                <button
                  onClick={() => {
                    setContributingGoal(goal);
                    setContributionAmount(goal.monthlyRequired.toString());
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 text-purple-200 hover:bg-purple-600/40 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Coins className="w-3.5 h-3.5 text-purple-300" />
                  <span>Add Contribution</span>
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Contribution Modal */}
      {contributingGoal && (
        <GlassModal
          isOpen={true}
          onClose={() => setContributingGoal(null)}
          title={`Contribute to ${contributingGoal.name}`}
          subtitle="Allocate funds towards this savings milestone"
        >
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Contribution Amount ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Source Bank Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="glass-input w-full mt-1 text-sm bg-slate-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Confirm Allocation
              </button>
            </div>
          </form>
        </GlassModal>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingGoal(null)}
          title="Edit Savings Goal"
          subtitle="Modify target parameters or saved amount"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Goal Name
              </label>
              <input
                type="text"
                required
                value={editingGoal.name}
                onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Target Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingGoal.targetAmount}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      targetAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Saved ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingGoal.currentSaved}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      currentSaved: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
};
