import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Load only pure/services modules. All external requests are mocked; never reach Google.
const sourceRoot = path.resolve('src');
function moduleURL(file, enabled = true) {
  const filename = path.resolve(sourceRoot, file);
  let code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replaceAll(
    'import.meta.env',
    JSON.stringify({ VITE_ENABLE_UPGRADE_WRITES: enabled ? 'true' : 'false' })
  );
  code = code.replace(
    /from ['"](\.[^'"]+)['"]/g,
    (_, relative) =>
      `from '${moduleURL(path.relative(sourceRoot, path.resolve(path.dirname(filename), relative + '.ts')), enabled)}'`
  );
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
}
const rules = await import(moduleURL('services/financeRules.ts'));
const calc = await import(moduleURL('services/calculations.ts'));
const db = await import(moduleURL('services/db.ts'));
const locked = await import(moduleURL('services/db.ts', false));
const memory = new Map();
global.localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, v),
  removeItem: (k) => memory.delete(k),
};
global.fetch = async () => {
  throw new Error('Unexpected network request blocked by test');
};
const response = (data) => ({
  ok: true,
  status: 200,
  text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
});
const baseBill = {
  id: 'ccb-test',
  cardId: 'cc-test',
  billingMonth: '2026-01',
  statementDate: '2026-01-17',
  paymentDueDate: '2026-02-07',
  billAmount: 12000,
  amountPaid: 0,
  paymentDateActual: '',
  status: 'Pending',
};
const loan = {
  id: 'l1',
  loanName: 'Example',
  lender: 'Example',
  monthlyAmount: 1000,
  outstandingPrincipal: 10000,
  interestRate: 8,
  dueDate: '2026-01-17',
  startDate: '2026-01-17',
  accountId: 'a',
  status: 'Pending',
  totalInstallments: 12,
};

test('17th bill is due on 7th of following month, including year rollover', () => {
  assert.equal(rules.billDueDate('2026-11-17', 7), '2026-12-07');
  assert.equal(rules.billDueDate('2026-12-17', 7), '2027-01-07');
  assert.equal(rules.billDueDate('2026-01-17', 31), '2026-02-28');
});
test('partial payments accumulate and preserve history', () => {
  const first = rules.applyBillPayment(baseBill, 5000, '2026-02-01');
  const second = rules.applyBillPayment(first, 7000, '2026-02-05');
  assert.equal(first.status, 'Partial');
  assert.equal(second.amountPaid, 12000);
  assert.equal(second.payments.length, 2);
  assert.equal(rules.billStatus(second), 'Paid on time');
  assert.equal(baseBill.amountPaid, 0);
  assert.throws(() => rules.applyBillPayment(second, 1, '2026-02-05'));
});
test('late completion remains late when an earlier partial payment is added later', () => {
  const first = rules.applyBillPayment(baseBill, 5000, '2026-02-09');
  const second = rules.applyBillPayment(first, 7000, '2026-02-01');
  assert.equal(rules.billStatus(second), 'Paid late');
});
test('quarterly and month-end renewals clamp correctly', () => {
  assert.equal(rules.addMonthsClamped('2026-01-31', 1), '2026-02-28');
  assert.equal(rules.addMonthsClamped('2026-11-30', 3), '2027-02-28');
});
test('foreclosure removes future dues but preserves paid installments and past months', () => {
  const closed = {
    ...loan,
    lifecycle: 'Closed',
    closureDate: '2026-03-10',
    settlementAmount: 8000,
  };
  assert.equal(calc.getMonthlyEmiInstances([closed], [], '2026-04').length, 0);
  assert.equal(calc.getMonthlyEmiInstances([closed], [], '2026-02').length, 1);
  const payment = {
    id: 'p',
    loanId: 'l1',
    month: '2026-03',
    dueDate: '2026-03-17',
    amount: 1000,
    status: 'Paid',
    paidAmount: 1000,
    accountId: 'a',
  };
  assert.equal(
    calc.getMonthlyEmiInstances([closed], [payment], '2026-03')[0].status,
    'Paid'
  );
  assert.equal(rules.outstandingPrincipal(closed), 0);
  assert.equal(closed.outstandingPrincipal, 10000);
});
test('part payment revised EMI does not rewrite earlier monthly schedule', () => {
  const revised = {
    ...loan,
    monthlyAmount: 800,
    totalInstallments: 10,
    loanEvents: [
      {
        date: '2026-05-01',
        previousMonthlyAmount: 1000,
        previousTotalInstallments: 12,
      },
    ],
  };
  assert.equal(
    calc.getMonthlyEmiInstances([revised], [], '2026-04')[0].amount,
    1000
  );
  assert.equal(
    calc.getMonthlyEmiInstances([revised], [], '2026-06')[0].amount,
    800
  );
});
test('actual zero is not replaced with expected amount', () => {
  assert.equal(
    calc
      .calculateLiveBalances(
        [{ id: 'a', openingBalance: 100 }],
        [
          {
            accountId: 'a',
            status: 'Received',
            expectedAmount: 500,
            actualAmount: 0,
          },
        ],
        [],
        [],
        []
      )
      .get('a'),
    100
  );
});
test('card link, loan lifecycle and tax financial year round trip', () => {
  const card = {
    id: 'c',
    name: 'Card',
    bank: 'Bank',
    accountId: 'legacy-account',
    color: 'red',
    limit: 20000,
    currentUnbilled: 100,
    statementDay: 17,
    dueDay: 7,
  };
  assert.equal(
    db.mapSheetRowToEntity(
      'creditCards',
      db.mapEntityToSheetRow('creditCards', card)
    ).accountId,
    card.accountId
  );
  const closed = {
    ...loan,
    lifecycle: 'Closed',
    closureDate: '2026-05-01',
    loanEvents: [{ id: 'event', date: '2026-05-01' }],
  };
  const result = db.mapSheetRowToEntity(
    'emis',
    db.mapEntityToSheetRow('emis', closed)
  );
  assert.equal(result.lifecycle, 'Closed');
  assert.equal(result.loanEvents[0].id, 'event');
  const tax = {
    id: 'tax',
    date: '2025-05-01',
    financialYear: '2025-2026',
    name: 'PPF',
    section: '80C',
    amount: 100,
    notes: 'Keep',
  };
  const taxResult = db.mapSheetRowToEntity(
    'taxSavings',
    db.mapEntityToSheetRow('taxSavings', tax)
  );
  assert.equal(taxResult.financialYear, '2025-2026');
  assert.equal(taxResult.notes, 'Keep');
});
test('read-only preview blocks writes before any POST', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error('no');
  };
  await assert.rejects(
    locked.apiMutate('Accounts', 'create', {}),
    /Read-only preview/
  );
  assert.equal(calls, 0);
});
test('invalid, missing sheet, rejected, local-only and empty write replies fail', async () => {
  for (const reply of [
    'not JSON',
    '',
    { success: false, error: 'Rejected' },
    { success: true, localOnly: true },
    { error: 'Sheet not found' },
  ]) {
    global.fetch = async () => response(reply);
    await assert.rejects(db.apiMutate('TEST', 'create', { id: 'x' }));
  }
});
test('failed read does not erase confirmed cache', async () => {
  db.setCachedStore('expenses', [{ id: 'keep' }]);
  global.fetch = async () => {
    throw new Error('offline');
  };
  await assert.rejects(db.getAllFromStore('expenses'));
  assert.equal(db.getCachedStore('expenses')[0].id, 'keep');
});
test('shared legacy card sheet is separated into card and bill rows', async () => {
  global.fetch = async () =>
    response([
      { id: 'cc-1', CardName: 'Card', CreditLimit: 10000 },
      {
        id: 'ccb-1',
        CardName: 'cc-1',
        BillingMonth: '2026-01',
        BillAmount: 100,
      },
    ]);
  assert.deepEqual(
    (await db.getAllFromStore('creditCards')).map((r) => r.id),
    ['cc-1']
  );
  assert.deepEqual(
    (await db.getAllFromStore('creditCardBills')).map((r) => r.id),
    ['ccb-1']
  );
});
test('failed create and delete leave local cache unchanged', async () => {
  db.setCachedStore('expenses', [{ id: 'keep' }]);
  global.fetch = async (_, options) =>
    options?.method === 'GET'
      ? response([])
      : response({ success: false, error: 'denied' });
  await assert.rejects(
    db.putItemInStore('expenses', { id: 'new', name: 'New' })
  );
  assert.deepEqual(db.getCachedStore('expenses'), [{ id: 'keep' }]);
  await assert.rejects(db.deleteItemFromStore('expenses', 'keep'));
  assert.deepEqual(db.getCachedStore('expenses'), [{ id: 'keep' }]);
});
test('create-only recurring entry never overwrites an already-paid entry', async () => {
  let posts = 0;
  global.fetch = async (_, options) => {
    if (options.method === 'POST') posts++;
    return response([
      {
        id: 'recurring-r1-2026-01',
        Name: 'Rent',
        Status: 'Paid',
        ActualAmount: 100,
      },
    ]);
  };
  const entry = await db.putItemInStore(
    'expenses',
    { id: 'recurring-r1-2026-01', name: 'Rent', status: 'Pending' },
    true
  );
  assert.equal(posts, 0);
  assert.equal(entry.status, 'Paid');
});
test('update sends only mapped fields with the expected revision', async () => {
  let payload;
  db.setCachedStore('accounts', [{ id: 'a', _revision: 'rev-1' }]);
  global.fetch = async (_, options) => {
    if (options.method === 'GET')
      return response([
        {
          id: 'a',
          Name: 'Old',
          Notes: 'Keep',
          Custom: 'keep',
          _revision: 'rev-1',
        },
      ]);
    payload = JSON.parse(options.body);
    return response({ success: true, id: 'a', revision: 'rev-2' });
  };
  await db.putItemInStore('accounts', {
    id: 'a',
    name: 'New',
    openingBalance: 100,
    type: 'bank',
    createdAt: '2026-01-01',
  });
  assert.equal(payload.row.Notes, undefined);
  assert.equal(payload.row.Custom, undefined);
  assert.equal(payload.expectedRevision, 'rev-1');
  assert.equal(db.getCachedStore('accounts')[0]._revision, 'rev-2');
});
test('stale client cannot overwrite a changed record', async () => {
  let posts = 0;
  db.setCachedStore('accounts', [{ id: 'a', _revision: 'old' }]);
  global.fetch = async (_, options) => {
    if (options.method === 'POST') posts++;
    return response([{ id: 'a', Name: 'Changed', _revision: 'new' }]);
  };
  await assert.rejects(
    db.putItemInStore('accounts', { id: 'a', name: 'Stale' }),
    /Refresh/
  );
  assert.equal(posts, 0);
});
test('reset and bulk import cannot modify live records', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return response({ success: true });
  };
  await assert.rejects(db.clearAllDatabaseData());
  await assert.rejects(db.importDatabase({}));
  await assert.rejects(db.putItemsInStore('expenses', []));
  assert.equal(calls, 0);
});
