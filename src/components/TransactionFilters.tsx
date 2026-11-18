export interface TransactionFilterValue {
  query: string;
  account: string;
  from: string;
  to: string;
  allMonths: boolean;
}
export const emptyTransactionFilter: TransactionFilterValue = {
  query: '',
  account: '',
  from: '',
  to: '',
  allMonths: false,
};
export function matchesTransaction(
  item: {
    accountId: string;
    date: string;
    name?: string;
    source?: string;
    notes?: string;
  },
  filter: TransactionFilterValue
) {
  return (
    (!filter.account || item.accountId === filter.account) &&
    (!filter.from || item.date >= filter.from) &&
    (!filter.to || item.date <= filter.to) &&
    `${item.name || item.source || ''} ${item.notes || ''}`
      .toLowerCase()
      .includes(filter.query.toLowerCase())
  );
}
export function TransactionFilters({
  value,
  onChange,
  accounts,
}: {
  value: TransactionFilterValue;
  onChange: (value: TransactionFilterValue) => void;
  accounts: { id: string; name: string }[];
}) {
  return (
    <div className="glass-panel rounded-2xl p-4 grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <label className="text-xs text-slate-400">
        Search
        <input
          aria-label="Search transactions"
          className="glass-input w-full mt-1 text-sm"
          placeholder="Name or note…"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400">
        Account
        <select
          className="glass-input w-full mt-1 text-sm"
          value={value.account}
          onChange={(e) => onChange({ ...value, account: e.target.value })}
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-400">
        From
        <input
          type="date"
          className="glass-input w-full mt-1 text-sm"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400">
        To
        <input
          type="date"
          className="glass-input w-full mt-1 text-sm"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>
      <label className="text-sm flex items-center gap-2 pt-4">
        <input
          type="checkbox"
          checked={value.allMonths}
          onChange={(e) => onChange({ ...value, allMonths: e.target.checked })}
        />
        Search all months
      </label>
    </div>
  );
}
