import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCardSkeleton, TableRowSkeleton } from '../components/ui/GlassSkeleton';
import { AccountTransfer } from '../types/finance';
import {
  ArrowLeftRight,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Trash2,
  Info,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface TransfersPageProps {
  onOpenAddTransfer: () => void;
}

export const TransfersPage: React.FC<TransfersPageProps> = ({ onOpenAddTransfer }) => {
  const { transfers, accounts, deleteTransfer, selectedMonth, settings, isStoreLoading } = useFinance();

  // Filter transfers for the selected month
  const monthlyTransfers = transfers.filter((t) => t.date.startsWith(selectedMonth));
  const totalTransferred = monthlyTransfers
    .filter((t) => t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transfer entry? Live account balances will be adjusted.')) {
      await deleteTransfer(id);
    }
  };

  if (isStoreLoading('transfers') && transfers.length === 0) {
    return (
      <div className="space-y-6">
        <StatCardSkeleton />
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
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
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            Inter-Account Transfers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal capital movements between your accounts — completely isolated from income & expense
          </p>
        </div>

        <button
          onClick={onOpenAddTransfer}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Global Principle Alert */}
      <div className="p-4 rounded-xl bg-cyan-950/25 border border-cyan-500/25 text-xs text-cyan-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Transfer Isolation Guarantee</h4>
          <p className="text-slate-300">
            Transfers between your own accounts adjust each account&apos;s Live Balance only. They are
            mathematically protected from counting towards your Income, Expense, or Savings Rate totals.
          </p>
        </div>
      </div>

      {/* Month Transfer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Capital Transferred
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            {settings.currency}
            {totalTransferred.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {monthlyTransfers.length} transfers in {selectedMonth}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Income / Expense Impact
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {settings.currency}0.00
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            100% neutralized internally
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Accounts Connected
          </div>
          <div className="text-2xl font-bold text-white mt-1">{accounts.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Available for fund routing</div>
        </GlassCard>
      </div>

      {/* Transfers Table */}
      <GlassCard className="p-0 overflow-hidden">
        {monthlyTransfers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No inter-account transfers logged for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Purpose / Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {monthlyTransfers.map((tr) => {
                  const fromName = accountMap.get(tr.fromAccountId) || 'Unknown Account';
                  const toName = accountMap.get(tr.toAccountId) || 'Unknown Account';

                  return (
                    <tr key={tr.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {tr.date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
                          <Wallet className="w-3.5 h-3.5" />
                          {fromName}
                        </span>
                      </td>

                      <td className="py-3.5 px-2 text-slate-500 text-center">
                        <ArrowRight className="w-4 h-4 mx-auto text-purple-400" />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                          <Wallet className="w-3.5 h-3.5" />
                          {toName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap text-sm">
                        {settings.currency}
                        {tr.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="max-w-xs truncate">{tr.reason || 'Account Transfer'}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tr.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(tr.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Transfer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
