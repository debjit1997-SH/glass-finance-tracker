import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { GlassModal } from './ui/GlassModal';
import { localDate, outstandingPrincipal } from '../services/financeRules';
import type { EmiLoan, LoanEvent } from '../types/finance';
export function LoanLifecyclePanel() {
  const { emis, emiPayments, accounts, updateEmi, settings } = useFinance();
  const [loan, setLoan] = useState<EmiLoan | null>(null);
  const [kind, setKind] = useState<LoanEvent['kind']>('Foreclosure');
  const [date, setDate] = useState(localDate());
  const [amount, setAmount] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [installments, setInstallments] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = (item: EmiLoan, action: LoanEvent['kind']) => {
    setLoan(item);
    setKind(action);
    setDate(localDate());
    setAmount('');
    setPrincipal('');
    setMonthly('');
    setInstallments('');
    setAccountId(item.accountId);
    setNote('');
    setError('');
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    setBusy(true);
    setError('');
    try {
      if (date < (loan.startDate || loan.dueDate) || date > localDate())
        throw new Error('Use an event date between the loan start and today.');
      if (loan.loanEvents?.some((item) => item.date > date))
        throw new Error(
          'This date is earlier than a recorded loan change. Review the history before changing the schedule.'
        );
      if (
        kind === 'Foreclosure' &&
        emiPayments.some(
          (p) =>
            p.loanId === loan.id &&
            p.status === 'Paid' &&
            p.month > date.slice(0, 7)
        )
      )
        throw new Error(
          'Payments exist after this closure month. Review those records before closing; they will not be deleted.'
        );
      const event: LoanEvent = {
        id: crypto.randomUUID(),
        kind,
        date,
        amount: Number(amount),
        accountId,
        note,
        revisedPrincipal: principal !== '' ? Number(principal) : undefined,
        previousPrincipal: loan.outstandingPrincipal,
        previousMonthlyAmount: loan.monthlyAmount,
        previousTotalInstallments: loan.totalInstallments,
      };
      const updated: EmiLoan = {
        ...loan,
        loanEvents: [...(loan.loanEvents || []), event],
      };
      if (kind === 'Foreclosure') {
        updated.lifecycle = 'Closed';
        updated.closureDate = date;
        updated.settlementAmount = event.amount;
      } else {
        if (principal !== '') updated.outstandingPrincipal = Number(principal);
        if (monthly !== '') updated.monthlyAmount = Number(monthly);
        if (installments !== '') {
          const total = Number(installments);
          const [sy, sm] = (loan.startDate || loan.dueDate)
            .slice(0, 7)
            .split('-')
            .map(Number);
          const [ey, em] = date.slice(0, 7).split('-').map(Number);
          if (total < (ey - sy) * 12 + em - sm + 1)
            throw new Error(
              'Total installments must include the months already elapsed.'
            );
          updated.totalInstallments = total;
        }
      }
      await updateEmi(updated);
      setLoan(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassCard className="p-5 space-y-4">
      <div>
        <p className="eyebrow">Loan lifecycle</p>
        <h3 className="font-semibold mt-1">Foreclosure & part-payments</h3>
        <p className="text-sm text-slate-400 mt-1">
          Keep closed loans and their payment history. No automatic bank debit.
        </p>
      </div>
      {!emis.length && (
        <p className="text-sm text-slate-400">
          Your loans will appear here once added.
        </p>
      )}
      {emis.map((item) => (
        <div key={item.id} className="border-t border-white/10 pt-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h4 className="font-semibold">
                {item.loanName}{' '}
                <span className="status-pill ml-2 text-indigo-300">
                  {item.lifecycle || 'Active'}
                </span>
              </h4>
              <p className="text-sm text-slate-400 mt-2">
                {item.lifecycle === 'Closed'
                  ? `Closed ${item.closureDate} · settlement ${settings.currency}${item.settlementAmount?.toLocaleString('en-IN')}`
                  : `Principal ${settings.currency}${outstandingPrincipal(item).toLocaleString('en-IN')}`}
              </p>
            </div>
            {item.lifecycle !== 'Closed' && (
              <div className="flex gap-2 items-center">
                <button
                  className="glass-btn-secondary px-3 py-2 rounded-xl text-xs"
                  onClick={() => open(item, 'Part-payment')}
                >
                  Part-payment
                </button>
                <button
                  className="glass-btn-secondary px-3 py-2 rounded-xl text-xs"
                  onClick={() => open(item, 'Foreclosure')}
                >
                  Foreclose
                </button>
              </div>
            )}
          </div>
          <details className="text-xs mt-3 text-slate-400">
            <summary className="cursor-pointer">
              Payment & change history
            </summary>
            <div className="space-y-2 mt-3">
              {emiPayments
                .filter((p) => p.loanId === item.id)
                .map((p) => (
                  <p key={p.id}>
                    {p.month} · {p.status} · {settings.currency}
                    {p.paidAmount ?? p.amount} {p.paidDate && `· ${p.paidDate}`}
                  </p>
                ))}
              {item.loanEvents?.map((event) => (
                <p key={event.id}>
                  {event.date} · {event.kind} · {settings.currency}
                  {event.amount} · {event.note || 'No note'}{' '}
                  {event.accountId &&
                    `· ${accounts.find((a) => a.id === event.accountId)?.name || event.accountId}`}
                </p>
              ))}
              {!item.loanEvents?.length &&
                !emiPayments.some((p) => p.loanId === item.id) && (
                  <p>
                    No separate history recorded. Existing loan fields are
                    preserved.
                  </p>
                )}
            </div>
          </details>
        </div>
      ))}
      <GlassModal
        isOpen={Boolean(loan)}
        onClose={() => !busy && setLoan(null)}
        title={`${kind}: ${loan?.loanName || ''}`}
        subtitle="History is retained. Existing transactions are not rewritten."
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Date
              <input
                className="glass-input w-full mt-2"
                type="date"
                required
                max={localDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Actual amount
              <input
                className="glass-input w-full mt-2"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            Paying account · reference only
            <select
              className="glass-input w-full mt-2"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Not specified</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {kind === 'Part-payment' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Enter revised bank figures only when confirmed. Blank fields
                keep the current schedule. Changes apply from this month.
              </p>
              <label className="block text-sm">
                Revised principal
                <input
                  className="glass-input w-full mt-2"
                  type="number"
                  min="0"
                  step="0.01"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Revised monthly EMI
                <input
                  className="glass-input w-full mt-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Revised total installments · from original start
                <input
                  className="glass-input w-full mt-2"
                  type="number"
                  min="1"
                  step="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </label>
            </div>
          )}
          <label className="block text-sm">
            Note / existing transaction reference
            <textarea
              className="glass-input w-full mt-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. settlement already recorded as expense EXP-123"
            />
          </label>
          <p className="text-xs text-amber-300">
            This logs the loan event only. If the payment is already an expense,
            do not enter it again. Otherwise record its cash movement
            separately.
          </p>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="glass-btn-primary px-5 py-3 rounded-xl"
          >
            {busy
              ? 'Saving…'
              : kind === 'Foreclosure'
                ? 'Confirm loan closure'
                : 'Save part-payment'}
          </button>
        </form>
      </GlassModal>
    </GlassCard>
  );
}
