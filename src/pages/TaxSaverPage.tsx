import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassDatePicker } from '../components/ui/GlassDatePicker';
import { StatCardSkeleton, TableRowSkeleton } from '../components/ui/GlassSkeleton';
import { TaxSavingItem } from '../types/finance';
import {
  BadgePercent,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface TaxSaverPageProps {
  onOpenAddTax: () => void;
}

export const TaxSaverPage: React.FC<TaxSaverPageProps> = ({ onOpenAddTax }) => {
  const {
    taxSavings,
    taxMetrics,
    updateTaxSaving,
    deleteTaxSaving,
    settings,
    updateSettings,
    isStoreLoading,
  } = useFinance();

  const [editingItem, setEditingItem] = useState<TaxSavingItem | null>(null);

  // Filter items in current FY
  const fyItems = taxSavings.filter(
    (item) => item.financialYear === taxMetrics.currentFY
  );

  const {
    currentFY,
    total80c,
    limit80c,
    percent80c,
    remaining80c,
    total80d,
    limit80d,
    percent80d,
    remaining80d,
    daysRemaining,
    march31Date,
  } = taxMetrics;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await updateTaxSaving(editingItem);
    setEditingItem(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete tax saving record "${name}"?`)) {
      await deleteTaxSaving(id);
    }
  };

  if (isStoreLoading('taxSavings') && taxSavings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <TableRowSkeleton key={i} />
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-purple-400" />
              India Tax-Saving Tracker (80C &amp; 80D)
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              FY {currentFY}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            April 1 to March 31 cycle tracker for Section 80C (₹1.5L cap) and Section 80D medical exemptions
          </p>
        </div>

        <button
          onClick={onOpenAddTax}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tax Investment</span>
        </button>
      </div>

      {/* Countdown Alert Banner */}
      <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Financial Year FY {currentFY} Countdown
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Target deadline for depositing Section 80C/80D investments is March 31.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-bold text-amber-300 self-start sm:self-auto">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{daysRemaining} Days Left to 31 March</span>
        </div>
      </div>

      {/* 80C & 80D Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 80C Card */}
        <GlassCard
          glow={percent80c >= 100 ? 'emerald' : 'purple'}
          className="p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                  Section 80C Exemption
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  PPF, ELSS, EPF, Life Insurance
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  percent80c >= 100
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                }`}
              >
                {percent80c}% Maxed
              </span>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Invested this FY:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {settings.currency}
                  {total80c.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Maximum Limit Cap:</span>
                <span className="font-mono font-semibold text-white">
                  {settings.currency}
                  {limit80c.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/5 font-semibold">
                <span>Remaining Headroom:</span>
                <span
                  className={`font-mono ${
                    remaining80c === 0 ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {remaining80c === 0
                    ? '100% Fully Utilized 🎉'
                    : `${settings.currency}${remaining80c.toLocaleString('en-IN')} remaining`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent80c >= 100
                    ? 'bg-emerald-500 shadow-glass-glow-emerald'
                    : 'bg-purple-500'
                }`}
                style={{ width: `${percent80c}%` }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Section 80D Card */}
        <GlassCard
          glow={percent80d >= 100 ? 'emerald' : 'indigo'}
          className="p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Section 80D Exemption
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Health &amp; Medical Insurance Premiums
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  percent80d >= 100
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {percent80d}% Maxed
              </span>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Premiums Paid this FY:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {settings.currency}
                  {total80d.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Applicable Exemption Limit:</span>
                <span className="font-mono font-semibold text-white">
                  {settings.currency}
                  {limit80d.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/5 font-semibold">
                <span>Remaining Headroom:</span>
                <span
                  className={`font-mono ${
                    remaining80d === 0 ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {remaining80d === 0
                    ? '100% Fully Utilized 🎉'
                    : `${settings.currency}${remaining80d.toLocaleString('en-IN')} remaining`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent80d >= 100
                    ? 'bg-emerald-500 shadow-glass-glow-emerald'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${percent80d}%` }}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tax Investment Entries Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Logged Tax-Saving Investments (FY {currentFY})
          </h3>
          <span className="text-xs text-slate-400">{fyItems.length} records</span>
        </div>

        {fyItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No tax-saving investments logged for FY {currentFY} yet. Click &quot;Add Tax Investment&quot; to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Investment / Policy Name</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Notes / Folio</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {item.date}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">{item.name}</td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.section === '80C'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        Section {item.section}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap text-sm">
                      {settings.currency}
                      {item.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="max-w-xs truncate">{item.notes || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Edit Tax Modal */}
      {editingItem && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title="Edit Tax Saving Record"
          subtitle="Modify investment details or amount"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Investment Name
              </label>
              <input
                type="text"
                required
                value={editingItem.name}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, name: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Tax Section
                </label>
                <select
                  value={editingItem.section}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      section: e.target.value as any,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  <option value="80C">Section 80C</option>
                  <option value="80D">Section 80D</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingItem.amount}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>
            </div>

            <GlassDatePicker
              label="Deposit Date"
              required
              value={editingItem.date}
              onChange={(e) =>
                setEditingItem({ ...editingItem, date: e.target.value })
              }
            />

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
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
