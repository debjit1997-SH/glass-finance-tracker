import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassDatePicker } from '../components/ui/GlassDatePicker';
import { StatCardSkeleton, AccountCardSkeleton, TableRowSkeleton } from '../components/ui/GlassSkeleton';
import { CreditCard, CreditCardBill, CreditCardBillStatus } from '../types/finance';
import {
  CreditCard as CardIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  Calendar,
  Wallet,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';

interface CreditCardPageProps {
  onOpenAddCard: () => void;
}

export const CreditCardPage: React.FC<CreditCardPageProps> = ({ onOpenAddCard }) => {
  const {
    creditCards,
    creditCardBills,
    accounts,
    liveBalances,
    addCreditCardBill,
    payCreditCardBill,
    updateCreditCard,
    deleteCreditCard,
    settings,
    isStoreLoading,
  } = useFinance();

  const [payingBill, setPayingBill] = useState<CreditCardBill | null>(null);
  const [payFromAccountId, setPayFromAccountId] = useState(
    accounts.find((a) => a.type === 'bank')?.id || accounts[0]?.id || ''
  );
  const [payAmount, setPayAmount] = useState('');
  const [isLoggingBill, setIsLoggingBill] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(creditCards[0]?.id || '');

  // Log new bill form state
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);
  const [billMonth, setBillMonth] = useState(currentMonth);
  const [statementDate, setStatementDate] = useState(todayStr);
  const [billAmount, setBillAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);

  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'wallet');

  // Compute stats per card
  const cardSnapshots = creditCards.map((card) => {
    const cardAccountBalance = liveBalances.get(card.accountId) || 0;
    const liability = cardAccountBalance < 0 ? Math.abs(cardAccountBalance) : 0;

    // Find pending bills for this card
    const cardBills = creditCardBills.filter((b) => b.cardId === card.id);
    const pendingBill = cardBills.find(
      (b) => b.status === 'Pending' || b.status === 'Partial' || b.status === 'Overdue'
    );
    const statementDue = pendingBill
      ? Math.max(0, pendingBill.billAmount - pendingBill.amountPaid)
      : 0;

    const totalOutstanding = (card.currentUnbilled || 0) + statementDue + liability;
    const availableBalance = Math.max(0, card.limit - totalOutstanding);
    const utilization = card.limit > 0 ? (totalOutstanding / card.limit) * 100 : 0;

    return {
      card,
      statementDue,
      totalOutstanding,
      availableBalance,
      utilization,
    };
  });

  const handlePayBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill || !payFromAccountId || !payAmount) return;

    await payCreditCardBill(payingBill.id, payFromAccountId, parseFloat(payAmount));
    setPayingBill(null);
    setPayAmount('');
  };

  const handleLogBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId || !billAmount) return;

    const amt = parseFloat(billAmount);
    let status: CreditCardBillStatus = 'Pending';
    if (dueDate < todayStr) status = 'Overdue';

    await addCreditCardBill({
      cardId: selectedCardId,
      billingMonth: billMonth,
      statementDate,
      billAmount: amt,
      amountPaid: 0,
      paymentDueDate: dueDate,
      paymentDateActual: '',
      status,
    });

    setIsLoggingBill(false);
    setBillAmount('');
  };

  if (isStoreLoading('creditCards') && creditCards.length === 0) {
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
            <CardIcon className="w-5 h-5 text-purple-400" />
            Credit Card Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Credit limits, unbilled cycle transactions, statement bills, and zero double-counting settlement
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLoggingBill(true)}
            className="glass-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Log Statement Bill</span>
          </button>

          <button
            onClick={onOpenAddCard}
            className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credit Card</span>
          </button>
        </div>
      </div>

      {/* No Double Counting Architecture Rule Notice */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/25 text-xs text-purple-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">
            Credit Card Logging &amp; Zero Double-Counting Architecture
          </h4>
          <p className="text-slate-300">
            • <strong>Card Swipes:</strong> Logged as routine Expenses debited from your Credit Card Account (increasing card debt).
            <br />
            • <strong>Bill Payments:</strong> Handled via the &quot;Pay Bill&quot; action which executes an internal transfer from your Bank Account to your Credit Card Account.
            <br />
            • <strong>Result:</strong> Zero duplicate expenses while bank cash balances and credit limits update in perfect harmony.
          </p>
        </div>
      </div>

      {/* Cards Snapshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cardSnapshots.map(({ card, statementDue, totalOutstanding, availableBalance, utilization }) => {
          const isHighUtil = utilization > 30;
          const isDangerUtil = utilization > 50;

          return (
            <GlassCard
              key={card.id}
              className="p-5 flex flex-col justify-between relative overflow-hidden group"
            >
              <div>
                {/* Card Brand & Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{card.name}</h4>
                      <span className="text-[11px] text-slate-400">{card.bank}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isDangerUtil
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isHighUtil
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {utilization.toFixed(0)}% Utilized
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2 text-xs p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Credit Limit:</span>
                    <span className="font-mono text-white font-semibold">
                      {settings.currency}
                      {card.limit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Current Unbilled:</span>
                    <span className="font-mono text-amber-300">
                      {settings.currency}
                      {(card.currentUnbilled || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Current Statement Due:</span>
                    <span className="font-mono text-rose-300">
                      {settings.currency}
                      {statementDue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5 font-bold">
                    <span className="text-slate-200">Total Outstanding:</span>
                    <span className="font-mono text-rose-400">
                      {settings.currency}
                      {totalOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 font-bold">
                    <span className="text-emerald-400">Available Balance:</span>
                    <span className="font-mono text-emerald-400">
                      {settings.currency}
                      {availableBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Safe &lt; 30%</span>
                  <span>{utilization.toFixed(1)}% of limit</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDangerUtil ? 'bg-rose-500' : isHighUtil ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Credit Card Billing Log */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Credit Card Statement &amp; Billing Log</h3>
          <span className="text-xs text-slate-400">{creditCardBills.length} statements logged</span>
        </div>

        {creditCardBills.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No statement bills recorded yet. Click &quot;Log Statement Bill&quot; to track monthly cycle statements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Card</th>
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4">Statement Date</th>
                  <th className="py-3 px-4">Bill Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Payment Due Date</th>
                  <th className="py-3 px-4">Actual Pay Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {creditCardBills.map((bill) => {
                  const card = creditCards.find((c) => c.id === bill.cardId);
                  const isPaid = bill.status === 'Paid';
                  const isOverdue =
                    bill.status === 'Overdue' ||
                    (bill.status === 'Pending' && bill.paymentDueDate < todayStr);

                  return (
                    <tr key={bill.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {card?.name || 'Card'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-purple-300 whitespace-nowrap">
                        {bill.billingMonth}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {bill.statementDate}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {settings.currency}
                        {bill.billAmount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {bill.amountPaid > 0
                          ? `${settings.currency}${bill.amountPaid.toLocaleString('en-IN')}`
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {bill.paymentDueDate}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {bill.paymentDateActual || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-400" /> Overdue
                          </span>
                        ) : bill.status === 'Partial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!isPaid && (
                          <button
                            onClick={() => {
                              setPayingBill(bill);
                              setPayAmount((bill.billAmount - bill.amountPaid).toString());
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pay Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pay Credit Card Bill Modal */}
      {payingBill && (
        <GlassModal
          isOpen={true}
          onClose={() => setPayingBill(null)}
          title="Pay Credit Card Bill"
          subtitle="Transfers payment from Bank to Credit Card without double-counting expenses"
        >
          <form onSubmit={handlePayBillSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
              Bill Amount: <strong>{settings.currency}{payingBill.billAmount.toLocaleString('en-IN')}</strong>
              {payingBill.amountPaid > 0 && ` (Already paid: ${settings.currency}${payingBill.amountPaid.toLocaleString('en-IN')})`}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Payment Amount ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Debit Bank Account
              </label>
              <select
                value={payFromAccountId}
                onChange={(e) => setPayFromAccountId(e.target.value)}
                required
                className="glass-input w-full mt-1 text-sm bg-slate-900"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({settings.currency}
                    {(liveBalances.get(acc.id) || 0).toLocaleString('en-IN')} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Confirm Payment &amp; Transfer
              </button>
            </div>
          </form>
        </GlassModal>
      )}

      {/* Log New Statement Bill Modal */}
      {isLoggingBill && (
        <GlassModal
          isOpen={true}
          onClose={() => setIsLoggingBill(false)}
          title="Log Credit Card Statement Bill"
          subtitle="Record monthly generated credit card statement for payment scheduling"
        >
          <form onSubmit={handleLogBillSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Credit Card
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                required
                className="glass-input w-full mt-1 text-sm bg-slate-900"
              >
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.bank})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Billing Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={billMonth}
                  onChange={(e) => setBillMonth(e.target.value)}
                  className="glass-input w-full mt-1 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Bill Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="24500"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassDatePicker
                label="Statement Date"
                required
                value={statementDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatementDate(e.target.value)}
              />

              <GlassDatePicker
                label="Payment Due Date"
                required
                value={dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsLoggingBill(false)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Log Statement
              </button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
};
