import { RecurringTemplates } from '../components/RecurringTemplates';
import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassDatePicker } from '../components/ui/GlassDatePicker';
import { StatCardSkeleton, AccountCardSkeleton } from '../components/ui/GlassSkeleton';
import { RecurringBill } from '../types/finance';
import {
  Repeat,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Wallet,
  Clock,
  Zap,
} from 'lucide-react';

interface RecurringBillsPageProps {
  onOpenAddRecurring: () => void;
}

export const RecurringBillsPage: React.FC<RecurringBillsPageProps> = ({
  onOpenAddRecurring,
}) => {
  const {
    recurringBills: allRecurringBills,
    accounts,
    budgetCategories,
    updateRecurringBill,
    deleteRecurringBill,
    markRecurringBillPaid,
    settings,
    isStoreLoading,
  } = useFinance();

  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  // Compute monthly normalized expense
  const recurringBills = allRecurringBills.filter(b => !b.templateEnabled);
  const monthlyNormalizedTotal = recurringBills.reduce((sum, b) => {
    if (b.frequency === 'Monthly') return sum + b.amount;
    if (b.frequency === 'Yearly') return sum + b.amount / 12;
    if (b.frequency === 'Quarterly') return sum + b.amount / 3;
    return sum + b.amount;
  }, 0);

  const yearlyTotal = monthlyNormalizedTotal * 12;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    await updateRecurringBill(editingBill);
    setEditingBill(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete recurring subscription "${name}"?`)) {
      await deleteRecurringBill(id);
    }
  };

  if (isStoreLoading('recurringBills') && recurringBills.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
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
      <RecurringTemplates/>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Repeat className="w-5 h-5 text-cyan-400" />
            Recurring Bills &amp; Subscriptions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming, cloud services, gym memberships, and utility subscriptions feeding Due Soon alerts
          </p>
        </div>

        <button
          onClick={onOpenAddRecurring}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Monthly Normalized Cost
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {Math.round(monthlyNormalizedTotal).toLocaleString('en-IN')}
            <span className="text-xs text-slate-400 font-normal"> / mo</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {recurringBills.length} active recurring {recurringBills.length === 1 ? 'bill' : 'bills'}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Annual Subscription Run-Rate
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {settings.currency}
            {Math.round(yearlyTotal).toLocaleString('en-IN')}
            <span className="text-xs text-slate-400 font-normal"> / yr</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Projected 12-month outflow</div>
        </GlassCard>

        <GlassCard glow="indigo" className="p-4 border-indigo-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Due Soon Automation
          </div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">Automated</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Surfaces in Dashboard banner within 3 days
          </div>
        </GlassCard>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recurringBills.map((bill) => {
          const accountName = accountMap.get(bill.accountId) || 'Unknown Account';

          return (
            <GlassCard
              key={bill.id}
              className="p-5 flex flex-col justify-between relative overflow-hidden group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                      {bill.category}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">{bill.name}</h4>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-white">
                      {settings.currency}
                      {bill.amount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {bill.frequency}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Next Renewal:
                    </span>
                    <span className="font-mono font-semibold text-slate-200">
                      {bill.nextRenewalDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                      Auto-Debit:
                    </span>
                    <span className="text-slate-300 truncate max-w-[140px]">
                      {accountName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  title="Advance the due date only; does not record a payment or expense"
                  onClick={() => markRecurringBillPaid(bill.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Advance renewal
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingBill(bill)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id, bill.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Edit Bill Modal */}
      {editingBill && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingBill(null)}
          title="Edit Recurring Subscription"
          subtitle="Modify renewal date or amount"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Subscription Name
              </label>
              <input
                type="text"
                required
                value={editingBill.name}
                onChange={(e) =>
                  setEditingBill({ ...editingBill, name: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingBill.amount}
                  onChange={(e) =>
                    setEditingBill({
                      ...editingBill,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Frequency
                </label>
                <select
                  value={editingBill.frequency}
                  onChange={(e) =>
                    setEditingBill({ ...editingBill, frequency: e.target.value as any })
                  }
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>

            <GlassDatePicker
              label="Next Renewal Date"
              required
              value={editingBill.nextRenewalDate}
              onChange={(e) =>
                setEditingBill({ ...editingBill, nextRenewalDate: e.target.value })
              }
            />

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
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
