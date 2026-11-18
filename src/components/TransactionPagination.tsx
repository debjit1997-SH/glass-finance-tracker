import { useState } from 'react';
import { transactionPage } from '../services/transactionPagination';

export function useTransactionPage<T extends { id: string; date: string }>(
  rows: T[],
  filterKey: string
) {
  const [selection, setSelection] = useState({ key: filterKey, page: 1 });
  const pagination = transactionPage(
    rows,
    selection.key === filterKey ? selection.page : 1
  );
  return {
    ...pagination,
    go: (page: number) => setSelection({ key: filterKey, page }),
  };
}
export function TransactionPagination({
  pagination,
}: {
  pagination: {
    from: number;
    to: number;
    total: number;
    page: number;
    pages: number;
    go: (page: number) => void;
  };
}) {
  const p = pagination;
  return (
    <nav
      aria-label="Transaction pages"
      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
    >
      <span className="text-slate-400" aria-live="polite">
        {p.from}–{p.to} of {p.total} entries · Newest date first
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="glass-btn-secondary px-3 py-2 disabled:opacity-40"
          disabled={p.page === 1}
          onClick={() => p.go(p.page - 1)}
        >
          Previous
        </button>
        <label>
          Page{' '}
          <select
            aria-label="Page number"
            className="glass-input mx-1 px-2 py-1"
            value={p.page}
            onChange={(e) => p.go(Number(e.target.value))}
          >
            {Array.from({ length: p.pages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{' '}
          of {p.pages}
        </label>
        <button
          type="button"
          className="glass-btn-secondary px-3 py-2 disabled:opacity-40"
          disabled={p.page === p.pages}
          onClick={() => p.go(p.page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
