import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { GlassModal } from './ui/GlassModal';
import { deriveDueDateForMonth } from '../services/calculations';
import { localDate } from '../services/financeRules';
import * as db from '../services/db';
export function RecurringTemplates() {
  const {
    recurringBills,
    accounts,
    selectedMonth,
    addRecurringBill,
    refreshAllFromDB,
  } = useFinance();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'Income' | 'Expense'>('Expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [day, setDay] = useState(1);
  const [category, setCategory] = useState('Housing & Rent');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const templates = recurringBills.filter((b) => b.templateEnabled);
  const createPending = async () => {
    setBusy(true);
    setMessage('');
    let count = 0;
    try {
      for (const t of templates) {
        if (selectedMonth < t.nextRenewalDate.slice(0, 7)) continue;
        const id = `recurring-${t.id}-${selectedMonth}`;
        const store = t.entryKind === 'Income' ? 'incomes' : 'expenses';
        const existing = await db.getAllFromStore<any>(store);
        if (existing.some((e) => e.id === id)) continue;
        const date = deriveDueDateForMonth(t.nextRenewalDate, selectedMonth);
        const common = {
          id,
          date,
          accountId: t.accountId,
          expectedAmount: t.amount,
          actualAmount: 0,
          actualDate: '',
          status: 'Pending',
          notes: `Recurring template: ${t.id}`,
        };
        await db.putItemInStore(
          store,
          store === 'incomes'
            ? { ...common, source: t.name }
            : { ...common, name: t.name, category: t.category },
          true
        );
        count++;
      }
      await refreshAllFromDB();
      setMessage(
        `${count} new pending entries saved. Existing entries were kept.`
      );
    } catch (e: any) {
      setMessage(
        `${count} entries confirmed before stopping. ${e.message} Existing entries are safe; refreshing and preparing again skips confirmed IDs.`
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="eyebrow">Plan once, reuse monthly</p>
          <h3 className="font-semibold mt-1">Income & expense templates</h3>
          <p className="text-sm text-slate-400 mt-1">
            Prepare pending entries for {selectedMonth}. Nothing is marked paid
            automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="glass-btn-secondary px-3 py-2 rounded-xl text-xs"
            onClick={() => {
              setMessage('');
              setOpen(true);
            }}
          >
            Add template
          </button>
          <button
            disabled={busy || !templates.length}
            className="glass-btn-primary px-3 py-2 rounded-xl text-xs"
            onClick={createPending}
          >
            {busy ? 'Preparing…' : 'Prepare this month'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <span key={t.id} className="status-pill text-indigo-300">
            {t.entryKind} · {t.name} · {t.amount}
          </span>
        ))}
      </div>
      {!templates.length && (
        <p className="text-sm text-slate-400">
          Add salary, rent or a subscription. Existing recurring bills are not
          converted automatically.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <GlassModal
        isOpen={open}
        onClose={() => !busy && setOpen(false)}
        title="Monthly template"
        subtitle="Creates planned entries only when you prepare the month."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            try {
              await addRecurringBill({
                name: name.trim(),
                amount: Number(amount),
                frequency: 'Monthly',
                nextRenewalDate: deriveDueDateForMonth(
                  `2000-01-${String(day).padStart(2, '0')}`,
                  localDate().slice(0, 7)
                ),
                category,
                accountId: account,
                autoRenew: false,
                templateEnabled: true,
                entryKind: kind,
              });
              setOpen(false);
              setName('');
              setAmount('');
            } catch (e: any) {
              setMessage(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Type
            <select
              className="glass-input w-full mt-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option>Income</option>
              <option>Expense</option>
            </select>
          </label>
          <label className="block text-sm">
            Name
            <input
              required
              className="glass-input w-full mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="glass-input w-full mt-2"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Day of month
              <input
                type="number"
                min="1"
                max="31"
                required
                className="glass-input w-full mt-2"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="block text-sm">
            Account
            <select
              required
              className="glass-input w-full mt-2"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Choose account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {kind === 'Expense' && (
            <label className="block text-sm">
              Category
              <input
                required
                className="glass-input w-full mt-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
          )}
          {message && (
            <p role="alert" className="text-sm text-rose-300">
              {message}
            </p>
          )}
          <button
            disabled={busy || !name.trim()}
            className="glass-btn-primary px-4 py-3 rounded-xl"
          >
            Save template
          </button>
        </form>
      </GlassModal>
    </GlassCard>
  );
}
