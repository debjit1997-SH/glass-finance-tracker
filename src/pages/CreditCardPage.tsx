import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { billDueDate, billStatus, localDate } from '../services/financeRules';
import { deriveDueDateForMonth } from '../services/calculations';
import type { CreditCard, CreditCardBill } from '../types/finance';
import {
  Plus,
  CreditCard as CardIcon,
  CalendarDays,
  CheckCheck,
} from 'lucide-react';

export const CreditCardPage = ({
  onOpenAddCard,
}: {
  onOpenAddCard: () => void;
}) => {
  const {
    creditCards,
    creditCardBills,
    addCreditCardBill,
    payCreditCardBill,
    updateCreditCard,
    selectedMonth,
    settings,
    isSyncing,
  } = useFinance();
  const [logging, setLogging] = useState(false);
  const [cardId, setCardId] = useState('');
  const [statementDate, setStatementDate] = useState(localDate());
  const [dueDate, setDueDate] = useState(billDueDate(localDate()));
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState<CreditCardBill | null>(null);
  const [paymentDate, setPaymentDate] = useState(localDate());
  const [payAmount, setPayAmount] = useState('');
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const money = (n: number) =>
    `${settings.currency}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const bills = [...creditCardBills]
    .filter(
      (b) =>
        showAll ||
        b.billingMonth === selectedMonth ||
        !creditCards.some((c) => c.id === b.cardId)
    )
    .sort((a, b) => b.statementDate.localeCompare(a.statementDate));
  const openBills = creditCardBills.filter((b) => b.amountPaid < b.billAmount);
  const outstanding = openBills.reduce(
    (n, b) => n + Math.max(0, b.billAmount - b.amountPaid),
    0
  );
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const chooseCard = (id: string) => {
    setCardId(id);
    const card = creditCards.find((c) => c.id === id);
    if (card) {
      const date = deriveDueDateForMonth(
        `2000-01-${String(card.statementDay).padStart(2, '0')}`,
        selectedMonth
      );
      setStatementDate(date);
      setDueDate(billDueDate(date, card.dueDay));
    }
  };
  const logBill = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (!creditCards.some((c) => c.id === cardId))
        throw new Error('Choose a card.');
      if (
        creditCardBills.some(
          (b) =>
            b.cardId === cardId && b.billingMonth === statementDate.slice(0, 7)
        )
      )
        throw new Error(
          'A bill already exists for this card and month. Review the existing bill instead of adding a duplicate.'
        );
      if (dueDate <= statementDate)
        throw new Error('Due date must be after the bill date.');
      await addCreditCardBill({
        cardId,
        billingMonth: statementDate.slice(0, 7),
        statementDate,
        billAmount: Number(amount),
        amountPaid: 0,
        paymentDueDate: dueDate,
        paymentDateActual: '',
        status: 'Pending',
        payments: [],
      });
      setLogging(false);
      setAmount('');
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Bills, without the busywork</p>
          <h2 className="text-2xl font-bold flex gap-2 items-center">
            <CardIcon />
            Credit cards
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Statement → due date → paid. Your bank balances are separate.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="glass-btn-secondary px-4 py-2 rounded-xl"
            onClick={onOpenAddCard}
          >
            Add card
          </button>
          <button
            disabled={!creditCards.length || isSyncing}
            className="glass-btn-primary px-4 py-2 rounded-xl flex gap-2 items-center"
            onClick={() => {
              chooseCard(creditCards[0]?.id || '');
              setError('');
              setLogging(true);
            }}
          >
            <Plus size={16} />
            Log bill
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <p className="eyebrow">Unpaid bills · all months</p>
          <p className="text-3xl font-semibold mt-3">{money(outstanding)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="eyebrow">Awaiting payment</p>
          <p className="text-3xl font-semibold mt-3">{openBills.length}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="eyebrow">Past due</p>
          <p className="text-3xl font-semibold mt-3 text-rose-300">
            {openBills.filter((b) => b.paymentDueDate < localDate()).length}
          </p>
        </GlassCard>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {creditCards.map((card) => (
          <GlassCard key={card.id} className="p-5">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{card.name}</h3>
              <button
                className="text-sm text-indigo-300"
                onClick={() => {
                  setEditing(card);
                  setError('');
                }}
              >
                Edit cycle
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-3 flex gap-2">
              <CalendarDays size={16} />
              Bill day {card.statementDay} · due {card.dueDay} next month
            </p>
          </GlassCard>
        ))}
      </div>
      {!creditCards.length && (
        <GlassCard className="p-8 text-center">
          <CardIcon className="mx-auto mb-3 text-indigo-300" />
          <h3 className="font-semibold">A simpler way to track your cards</h3>
          <p className="text-sm text-slate-400 mt-2">
            Add a card name and billing cycle to get started.
          </p>
        </GlassCard>
      )}
      <GlassCard className="overflow-hidden">
        <div className="p-5 flex justify-between items-center gap-3">
          <h3 className="font-semibold">Statement history</h3>
          <label className="text-sm flex gap-2">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            All months
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                {[
                  'Card / bill date',
                  'Bill',
                  'Due date',
                  'Paid',
                  'Payment date',
                  'Status',
                  '',
                ].map((h, i) => (
                  <th key={i} className="px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t border-white/10">
                  <td className="px-5 py-4">
                    <p className="font-semibold">
                      {creditCards.find((c) => c.id === b.cardId)?.name ||
                        `Needs matching: ${b.cardId}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {b.statementDate || 'Date missing'}
                    </p>
                  </td>
                  <td className="px-5 py-4">{money(b.billAmount)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {b.paymentDueDate}
                  </td>
                  <td className="px-5 py-4">{money(b.amountPaid)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {b.paymentDateActual || '—'}
                    {Boolean(b.payments?.length) && (
                      <details className="text-xs mt-1">
                        <summary>History</summary>
                        {b.payments?.map((p) => (
                          <p key={p.id}>
                            {p.date}: {money(p.amount)}
                          </p>
                        ))}
                      </details>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`status-pill ${b.amountPaid >= b.billAmount ? 'text-emerald-300' : b.paymentDueDate < localDate() ? 'text-rose-300' : 'text-amber-300'}`}
                    >
                      {billStatus(b)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {b.amountPaid < b.billAmount ? (
                      <button
                        disabled={busy || isSyncing}
                        className="glass-btn-secondary px-3 py-2 rounded-xl whitespace-nowrap"
                        onClick={() => {
                          setPaying(b);
                          setPayAmount(
                            String(
                              Math.round((b.billAmount - b.amountPaid) * 100) /
                                100
                            )
                          );
                          setPaymentDate(localDate());
                          setError('');
                        }}
                      >
                        Record payment
                      </button>
                    ) : (
                      <CheckCheck className="text-emerald-300" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bills.length && (
            <p className="p-8 text-center text-slate-400">
              No bills for this selection.
            </p>
          )}
        </div>
      </GlassCard>
      <p className="text-xs text-slate-400">
        Existing card records and bank transfers are preserved. Unmatched legacy
        bills remain visible for review.
      </p>
      <GlassModal
        isOpen={logging}
        onClose={() => !busy && setLogging(false)}
        title="Log a statement"
        subtitle="Enter the amount printed on your bill."
      >
        <form onSubmit={logBill} className="space-y-4">
          <label className="block text-sm">
            Card
            <select
              required
              className="glass-input w-full mt-2"
              value={cardId}
              onChange={(e) => chooseCard(e.target.value)}
            >
              <option value="">Choose card</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Bill date
            <input
              required
              type="date"
              value={statementDate}
              className="glass-input w-full mt-2"
              onChange={(e) => {
                setStatementDate(e.target.value);
                setDueDate(
                  billDueDate(
                    e.target.value,
                    creditCards.find((c) => c.id === cardId)?.dueDay
                  )
                );
              }}
            />
          </label>
          <label className="block text-sm">
            Bill amount
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full mt-2"
            />
          </label>
          <label className="block text-sm">
            Payment due
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="glass-input w-full mt-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="glass-btn-primary px-5 py-3 rounded-xl"
          >
            {busy ? 'Saving…' : 'Save bill'}
          </button>
        </form>
      </GlassModal>
      <GlassModal
        isOpen={Boolean(paying)}
        onClose={() => !busy && setPaying(null)}
        title="Record a payment"
        subtitle="Updates this bill only. Does not debit a bank account."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (paying)
                await payCreditCardBill(
                  paying.id,
                  paymentDate,
                  Number(payAmount)
                );
              setPaying(null);
            });
          }}
        >
          <label className="block text-sm">
            Amount paid this time
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="glass-input w-full mt-2"
            />
          </label>
          <label className="block text-sm">
            Payment date
            <input
              type="date"
              required
              max={localDate()}
              min={paying?.statementDate}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="glass-input w-full mt-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="glass-btn-primary px-5 py-3 rounded-xl"
          >
            {busy ? 'Saving…' : 'Confirm payment'}
          </button>
        </form>
      </GlassModal>
      <GlassModal
        isOpen={Boolean(editing)}
        onClose={() => !busy && setEditing(null)}
        title="Edit billing cycle"
        subtitle="Existing bills and legacy account details stay unchanged."
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await updateCreditCard(editing);
                setEditing(null);
              });
            }}
          >
            <label className="block text-sm">
              Card name
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                className="glass-input w-full mt-2"
              />
            </label>
            <label className="block text-sm">
              Statement day
              <input
                type="number"
                required
                min="1"
                max="31"
                value={editing.statementDay}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    statementDay: Number(e.target.value),
                  })
                }
                className="glass-input w-full mt-2"
              />
            </label>
            <label className="block text-sm">
              Due day next month
              <input
                type="number"
                required
                min="1"
                max="31"
                value={editing.dueDay}
                onChange={(e) =>
                  setEditing({ ...editing, dueDay: Number(e.target.value) })
                }
                className="glass-input w-full mt-2"
              />
            </label>
            {error && (
              <p role="alert" className="text-rose-300">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="glass-btn-primary px-5 py-3 rounded-xl"
            >
              Save cycle
            </button>
          </form>
        )}
      </GlassModal>
    </div>
  );
};
