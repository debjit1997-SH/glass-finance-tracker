import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

function harness() {
  const props = new Map([['AURA_API_SECRET', 's'.repeat(40)]]),
    books = new Map();
  let copies = 0,
    locked = false;
  const clone = (v) =>
    v instanceof Date
      ? new Date(v)
      : Array.isArray(v)
        ? v.map(clone)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))
          : v;
  class Sheet {
    constructor(name, cells = []) {
      this.name = name;
      this.cells = clone(cells);
    }
    getName() {
      return this.name;
    }
    getLastRow() {
      return this.cells.length;
    }
    getLastColumn() {
      return Math.max(0, ...this.cells.map((r) => r.length));
    }
    getDataRange() {
      return this.getRange(
        1,
        1,
        Math.max(1, this.getLastRow()),
        Math.max(1, this.getLastColumn())
      );
    }
    getRange(r, c, n = 1, m = 1) {
      const self = this;
      return {
        getValues() {
          return Array.from({ length: n }, (_, i) =>
            Array.from({ length: m }, (_, j) => {
              const v = self.cells[r - 1 + i]?.[c - 1 + j] ?? '';
              return v && typeof v === 'object' && 'formula' in v ? v.value : v;
            })
          );
        },
        getFormulas() {
          return Array.from({ length: n }, (_, i) =>
            Array.from(
              { length: m },
              (_, j) => self.cells[r - 1 + i]?.[c - 1 + j]?.formula || ''
            )
          );
        },
        setValues(rows) {
          for (let i = 0; i < n; i++) {
            self.cells[r - 1 + i] ??= [];
            for (let j = 0; j < m; j++) {
              let v = rows[i][j];
              if (typeof v === 'string' && v.startsWith('='))
                v = { formula: v, value: 42 };
              else if (typeof v === 'string' && v.startsWith("'"))
                v = v.slice(1);
              self.cells[r - 1 + i][c - 1 + j] = v;
            }
          }
          return this;
        },
      };
    }
  }
  class Book {
    constructor(id, sheets) {
      this.id = id;
      this.sheets = sheets;
      books.set(id, this);
    }
    getId() {
      return this.id;
    }
    getName() {
      return 'Finance';
    }
    getUrl() {
      return 'https://example.test/' + this.id;
    }
    getSpreadsheetTimeZone() {
      return 'Asia/Kolkata';
    }
    getSheets() {
      return this.sheets;
    }
    getSheetByName(n) {
      return this.sheets.find((s) => s.name === n) || null;
    }
    insertSheet(n) {
      const s = new Sheet(n);
      this.sheets.push(s);
      return s;
    }
    copy() {
      copies++;
      return new Book(
        'copy-' + copies,
        this.sheets.map((s) => new Sheet(s.name, s.cells))
      );
    }
  }
  const original = new Book('original', [
    new Sheet('Accounts', [
      ['id', 'Name', 'Type', 'OpeningBalance', 'Notes', 'Custom formula'],
      [
        'old-id',
        'Main bank',
        'bank',
        5000,
        'Keep exactly',
        { formula: '=1+41', value: 42 },
      ],
    ]),
    new Sheet('Personal Notes', [['Anything'], ['Do not touch']]),
  ]);
  const context = {
    console: { log() {} },
    Date,
    Set,
    JSON,
    Number,
    String,
    Object,
    Array,
    Boolean,
    Error,
    Math,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => original,
      openById: (id) => {
        if (!books.has(id)) throw new Error('not found');
        return books.get(id);
      },
      flush() {},
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) || null,
        setProperty: (k, v) => props.set(k, v),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock() {
          if (locked) throw new Error('lock busy');
          locked = true;
        },
        releaseLock() {
          locked = false;
        },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_, s) => [...createHash('sha256').update(s).digest()],
      formatDate: (date, zone, format) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: zone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date);
        return format === 'yyyy-MM' ? parts.slice(0, 7) : parts;
      },
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({
        setMimeType() {
          return JSON.parse(text);
        },
      }),
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), context);
  return {
    context,
    original,
    props,
    books,
    get copies() {
      return copies;
    },
    post: (body) =>
      context.doPost({
        postData: {
          contents: JSON.stringify({ token: 's'.repeat(40), ...body }),
        },
      }),
  };
}
test('preview does not write; migration copies first, appends only, and is repeatable', () => {
  const h = harness(),
    before = JSON.stringify(h.original.getSheetByName('Accounts').cells);
  h.context.previewUpgrade();
  assert.equal(h.copies, 0);
  assert.equal(
    JSON.stringify(h.original.getSheetByName('Accounts').cells),
    before
  );
  h.context.backupAndUpgrade();
  assert.equal(h.copies, 1);
  const a = h.original.getSheetByName('Accounts');
  assert.deepEqual(a.cells[1], [
    'old-id',
    'Main bank',
    'bank',
    5000,
    'Keep exactly',
    { formula: '=1+41', value: 42 },
  ]);
  assert.deepEqual(
    h.books.get('copy-1').getSheetByName('Accounts').cells,
    JSON.parse(before)
  );
  assert.equal(
    h.original.getSheetByName('Personal Notes').cells[1][0],
    'Do not touch'
  );
  assert(h.original.getSheetByName('EMI Payments'));
  assert.equal(h.props.get('AURA_WRITES_ENABLED'), 'false');
  h.context.backupAndUpgrade();
  assert.equal(h.copies, 1);
});
test('duplicate headers stop migration before backup or mutation', () => {
  const h = harness();
  h.original.getSheetByName('Accounts').cells[0].push('Name');
  assert.throws(() => h.context.backupAndUpgrade(), /Duplicate/);
  assert.equal(h.copies, 0);
});
test('authentication and write gate block unapproved mutations', () => {
  const h = harness();
  assert.equal(
    h.post({ token: 'bad', action: 'read', sheet: 'Accounts' }).code,
    'AUTH_REQUIRED'
  );
  assert.equal(h.context.doGet().code, 'AUTH_REQUIRED');
  assert.equal(
    h.post({
      action: 'create',
      sheet: 'Accounts',
      id: 'new',
      row: { id: 'new' },
    }).success,
    false
  );
});
test('stable create ID is preserved, retry is idempotent and different payload conflicts', () => {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  const req = {
    action: 'create',
    sheet: 'Accounts',
    id: 'stable-client-id',
    row: { id: 'stable-client-id', Name: 'New', OpeningBalance: 0 },
  };
  assert.equal(h.post(req).id, 'stable-client-id');
  assert.equal(h.post(req).duplicate, true);
  assert.equal(h.original.getSheetByName('Accounts').getLastRow(), 3);
  assert.equal(
    h.post({ ...req, row: { ...req.row, Name: 'Other' } }).success,
    false
  );
});
test('revision update preserves formulas, unknown columns and notes; stale write rejected', () => {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  const row = h.post({ action: 'read', sheet: 'Accounts' })[0];
  const result = h.post({
    action: 'update',
    sheet: 'Accounts',
    id: 'old-id',
    expectedRevision: row._revision,
    row: { Name: 'Updated' },
  });
  assert.equal(result.success, true);
  assert.equal(result.row.Notes, 'Keep exactly');
  assert.equal(
    h.original.getSheetByName('Accounts').cells[1][5].formula,
    '=1+41'
  );
  const stale = h.post({
    action: 'update',
    sheet: 'Accounts',
    id: 'old-id',
    expectedRevision: row._revision,
    row: { Name: 'Stale' },
  });
  assert.equal(stale.code, 'CONFLICT');
});
test('formula-backed editable cell is never overwritten', () => {
  const h = harness();
  h.original.getSheetByName('Accounts').cells[1][3] = {
    formula: '=21*2',
    value: 42,
  };
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  const row = h.post({ action: 'read', sheet: 'Accounts' })[0];
  const result = h.post({
    action: 'update',
    sheet: 'Accounts',
    id: 'old-id',
    expectedRevision: row._revision,
    row: { OpeningBalance: 100 },
  });
  assert.equal(result.success, false);
  assert.equal(
    h.original.getSheetByName('Accounts').cells[1][3].formula,
    '=21*2'
  );
});
test('delete archives instead of physically deleting; prior record and ID remain', () => {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  const row = h.post({ action: 'read', sheet: 'Accounts' })[0];
  assert.equal(
    h.post({
      action: 'delete',
      sheet: 'Accounts',
      id: 'old-id',
      expectedRevision: row._revision,
    }).archived,
    true
  );
  assert.equal(h.original.getSheetByName('Accounts').getLastRow(), 2);
  assert.equal(h.original.getSheetByName('Accounts').cells[1][0], 'old-id');
  assert.equal(h.post({ action: 'read', sheet: 'Accounts' }).length, 0);
});
test('template retry never replaces an existing paid transaction', () => {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  h.post({
    action: 'create',
    sheet: 'Expense Tracker',
    id: 'template-2026-11',
    row: { id: 'template-2026-11', Name: 'Rent', Status: 'Paid' },
  });
  const repeat = h.post({
    action: 'create',
    sheet: 'Expense Tracker',
    id: 'template-2026-11',
    createOnly: true,
    row: { id: 'template-2026-11', Name: 'Rent', Status: 'Pending' },
  });
  assert.equal(repeat.row.Status, 'Paid');
});
test('formula-looking user text remains literal text', () => {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  const result = h.post({
    action: 'create',
    sheet: 'Accounts',
    id: 'literal',
    row: { id: 'literal', Name: '=IMPORTXML("bad")' },
  });
  assert.equal(result.success, true);
  assert.equal(
    h.original.getSheetByName('Accounts').cells[2][1],
    '=IMPORTXML("bad")'
  );
});

function adjustmentHarness() {
  const h = harness();
  h.context.backupAndUpgrade();
  h.context.enableWritesAfterReview();
  return h;
}
function adjustmentRequest(
  h,
  targetCents,
  id = 'adj_11111111-1111-4111-8111-111111111111_' + targetCents
) {
  const preview = h.post({
    action: 'previewAdjustment',
    accountId: 'old-id',
    targetCents,
  });
  return {
    preview,
    request: {
      action: 'adjustBalance',
      accountId: 'old-id',
      targetCents,
      id,
      expectedRevision: preview.revision,
    },
  };
}
test('account deficit creates exactly one paid expense with requested description/notes', () => {
  const h = adjustmentHarness();
  const { preview, request } = adjustmentRequest(h, 320000);
  assert.equal(preview.currentBalance, 5000);
  assert.equal(preview.delta, -1800);
  assert.equal(preview.kind, 'Expense');
  const result = h.post(request);
  assert.equal(result.success, true);
  assert.equal(result.currentBalance, 3200);
  const entries = h.post({ action: 'read', sheet: 'Expense Tracker' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].Name, 'Account adjustment');
  assert.equal(entries[0].Notes, 'check bank statement for details');
  assert.equal(entries[0].Status, 'Paid');
  assert.equal(entries[0].ActualAmount, 1800);
  assert.equal(h.original.getSheetByName('Accounts').cells[1][3], 5000);
  assert.equal(
    h.post({
      action: 'previewAdjustment',
      accountId: 'old-id',
      targetCents: 320000,
    }).delta,
    0
  );
});
test('surplus becomes received income and zero difference adds no row', () => {
  const h = adjustmentHarness();
  const increase = adjustmentRequest(h, 550050);
  const result = h.post(increase.request);
  assert.equal(result.entry.Source, 'Account adjustment');
  assert.equal(result.entry.ActualAmount, 500.5);
  assert.equal(result.entry.Status, 'Received');
  const same = adjustmentRequest(
    h,
    550050,
    'adj_22222222-2222-4222-8222-222222222222_550050'
  );
  assert.equal(h.post(same.request).noChange, true);
  assert.equal(h.post({ action: 'read', sheet: 'Income Tracker' }).length, 1);
});
test('repeated confirmation cannot double count a saved adjustment', () => {
  const h = adjustmentHarness();
  const { request } = adjustmentRequest(h, 250000);
  h.post(request);
  const retry = h.post(request);
  assert.equal(retry.duplicate, true);
  assert.equal(h.post({ action: 'read', sheet: 'Expense Tracker' }).length, 1);
});
test('adjustment detects changed account history instead of saving a stale delta', () => {
  const h = adjustmentHarness();
  const { request } = adjustmentRequest(h, 250000);
  h.post({
    action: 'create',
    sheet: 'Expense Tracker',
    id: 'new-spend',
    row: {
      id: 'new-spend',
      Name: 'Tea',
      Account: 'old-id',
      ActualAmount: 100,
      Status: 'Paid',
    },
  });
  const result = h.post(request);
  assert.equal(result.code, 'CONFLICT');
  assert.equal(h.post({ action: 'read', sheet: 'Expense Tracker' }).length, 1);
});
test('fresh ledger includes income, paid expense, transfers and EMI without double counting legacy EMI', () => {
  const h = adjustmentHarness();
  const add = (sheet, id, row) =>
    h.post({ action: 'create', sheet, id, row: { id, ...row } });
  add('Income Tracker', 'i', {
    Account: 'old-id',
    ActualAmount: 1000,
    Status: 'Received',
  });
  add('Income Tracker', 'pending', {
    Account: 'old-id',
    ExpectedAmount: 2000,
    Status: 'Pending',
  });
  add('Expense Tracker', 'e', {
    Account: 'old-id',
    ActualAmount: 100,
    Status: 'Paid',
  });
  add('Account Transfers', 't', {
    FromAccount: 'old-id',
    ToAccount: 'other',
    Amount: 200,
    Status: 'Completed',
  });
  add('EMI Tracker', 'l', {
    Account: 'old-id',
    MonthlyAmount: 300,
    Status: 'Paid',
    StartDate: '2026-01-05',
    DueDate: '2026-01-05',
  });
  add('EMI Payments', 'p', {
    Account: 'old-id',
    LoanId: 'l',
    Month: '2026-01',
    PaidAmount: 300,
    Status: 'Paid',
  });
  assert.equal(
    h.post({
      action: 'previewAdjustment',
      accountId: 'old-id',
      targetCents: 540000,
    }).currentBalance,
    5400
  );
});
test('zero and negative actual balances work; invalid amounts and card accounts are rejected', () => {
  const h = adjustmentHarness();
  const zero = adjustmentRequest(h, 0);
  assert.equal(h.post(zero.request).currentBalance, 0);
  const negative = adjustmentRequest(h, -1050);
  assert.equal(h.post(negative.request).currentBalance, -10.5);
  assert.equal(
    h.post({
      action: 'previewAdjustment',
      accountId: 'old-id',
      targetCents: 1.5,
    }).success,
    false
  );
  assert.equal(
    h.post({
      action: 'previewAdjustment',
      accountId: 'old-id',
      targetCents: null,
    }).success,
    false
  );
  h.post({
    action: 'create',
    sheet: 'Accounts',
    id: 'card',
    row: { id: 'card', Name: 'Card', Type: 'credit_card', OpeningBalance: 0 },
  });
  assert.equal(
    h.post({ action: 'previewAdjustment', accountId: 'card', targetCents: 0 })
      .success,
    false
  );
});
test('archived adjustment cannot be recreated by retry; preview cannot write while server locked', () => {
  const h = adjustmentHarness();
  const { request } = adjustmentRequest(h, 100000);
  const saved = h.post(request);
  h.post({
    action: 'delete',
    sheet: 'Expense Tracker',
    id: saved.id,
    expectedRevision: saved.entry._revision,
  });
  assert.equal(h.post(request).success, false);
  h.context.disableWrites();
  const next = adjustmentRequest(h, 200000);
  assert.equal(next.preview.success, true);
  assert.equal(h.post(next.request).success, false);
});
