import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { localDate } from '../services/financeRules';
export function QuickEntry() {
  const { accounts, budgetCategories, addIncome, addExpense, settings } =
    useFinance();
  const [kind, setKind] = useState('Expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(localDate());
  const [paid, setPaid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <p className="eyebrow">Less typing, more living</p>
        <h3 className="font-semibold mt-1">Quick entry</h3>
      </div>
      <form
        className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage('');
          try {
            const common = {
              date,
              expectedAmount: Number(amount),
              actualAmount: paid ? Number(amount) : 0,
              actualDate: paid ? date : '',
              accountId: account,
            };
            if (kind === 'Income')
              await addIncome({
                ...common,
                source: name.trim(),
                status: paid ? 'Received' : 'Pending',
              });
            else
              await addExpense({
                ...common,
                name: name.trim(),
                category:
                  category || budgetCategories[0]?.category || 'Miscellaneous',
                status: paid ? 'Paid' : 'Pending',
              });
            setName('');
            setAmount('');
            setMessage('Saved to Google Sheets.');
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="text-xs text-slate-400">
          Type
          <select
            className="glass-input w-full mt-1"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option>Expense</option>
            <option>Income</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Name
          <input
            required
            className="glass-input w-full mt-1"
            placeholder="Coffee, salary…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400">
          Amount ({settings.currency})
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            className="glass-input w-full mt-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400">
          Account
          <select
            required
            className="glass-input w-full mt-1"
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
        <label className="text-xs text-slate-400">
          Date
          <input
            type="date"
            required
            className="glass-input w-full mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {kind === 'Expense' && (
          <label className="text-xs text-slate-400">
            Category
            <select
              className="glass-input w-full mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">
                {budgetCategories[0]?.category || 'Miscellaneous'}
              </option>
              {budgetCategories.map((c) => (
                <option key={c.id}>{c.category}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex gap-2 items-center text-sm">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          {kind === 'Income' ? 'Already received' : 'Already paid'}
        </label>
        <button
          disabled={busy || !name.trim()}
          className="glass-btn-primary rounded-xl px-5 py-3 self-end"
        >
          {busy ? 'Saving…' : 'Save entry'}
        </button>
      </form>
      {message && (
        <p role="status" className="text-sm mt-3">
          {message}
        </p>
      )}
    </GlassCard>
  );
}
