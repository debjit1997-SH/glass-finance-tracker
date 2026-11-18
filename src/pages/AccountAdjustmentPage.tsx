import { useRef, useState } from 'react';
import { ArrowLeftRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';

type Preview = {
  accountId: string;
  accountName: string;
  currentBalance: number;
  targetBalance: number;
  delta: number;
  kind: 'Expense' | 'Income' | 'None';
  date: string;
  revision: string;
  requestId: string;
  targetCents: number;
};
async function requestAdjustment(body: Record<string, unknown>) {
  const response = await fetch('/api/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(50000),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true)
    throw Object.assign(
      new Error(
        result.error || 'Could not confirm adjustment. Refresh before retrying.'
      ),
      { code: result.code }
    );
  return result;
}
export function AccountAdjustmentPage() {
  const {
    accounts,
    incomes,
    expenses,
    settings,
    refreshAllFromDB,
    isStoreLoading,
  } = useFinance();
  const [accountId, setAccountId] = useState('');
  const [actual, setActual] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const running = useRef(false);
  const enabled = import.meta.env.VITE_ENABLE_UPGRADE_WRITES === 'true';
  const eligible = accounts.filter(
    (a) => ['bank', 'cash', 'wallet'].includes(a.type) && !a.isArchived
  );
  const money = (value: number) =>
    `${settings.currency}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const history = [
    ...expenses
      .filter((e) => e.name === 'Account adjustment' && e.id.startsWith('adj_'))
      .map((e) => ({
        id: e.id,
        accountId: e.accountId,
        date: e.actualDate || e.date,
        amount: e.actualAmount,
        kind: 'Expense',
        status: e.status,
      })),
    ...incomes
      .filter(
        (i) => i.source === 'Account adjustment' && i.id.startsWith('adj_')
      )
      .map((i) => ({
        id: i.id,
        accountId: i.accountId,
        date: i.actualDate || i.date,
        amount: i.actualAmount,
        kind: 'Income',
        status: i.status,
      })),
  ]
    .filter((item) => !accountId || item.accountId === accountId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const reset = () => {
    setPreview(null);
    setError('');
    setMessage('');
  };
  const inspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (running.current) return;
    setError('');
    setMessage('');
    setPreview(null);
    if (!accountId || !/^-?\d+(?:\.\d{1,2})?$/.test(actual.trim())) {
      setError(
        'Select an account and enter an actual balance with up to two decimal places.'
      );
      return;
    }
    const targetCents = Math.round(Number(actual) * 100);
    if (
      !Number.isSafeInteger(targetCents) ||
      Math.abs(targetCents) > 100000000000000
    ) {
      setError('Balance exceeds the supported amount.');
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      const result = await requestAdjustment({
        action: 'previewAdjustment',
        accountId,
        targetCents,
      });
      setPreview({
        ...result,
        targetCents,
        requestId: `adj_${crypto.randomUUID()}_${targetCents}`,
      });
    } catch (e: any) {
      setError(
        e.message === 'Unknown action.'
          ? 'Update the Apps Script deployment with the adjustment patch first.'
          : e.message
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!preview || running.current || !enabled || preview.delta === 0) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await requestAdjustment({
        action: 'adjustBalance',
        accountId: preview.accountId,
        targetCents: preview.targetCents,
        id: preview.requestId,
        expectedRevision: preview.revision,
      });
      setMessage(
        result.noChange
          ? 'Already balanced. No entry was added.'
          : `${result.duplicate ? 'Already saved — no duplicate added.' : 'Adjustment saved.'} Current recorded balance: ${money(result.currentBalance)}.`
      );
      setPreview(null);
      setActual('');
      await refreshAllFromDB();
    } catch (e: any) {
      setError(e.message);
      if (e.code === 'CONFLICT') setPreview(null);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Catch up in one entry</p>
        <h2 className="text-2xl font-bold flex gap-2 items-center">
          <ArrowLeftRight />
          Current account adjustment
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Enter what is in your account now. We will calculate the difference
          using fresh Sheet records.
        </p>
      </div>
      <GlassCard className="p-5 sm:p-6">
        <form
          onSubmit={inspect}
          className="grid md:grid-cols-3 gap-4 items-end"
        >
          <label className="text-sm">
            Account
            <select
              disabled={busy || isStoreLoading('accounts')}
              required
              className="glass-input w-full mt-2"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                reset();
              }}
            >
              <option value="">Choose bank, cash or wallet</option>
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Actual current balance ({settings.currency})
            <input
              disabled={busy}
              required
              type="number"
              step="0.01"
              placeholder="e.g. 12450.75"
              className="glass-input w-full mt-2"
              value={actual}
              onChange={(e) => {
                setActual(e.target.value);
                reset();
              }}
            />
          </label>
          <button
            disabled={busy || !accountId || actual.trim() === ''}
            className="glass-btn-primary rounded-xl px-5 py-3 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Checking…' : 'Calculate adjustment'}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4">
          Current balance only, as of today. This is not a historical statement
          balance. Card bills and investment valuations are separate.
        </p>
      </GlassCard>
      {error && (
        <div
          role="alert"
          className="glass-panel rounded-xl p-4 text-sm text-rose-300"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="glass-panel rounded-xl p-4 text-sm text-emerald-300 flex gap-2"
        >
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      {preview && (
        <GlassCard className="p-5 sm:p-6 space-y-5">
          <div>
            <p className="eyebrow">Review before saving</p>
            <h3 className="font-semibold mt-1">
              {preview.accountName} · {preview.date}
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400">App balance</p>
              <p className="text-2xl font-semibold mt-1">
                {money(preview.currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Actual balance</p>
              <p className="text-2xl font-semibold mt-1">
                {money(preview.targetBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">
                {preview.kind === 'None'
                  ? 'Difference'
                  : `${preview.kind} to add`}
              </p>
              <p
                className={`text-2xl font-semibold mt-1 ${preview.delta < 0 ? 'text-rose-300' : 'text-emerald-300'}`}
              >
                {money(Math.abs(preview.delta))}
              </p>
            </div>
          </div>
          {preview.delta === 0 ? (
            <p className="text-sm text-emerald-300">
              Already balanced. No income or expense entry is needed.
            </p>
          ) : (
            <>
              <div className="glass-panel-subtle rounded-xl p-4 text-sm space-y-2">
                <p>
                  <span className="text-slate-400">Description:</span> Account
                  adjustment
                </p>
                <p>
                  <span className="text-slate-400">Notes:</span> check bank
                  statement for details
                </p>
                <p>
                  <span className="text-slate-400">Status:</span>{' '}
                  {preview.kind === 'Expense'
                    ? 'Paid · category: Account adjustment'
                    : 'Received'}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                One new balancing entry will be added. Previous entries and
                opening balance stay unchanged. The server checks this balance
                again before saving.
              </p>
              <button
                disabled={busy || !enabled}
                onClick={confirm}
                className="glass-btn-primary px-5 py-3 rounded-xl"
              >
                {busy
                  ? 'Saving…'
                  : `Confirm ${preview.kind.toLowerCase()} adjustment`}
              </button>
              {!enabled && (
                <p className="text-xs text-amber-300">
                  Read-only mode: preview is available; saving is disabled.
                </p>
              )}
            </>
          )}
        </GlassCard>
      )}
      <GlassCard className="p-5">
        <h3 className="font-semibold">Adjustment history</h3>
        <p className="text-xs text-slate-400 mt-2 mb-4">
          These are net balance corrections, not itemized spending. If you later
          enter the same transactions individually, reconcile or archive the
          corresponding adjustment so both are not counted.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                {['Date', 'Account', 'Entry', 'Amount', 'Status'].map((t) => (
                  <th className="py-3 pr-4" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="py-3 pr-4 whitespace-nowrap">{item.date}</td>
                  <td className="py-3 pr-4">
                    {accounts.find((a) => a.id === item.accountId)?.name ||
                      item.accountId}
                  </td>
                  <td className="py-3 pr-4">{item.kind}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {money(item.amount)}
                  </td>
                  <td className="py-3 pr-4">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.length && (
            <p className="text-sm text-slate-400 py-4">
              No adjustment entries for this selection.
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
