import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassDatePicker } from '../components/ui/GlassDatePicker';
import { StatCardSkeleton, TableRowSkeleton, AccountCardSkeleton } from '../components/ui/GlassSkeleton';
import { EmiLoan, EmiStatus } from '../types/finance';
import { calculateDebtPayoff } from '../services/calculations';
import {
  Calculator,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingDown,
  Zap,
  Flame,
  Snowflake,
  Trash2,
  Edit2,
  Info,
  Calendar,
  Wallet,
} from 'lucide-react';

interface EmiTrackerPageProps {
  onOpenAddEmi: () => void;
}

export const EmiTrackerPage: React.FC<EmiTrackerPageProps> = ({ onOpenAddEmi }) => {
  const { emis, accounts, updateEmi, deleteEmi, markEmiPaid, settings, isStoreLoading } = useFinance();

  const [payoffStrategy, setPayoffStrategy] = useState<'Avalanche' | 'Snowball'>('Avalanche');
  const [extraPayment, setExtraPayment] = useState<string>('0');
  const [editingEmi, setEditingEmi] = useState<EmiLoan | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Top totals
  const totalMonthlyEmi = emis.reduce((sum, e) => sum + e.monthlyAmount, 0);
  const totalPrincipal = emis.reduce((sum, e) => sum + e.outstandingPrincipal, 0);
  const activeLoansCount = emis.filter((e) => e.outstandingPrincipal > 0).length;

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  // Debt Payoff Simulation
  const payoffResults = useMemo(() => {
    return calculateDebtPayoff(emis, parseFloat(extraPayment || '0'));
  }, [emis, extraPayment]);

  const activePlan =
    payoffStrategy === 'Avalanche' ? payoffResults.avalanche : payoffResults.snowball;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmi) return;
    await updateEmi(editingEmi);
    setEditingEmi(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete loan entry "${name}"?`)) {
      await deleteEmi(id);
    }
  };

  if (isStoreLoading('emis') && emis.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AccountCardSkeleton />
          <AccountCardSkeleton />
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
            <Calculator className="w-5 h-5 text-purple-400" />
            EMI Tracker & Debt Payoff Planner
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Single-source loan logging with automated Avalanche and Snowball payoff trajectories
          </p>
        </div>

        <button
          onClick={onOpenAddEmi}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Top Total EMI at top (Prompt Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard glow="purple" className="p-4 border-purple-500/30 bg-purple-950/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            Total Monthly EMI Obligation
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {totalMonthlyEmi.toLocaleString('en-IN')}
            <span className="text-xs text-slate-400 font-normal"> / month</span>
          </div>
          <div className="text-[11px] text-purple-300 mt-0.5">
            {activeLoansCount} active {activeLoansCount === 1 ? 'loan' : 'loans'} tracked
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Outstanding Principal
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">
            {settings.currency}
            {totalPrincipal.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total remaining debt liability</div>
        </GlassCard>

        <GlassCard glow="emerald" className="p-4 border-emerald-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Projected Debt-Free Target
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {activePlan.debtFreeDate || '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {activePlan.totalMonths} months remaining
          </div>
        </GlassCard>
      </div>

      {/* Strict rule notice */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <span>
          <strong>Double-Counting Safeguard:</strong> EMIs are logged solely in this tracker. They are
          automatically deducted in your savings rate and cash-flow runway calculations without duplicate
          manual entries in the Expense log.
        </span>
      </div>

      {/* Loans List */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Active Loan Portfolios</h3>
          <span className="text-xs text-slate-400">{emis.length} loans recorded</span>
        </div>

        {emis.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No EMI loans added yet. Click &quot;Add Loan&quot; to begin debt payoff planning.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Loan & Lender</th>
                  <th className="py-3 px-4">Monthly EMI</th>
                  <th className="py-3 px-4">Outstanding Principal</th>
                  <th className="py-3 px-4">Interest Rate</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Account Debited</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {emis.map((emi) => {
                  const isPaid = emi.status === 'Paid';
                  const isOverdue =
                    emi.status === 'Overdue' ||
                    (emi.status === 'Pending' && emi.dueDate && emi.dueDate < todayStr);
                  const accountName = accountMap.get(emi.accountId) || 'Unknown Account';

                  return (
                    <tr key={emi.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="font-bold">{emi.loanName}</div>
                        <div className="text-[11px] text-purple-300">{emi.lender}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {settings.currency}
                        {emi.monthlyAmount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-300 whitespace-nowrap">
                        {settings.currency}
                        {emi.outstandingPrincipal.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-amber-300 whitespace-nowrap">
                        {emi.interestRate}% p.a.
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {emi.dueDate || 'Monthly'}
                      </td>

                      <td className="py-3.5 px-4 text-purple-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 opacity-70" />
                          <span>{accountName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => markEmiPaid(emi.id)}
                              className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setEditingEmi(emi)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emi.id, emi.loanName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Debt Payoff Planner (Lives inside EMI Tracker per Prompt Specification!) */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-indigo-400" />
              Debt Payoff Acceleration Planner
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare Avalanche (highest interest first) vs Snowball (smallest balance first)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Strategy switch */}
            <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-white/10 text-xs">
              <button
                onClick={() => setPayoffStrategy('Avalanche')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  payoffStrategy === 'Avalanche'
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Avalanche (Highest Interest)
              </button>

              <button
                onClick={() => setPayoffStrategy('Snowball')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  payoffStrategy === 'Snowball'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                Snowball (Smallest Balance)
              </button>
            </div>

            {/* Extra Monthly Prepayment */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Extra/mo:</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="0"
                className="w-20 bg-transparent text-white font-bold outline-none border-b border-white/20 focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Strategy comparison stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400">Debt Free Date</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {activePlan.debtFreeDate || '—'}
            </div>
            <span className="text-[11px] text-slate-400">
              Total duration: {activePlan.totalMonths} months
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400">Total Interest to Pay</span>
            <div className="text-lg font-bold text-amber-300 mt-1">
              {settings.currency}
              {activePlan.totalInterestPaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400">
              Interest difference: {settings.currency}
              {Math.abs(
                payoffResults.snowball.totalInterestPaid -
                  payoffResults.avalanche.totalInterestPaid
              ).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400">Strategy Focus</span>
            <div className="text-sm font-bold text-white mt-1">
              {payoffStrategy === 'Avalanche'
                ? 'Mathematically Optimal (Lowest Interest)'
                : 'Psychological Momentum (Quick Wins)'}
            </div>
            <span className="text-[11px] text-slate-400">
              {payoffStrategy === 'Avalanche'
                ? 'Targeting highest APR loan first'
                : 'Knocking out lowest balance loan first'}
            </span>
          </div>
        </div>

        {/* Priority Payoff Order Sequence */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Payoff Priority Order & Schedule
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePlan.payoffOrder.map((orderItem, idx) => (
              <div
                key={orderItem.loanId}
                className="p-3.5 rounded-xl bg-slate-900/40 border border-white/10 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Priority #{idx + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Payoff: {orderItem.payoffDate}
                  </span>
                </div>

                <h5 className="text-sm font-bold text-white">{orderItem.loanName}</h5>

                <div className="mt-2 text-xs space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Principal:</span>
                    <span className="font-mono text-slate-200">
                      {settings.currency}
                      {orderItem.initialBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest Rate:</span>
                    <span className="font-mono text-amber-300">
                      {orderItem.interestRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Interest:</span>
                    <span className="font-mono text-rose-300">
                      {settings.currency}
                      {orderItem.totalInterest.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Edit EMI Modal */}
      {editingEmi && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingEmi(null)}
          title="Edit Loan Details"
          subtitle="Update interest rate or outstanding principal balance"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Loan Name
              </label>
              <input
                type="text"
                required
                value={editingEmi.loanName}
                onChange={(e) =>
                  setEditingEmi({ ...editingEmi, loanName: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Monthly Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingEmi.monthlyAmount}
                  onChange={(e) =>
                    setEditingEmi({
                      ...editingEmi,
                      monthlyAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Outstanding Principal ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingEmi.outstandingPrincipal}
                  onChange={(e) =>
                    setEditingEmi({
                      ...editingEmi,
                      outstandingPrincipal: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold text-rose-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingEmi.interestRate}
                  onChange={(e) =>
                    setEditingEmi({
                      ...editingEmi,
                      interestRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <GlassDatePicker
                label="Due Date"
                value={editingEmi.dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingEmi({ ...editingEmi, dueDate: e.target.value })
                }
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingEmi(null)}
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
