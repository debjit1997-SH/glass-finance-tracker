import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { AccountCardSkeleton, StatCardSkeleton } from '../components/ui/GlassSkeleton';
import { Account, AccountType } from '../types/finance';
import {
  Wallet,
  Plus,
  Landmark,
  Coins,
  CreditCard,
  TrendingUp,
  Smartphone,
  Trash2,
  Edit2,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

interface AccountsPageProps {
  onOpenAddAccount: () => void;
  onOpenTransfer: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  onOpenAddAccount,
  onOpenTransfer,
}) => {
  const { accounts, liveBalances, updateAccount, deleteAccount, settings, isStoreLoading } = useFinance();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Landmark className="w-5 h-5 text-emerald-400" />;
      case 'cash':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-purple-400" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      case 'wallet':
        return <Smartphone className="w-5 h-5 text-rose-400" />;
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (filterType === 'all') return true;
    return acc.type === filterType;
  });

  const totalLiquid = accounts
    .filter((a) => ['bank', 'cash', 'wallet'].includes(a.type))
    .reduce((s, a) => s + (liveBalances.get(a.id) || 0), 0);

  const totalInvestment = accounts
    .filter((a) => a.type === 'investment')
    .reduce((s, a) => s + (liveBalances.get(a.id) || 0), 0);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    await updateAccount(editingAccount);
    setEditingAccount(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete account "${name}"? Transactions associated will remain.`)) {
      await deleteAccount(id);
    }
  };

  if (isStoreLoading('accounts') && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCardSkeleton />
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
      {/* Top Banner & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Accounts & Portfolios
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live balance recomputes dynamically: Opening + Income In + Transfers In − Expenses Out − Transfers Out − EMI Out
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTransfer}
            className="glass-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={onOpenAddAccount}
            className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Liquid Cash & Bank
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {settings.currency}
              {totalLiquid.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Checking, Savings & Cash</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <Landmark className="w-6 h-6" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Investments & Equities
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {settings.currency}
              {totalInvestment.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Demat, Mutual Funds & Stocks</div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <TrendingUp className="w-6 h-6" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Accounts Configured
            </div>
            <div className="text-2xl font-bold text-white mt-1">{accounts.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">All tracked active accounts</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25">
            <Wallet className="w-6 h-6" />
          </div>
        </GlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'bank', 'cash', 'credit_card', 'investment', 'wallet'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              filterType === type
                ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {type === 'all' ? 'All Accounts' : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-full py-12 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 backdrop-blur-md">
            <Wallet className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-300">No accounts configured yet</p>
            <p className="text-xs text-slate-500 mt-1">Click &quot;Add Account&quot; to configure your first account.</p>
          </div>
        ) : (
          filteredAccounts.map((account) => {
          const liveBalance = liveBalances.get(account.id) ?? account.openingBalance;
          const isNegative = liveBalance < 0;

          return (
            <GlassCard
              key={account.id}
              className="p-5 flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Top Row: Icon, Name & Type */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 backdrop-blur-md">
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{account.name}</h4>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="uppercase font-semibold text-purple-300">
                          {account.type.replace('_', ' ')}
                        </span>
                        {account.accountNumberLast4 && (
                          <span>•••• {account.accountNumberLast4}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingAccount(account)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id, account.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balances Section */}
                <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Opening Balance:</span>
                    <span className="font-mono">
                      {settings.currency}
                      {account.openingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-xs font-semibold text-slate-200">Live Balance:</span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        isNegative
                          ? 'text-rose-400'
                          : account.type === 'credit_card'
                          ? 'text-purple-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {settings.currency}
                      {liveBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Auto-reconciled
                </span>
                <span>Configured</span>
              </div>
            </GlassCard>
          );
        })
      )}
      </div>

      {/* Edit Account Modal */}
      {editingAccount && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          title="Edit Account"
          subtitle="Modify account title or opening balance"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Account Name
              </label>
              <input
                type="text"
                required
                value={editingAccount.name}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, name: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Opening Balance ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={editingAccount.openingBalance}
                onChange={(e) =>
                  setEditingAccount({
                    ...editingAccount,
                    openingBalance: parseFloat(e.target.value) || 0,
                  })
                }
                className="glass-input w-full mt-1 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                value={editingAccount.accountNumberLast4 || ''}
                onChange={(e) =>
                  setEditingAccount({
                    ...editingAccount,
                    accountNumberLast4: e.target.value,
                  })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
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
