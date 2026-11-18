import type { CreditCardBill, EmiLoan } from '../types/finance';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function financialYearForDate(date: string): string {
  const [year, month] = date.split('-').map(Number);
  if (!year || !month) return '';
  const start = month < 4 ? year - 1 : year;
  return `${start}-${start + 1}`;
}
export function addMonthsClamped(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();
  return localDate(
    new Date(target.getFullYear(), target.getMonth(), Math.min(d, last))
  );
}
export function billDueDate(statementDate: string, dueDay = 7): string {
  const next = addMonthsClamped(statementDate, 1).slice(0, 7);
  const [y, m] = next.split('-').map(Number);
  return `${next}-${String(Math.min(Math.max(1, dueDay), new Date(y, m, 0).getDate())).padStart(2, '0')}`;
}
export function billStatus(bill: CreditCardBill, today = localDate()): string {
  if (bill.amountPaid >= bill.billAmount)
    return bill.paymentDateActual &&
      bill.paymentDateActual > bill.paymentDueDate
      ? 'Paid late'
      : bill.paymentDateActual
        ? 'Paid on time'
        : 'Paid · date unknown';
  if (bill.paymentDueDate < today)
    return bill.amountPaid > 0 ? 'Overdue · partially paid' : 'Overdue';
  return bill.amountPaid > 0 ? 'Partially paid' : 'Pending';
}
export function applyBillPayment(
  bill: CreditCardBill,
  amount: number,
  date: string
): CreditCardBill {
  const remaining = Math.round((bill.billAmount - bill.amountPaid) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining)
    throw new Error(
      'Enter a payment greater than zero and no more than the remaining bill.'
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < bill.statementDate ||
    date > localDate()
  )
    throw new Error('Payment date must be between the bill date and today.');
  const amountPaid = Math.round((bill.amountPaid + amount) * 100) / 100;
  return {
    ...bill,
    amountPaid,
    paymentDateActual:
      date > (bill.paymentDateActual || '') ? date : bill.paymentDateActual,
    status: amountPaid >= bill.billAmount ? 'Paid' : 'Partial',
    payments: [
      ...(bill.payments || []),
      { id: crypto.randomUUID(), date, amount },
    ],
  };
}
export function outstandingPrincipal(loan: EmiLoan): number {
  return loan.lifecycle === 'Closed' ? 0 : loan.outstandingPrincipal;
}
