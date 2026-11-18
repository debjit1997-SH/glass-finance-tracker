export const TRANSACTION_PAGE_SIZE = 40;
export function transactionPage<T extends { id: string; date: string }>(
  rows: T[],
  requestedPage: number
) {
  const sorted = [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
  );
  const pages = Math.max(1, Math.ceil(sorted.length / TRANSACTION_PAGE_SIZE));
  const page = Math.max(1, Math.min(pages, requestedPage));
  const start = (page - 1) * TRANSACTION_PAGE_SIZE;
  return {
    rows: sorted.slice(start, start + TRANSACTION_PAGE_SIZE),
    page,
    pages,
    total: sorted.length,
    from: sorted.length ? start + 1 : 0,
    to: Math.min(start + TRANSACTION_PAGE_SIZE, sorted.length),
  };
}
