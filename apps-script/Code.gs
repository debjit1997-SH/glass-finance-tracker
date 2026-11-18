/** AuraFinance v2. Run previewUpgrade() first. No migration runs from web requests. */
const SCHEMA = {
  Accounts: [
    'id',
    'Name',
    'Type',
    'OpeningBalance',
    'Notes',
    'color',
    'accountNumberLast4',
    'isArchived',
    'createdAt',
  ],
  'Income Tracker': [
    'id',
    'Date',
    'Source',
    'ExpectedAmount',
    'Account',
    'ActualAmount',
    'ActualDate',
    'Status',
    'Notes',
  ],
  'Expense Tracker': [
    'id',
    'Date',
    'Name',
    'Category',
    'ExpectedAmount',
    'Account',
    'ActualAmount',
    'ActualDate',
    'Status',
    'Notes',
  ],
  'EMI Tracker': [
    'id',
    'LoanName',
    'Lender',
    'MonthlyAmount',
    'OutstandingPrincipal',
    'InterestRate',
    'DueDate',
    'Account',
    'Status',
    'Notes',
    'StartDate',
    'TotalInstallments',
    'Lifecycle',
    'ClosureDate',
    'SettlementAmount',
    'LoanEvents',
  ],
  'EMI Payments': [
    'id',
    'LoanId',
    'Month',
    'DueDate',
    'Amount',
    'Status',
    'PaidDate',
    'PaidAmount',
    'Account',
  ],
  'Account Transfers': [
    'id',
    'Date',
    'FromAccount',
    'ToAccount',
    'Amount',
    'Reason',
    'Status',
    'Notes',
  ],
  'Credit Card Tracker': [
    'id',
    'CardName',
    'CreditLimit',
    'CurrentUnbilled',
    'BillingMonth',
    'StatementDate',
    'BillAmount',
    'AmountPaid',
    'PaymentDueDate',
    'PaymentDateActual',
    'Status',
    'Notes',
    'bank',
    'accountId',
    'color',
    'PaymentHistory',
  ],
  'Savings Goals': [
    'id',
    'GoalName',
    'TargetAmount',
    'TargetDate',
    'CurrentSaved',
    'Notes',
    'category',
    'icon',
    'color',
  ],
  'Net Worth Snapshots': [
    'id',
    'Date',
    'TotalAssets',
    'TotalLiabilities',
    'NetWorth',
    'month',
    'assetBreakdown',
    'liabilityBreakdown',
  ],
  'Recurring Bills': [
    'id',
    'Name',
    'Amount',
    'Frequency',
    'NextRenewalDate',
    'Category',
    'Account',
    'Notes',
    'autoRenew',
    'TemplateEnabled',
    'EntryKind',
  ],
  'Tax Saver': [
    'id',
    'Name',
    'Section',
    'Amount',
    'Date',
    'financialYear',
    'Notes',
  ],
  'Budget vs Actual': ['id', 'Category', 'MonthlyBudget', 'Month'],
};
const AURA_VERSION = 2;
const DELETED = '_DeletedAt';

function spreadsheet_() {
  const id =
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = id
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss)
    throw new Error('Bind this script to the Sheet or set SPREADSHEET_ID.');
  return ss;
}
function headers_(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const nonempty = headers.filter((h) => h !== '');
  if (nonempty.some((h) => typeof h !== 'string' || h.trim() !== h))
    throw new Error('Header whitespace/type needs review: ' + sheet.getName());
  if (new Set(nonempty).size !== nonempty.length)
    throw new Error('Duplicate headers need review: ' + sheet.getName());
  if (headers.some((h) => h === ''))
    throw new Error('Blank header in used columns: ' + sheet.getName());
  return headers;
}
function required_(name) {
  return SCHEMA[name].concat([DELETED]);
}
function sourceCells_(sheet, rows, columns) {
  if (!rows || !columns) return [];
  const range = sheet.getRange(1, 1, rows, columns);
  const values = range.getValues(),
    formulas = range.getFormulas();
  return values.map((row, r) =>
    row.map((v, c) => (formulas[r][c] ? { formula: formulas[r][c] } : v))
  );
}
function hash_(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(value)
  )
    .map((b) => ('0' + ((b + 256) % 256).toString(16)).slice(-2))
    .join('');
}
function snapshots_(ss) {
  return ss.getSheets().map((s) => ({
    name: s.getName(),
    rows: s.getLastRow(),
    columns: s.getLastColumn(),
    hash: hash_(sourceCells_(s, s.getLastRow(), s.getLastColumn())),
  }));
}
function verifySnapshots_(ss, before) {
  before.forEach((item) => {
    const sheet = ss.getSheetByName(item.name);
    if (
      !sheet ||
      sheet.getLastRow() < item.rows ||
      sheet.getLastColumn() < item.columns ||
      hash_(sourceCells_(sheet, item.rows, item.columns)) !== item.hash
    )
      throw new Error(
        'Original cells failed verification: ' +
          item.name +
          '. Writes remain disabled; restore/review the backup.'
      );
  });
}
function inspectUpgrade_(ss) {
  return Object.keys(SCHEMA).map((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet)
      return {
        sheet: name,
        create: true,
        addColumns: required_(name),
        rows: 0,
      };
    const headers = headers_(sheet);
    if (sheet.getLastRow() > 1 && headers.indexOf('id') < 0)
      throw new Error(
        'Existing table has no id column: ' +
          name +
          '. Review manually; no IDs will be invented.'
      );
    if (headers.indexOf('id') >= 0 && sheet.getLastRow() > 1) {
      const ids = sheet
        .getRange(2, headers.indexOf('id') + 1, sheet.getLastRow() - 1, 1)
        .getValues()
        .flat()
        .filter((v) => v !== '')
        .map(String);
      if (new Set(ids).size !== ids.length)
        throw new Error('Duplicate IDs need review: ' + name);
    }
    return {
      sheet: name,
      create: false,
      addColumns: required_(name).filter((h) => headers.indexOf(h) < 0),
      rows: Math.max(0, sheet.getLastRow() - 1),
    };
  });
}
function previewUpgrade() {
  const plan = inspectUpgrade_(spreadsheet_());
  console.log(JSON.stringify(plan, null, 2));
  return plan;
}
function setupSheets() {
  return backupAndUpgrade();
}
function backupAndUpgrade() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const props = PropertiesService.getScriptProperties();
  try {
    const ss = spreadsheet_(),
      plan = inspectUpgrade_(ss);
    if (
      !plan.some((p) => p.create || p.addColumns.length) &&
      props.getProperty('AURA_SCHEMA_VERSION') === '2' &&
      props.getProperty('AURA_BACKUP_SOURCE') === ss.getId()
    ) {
      const result = {
        success: true,
        alreadyUpgraded: true,
        backupId: props.getProperty('AURA_BACKUP_ID'),
      };
      console.log(JSON.stringify(result));
      return result;
    }
    props.setProperty('AURA_WRITES_ENABLED', 'false');
    const before = snapshots_(ss);
    const backup = ss.copy(
      ss.getName() +
        ' — before AuraFinance v2 — ' +
        Utilities.formatDate(
          new Date(),
          ss.getSpreadsheetTimeZone(),
          'yyyy-MM-dd HH-mm-ss'
        )
    );
    verifySnapshots_(backup, before);
    props.setProperty('AURA_BACKUP_ID', backup.getId());
    props.setProperty('AURA_BACKUP_SOURCE', ss.getId());
    props.setProperty('AURA_BACKUP_AT', new Date().toISOString());
    // No existing header, row, value, ID, formula, custom tab, or column is replaced.
    plan.forEach((item) => {
      const sheet = ss.getSheetByName(item.sheet) || ss.insertSheet(item.sheet);
      if (item.addColumns.length)
        sheet
          .getRange(1, sheet.getLastColumn() + 1, 1, item.addColumns.length)
          .setValues([item.addColumns]);
    });
    SpreadsheetApp.flush();
    verifySnapshots_(ss, before);
    props.setProperty('AURA_SCHEMA_VERSION', String(AURA_VERSION));
    const result = {
      success: true,
      backupId: backup.getId(),
      backupUrl: backup.getUrl(),
      plan: plan,
      writesEnabled: false,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}
function enableWritesAfterReview() {
  const ss = spreadsheet_(),
    props = PropertiesService.getScriptProperties();
  if (
    !props.getProperty('AURA_API_SECRET') ||
    props.getProperty('AURA_API_SECRET').length < 32
  )
    throw new Error(
      'Set a random AURA_API_SECRET of at least 32 characters in Script Properties.'
    );
  if (
    props.getProperty('AURA_SCHEMA_VERSION') !== '2' ||
    !props.getProperty('AURA_BACKUP_ID') ||
    props.getProperty('AURA_BACKUP_SOURCE') !== ss.getId()
  )
    throw new Error('Verified backup/upgrade is required first.');
  const plan = inspectUpgrade_(ss);
  if (plan.some((p) => p.create || p.addColumns.length))
    throw new Error('Schema is incomplete.');
  SpreadsheetApp.openById(props.getProperty('AURA_BACKUP_ID')); // Backup must still be accessible.
  props.setProperty('AURA_WRITES_ENABLED', 'true');
  console.log('Writes enabled for ' + ss.getId() + '.');
}
function disableWrites() {
  PropertiesService.getScriptProperties().setProperty(
    'AURA_WRITES_ENABLED',
    'false'
  );
}
function authorized_(token) {
  const expected =
    PropertiesService.getScriptProperties().getProperty('AURA_API_SECRET') ||
    '';
  if (expected.length < 32 || typeof token !== 'string') return false;
  let diff = expected.length ^ token.length;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ (token.charCodeAt(i) || 0);
  return diff === 0;
}
function doGet() {
  return jsonResponse({
    success: false,
    code: 'AUTH_REQUIRED',
    error: 'Use the authenticated application API.',
  });
}
function rowObject_(ss, headers, values, formulas) {
  const obj = {};
  headers.forEach((h, c) => {
    let value = values[c];
    if (value instanceof Date)
      value = Utilities.formatDate(
        value,
        ss.getSpreadsheetTimeZone(),
        h === 'Month' || h === 'BillingMonth' || h === 'month'
          ? 'yyyy-MM'
          : 'yyyy-MM-dd'
      );
    obj[h] = value;
  });
  obj._revision = hash_(
    headers.map((h, c) => [
      h,
      formulas[c] ? { formula: formulas[c] } : values[c],
    ])
  );
  return obj;
}
function literal_(value) {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return "'" + value;
  return value === null || value === undefined ? '' : value;
}
function doPost(e) {
  let lock;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!authorized_(body.token))
      return jsonResponse({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication failed.',
      });
    const ss = spreadsheet_(),
      props = PropertiesService.getScriptProperties();
    if (body.action === 'capabilities')
      return jsonResponse({
        success: true,
        version: AURA_VERSION,
        accountAdjustment: true,
        schemaReady: props.getProperty('AURA_SCHEMA_VERSION') === '2',
        writesEnabled: props.getProperty('AURA_WRITES_ENABLED') === 'true',
        backupCreated: Boolean(props.getProperty('AURA_BACKUP_ID')),
      });
    if (body.action === 'readMany') {
      if (!Array.isArray(body.sheets) || !body.sheets.length ||
          body.sheets.length > Object.keys(SCHEMA).length ||
          body.sheets.some(name => !Object.prototype.hasOwnProperty.call(SCHEMA, name)))
        throw new Error('Invalid table list.');
      lock = LockService.getScriptLock();
      lock.waitLock(15000);
      const data = {};
      for (const name of [...new Set(body.sheets)]) {
        const sheet = ss.getSheetByName(name);
        if (!sheet) throw new Error('Sheet not found: ' + name);
        const range = sheet.getDataRange();
        const values = range.getValues(), formulas = range.getFormulas();
        const headers = values[0];
        if (!headers.includes('id')) throw new Error('Missing id column: ' + name);
        data[name] = values.slice(1)
          .map((v, i) => rowObject_(ss, headers, v, formulas[i + 1]))
          .filter(r => r.id !== '' && !r[DELETED]);
      }
      return jsonResponse({ success: true, data });
    }
    if (['previewAdjustment', 'adjustBalance'].includes(body.action)) {
      lock = LockService.getScriptLock();
      lock.waitLock(15000);
      return jsonResponse(accountAdjustment_(ss, body));
    }
    if (!Object.prototype.hasOwnProperty.call(SCHEMA, body.sheet))
      throw new Error('Unknown table.');
    lock = LockService.getScriptLock();
    lock.waitLock(15000);
    const sheet = ss.getSheetByName(body.sheet);
    if (!sheet) throw new Error('Sheet not found: ' + body.sheet);
    const headers = headers_(sheet),
      idCol = headers.indexOf('id'),
      deletedCol = headers.indexOf(DELETED);
    if (idCol < 0) throw new Error('Missing id column.');
    const range = sheet.getDataRange(),
      values = range.getValues(),
      formulas = range.getFormulas();
    if (body.action === 'read')
      return jsonResponse(
        values
          .slice(1)
          .map((v, i) => rowObject_(ss, headers, v, formulas[i + 1]))
          .filter((r) => r.id !== '' && !r[DELETED])
      );
    if (
      props.getProperty('AURA_WRITES_ENABLED') !== 'true' ||
      props.getProperty('AURA_SCHEMA_VERSION') !== '2' ||
      props.getProperty('AURA_BACKUP_SOURCE') !== ss.getId()
    )
      throw new Error(
        'Writes are disabled. Complete backup and schema verification first.'
      );
    if (required_(body.sheet).some((h) => headers.indexOf(h) < 0))
      throw new Error('Schema needs upgrade.');
    if (!['create', 'update', 'delete'].includes(body.action))
      throw new Error('Unknown action.');
    const id = String(body.id || (body.row && body.row.id) || '');
    if (!id || id.length > 180 || /[\r\n]/.test(id))
      throw new Error('A stable record ID is required.');
    const matches = [];
    for (let r = 1; r < values.length; r++)
      if (String(values[r][idCol]) === id) matches.push(r);
    if (matches.length > 1)
      throw new Error('Duplicate record IDs need manual review.');
    const index = matches.length ? matches[0] : -1;
    const row = body.row || {};
    if (row.id !== undefined && String(row.id) !== id)
      throw new Error('Changing a record ID is not permitted.');
    Object.keys(row).forEach((key) => {
      if (SCHEMA[body.sheet].indexOf(key) < 0)
        throw new Error('Unsupported field: ' + key);
    });
    if (index >= 0 && body.action === 'create') {
      if (values[index][deletedCol])
        throw new Error('This ID belongs to an archived record.');
      const old = rowObject_(ss, headers, values[index], formulas[index]);
      if (
        !body.createOnly &&
        Object.keys(row).some(
          (k) => String(old[k] ?? '') !== String(row[k] ?? '')
        )
      )
        throw new Error(
          'This ID already exists with different data. Refresh before retrying.'
        );
      return jsonResponse({
        success: true,
        id: id,
        duplicate: true,
        row: old,
        revision: old._revision,
      });
    }
    if (index < 0 && body.action !== 'create')
      throw new Error('Row not found. Refresh before retrying.');
    if (index >= 0) {
      const current = rowObject_(ss, headers, values[index], formulas[index]);
      if (body.action === 'delete' && current[DELETED])
        return jsonResponse({
          success: true,
          id: id,
          archived: true,
          revision: current._revision,
        });
      if (current[DELETED]) throw new Error('This record is archived.');
      if (!body.expectedRevision || body.expectedRevision !== current._revision)
        return jsonResponse({
          success: false,
          code: 'CONFLICT',
          error:
            'This record changed after you loaded it. Refresh before editing again.',
        });
    }
    const target = index < 0 ? headers.map(() => '') : values[index].slice();
    const oldFormulas =
      index < 0 ? headers.map(() => '') : formulas[index].slice();
    if (body.action === 'delete') target[deletedCol] = new Date().toISOString();
    else {
      Object.keys(row).forEach((key) => {
        const c = headers.indexOf(key),
          value = row[key];
        if (value !== null && typeof value === 'object')
          throw new Error('Nested field must be JSON text: ' + key);
        if (typeof value === 'number' && !Number.isFinite(value))
          throw new Error('Invalid numeric value.');
        // Check everything before any write. Formula cells are never edited by this API.
        if (oldFormulas[c]) {
          const current = rowObject_(ss, headers, values[index], oldFormulas)[
            key
          ];
          if (String(current) !== String(value))
            throw new Error('Formula cell cannot be edited: ' + key);
        } else if (
          index < 0 ||
          String(
            rowObject_(ss, headers, values[index], oldFormulas)[key] ?? ''
          ) !== String(value ?? '')
        )
          target[c] = value;
      });
      target[idCol] = id;
    }
    const output = target.map((v, c) => oldFormulas[c] || literal_(v));
    const rowNumber =
      index < 0 ? Math.max(2, sheet.getLastRow() + 1) : index + 1;
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([output]);
    SpreadsheetApp.flush();
    const savedRange = sheet.getRange(rowNumber, 1, 1, headers.length);
    const saved = rowObject_(
      ss,
      headers,
      savedRange.getValues()[0],
      savedRange.getFormulas()[0]
    );
    return jsonResponse({
      success: true,
      id: id,
      revision: saved._revision,
      row: saved,
      archived: body.action === 'delete',
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      code: 'REQUEST_FAILED',
      error: String(error.message || error),
    });
  } finally {
    if (lock) lock.releaseLock();
  }
}
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Reconcile a liquid account by adding ONE balancing transaction. Never edits history.
function adjustmentLedger_(ss, accountId) {
  const tables = {};
  [
    'Accounts',
    'Income Tracker',
    'Expense Tracker',
    'Account Transfers',
    'EMI Tracker',
    'EMI Payments',
  ].forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet)
      throw new Error('Cannot verify balance; missing sheet: ' + name);
    const headers = headers_(sheet);
    if (required_(name).some((h) => headers.indexOf(h) < 0))
      throw new Error('Incomplete schema: ' + name);
    const range = sheet.getDataRange(),
      values = range.getValues(),
      formulas = range.getFormulas();
    tables[name] = values
      .slice(1)
      .map((v, i) => rowObject_(ss, headers, v, formulas[i + 1]))
      .filter((r) => r.id !== '' && !r[DELETED]);
    const ids = tables[name].map((r) => String(r.id));
    if (new Set(ids).size !== ids.length)
      throw new Error('Duplicate IDs need review: ' + name);
  });
  const account = tables.Accounts.find((r) => String(r.id) === accountId);
  if (!account || account.isArchived === true || account.isArchived === 'true')
    throw new Error('Choose an active account.');
  if (!['bank', 'cash', 'wallet'].includes(String(account.Type).toLowerCase()))
    throw new Error('Adjustment supports bank, cash and wallet accounts only.');
  const number = (value) => {
    const n =
      value === '' || value === null || value === undefined ? 0 : Number(value);
    if (!Number.isFinite(n))
      throw new Error(
        'Invalid amount in account history. Correct it before adjusting.'
      );
    return n;
  };
  let balance = number(account.OpeningBalance);
  const relevant = [account];
  const same = (r) => String(r.Account) === accountId;
  tables['Income Tracker'].filter(same).forEach((r) => {
    relevant.push(r);
    if (r.Status === 'Received') balance += number(r.ActualAmount);
  });
  tables['Expense Tracker'].filter(same).forEach((r) => {
    relevant.push(r);
    if (r.Status === 'Paid') balance -= number(r.ActualAmount);
  });
  tables['Account Transfers'].forEach((r) => {
    if (
      String(r.FromAccount) !== accountId &&
      String(r.ToAccount) !== accountId
    )
      return;
    relevant.push(r);
    if (r.Status === 'Completed') {
      if (String(r.FromAccount) === accountId) balance -= number(r.Amount);
      if (String(r.ToAccount) === accountId) balance += number(r.Amount);
    }
  });
  const payments = tables['EMI Payments'];
  payments.filter(same).forEach((r) => {
    relevant.push(r);
    if (r.Status === 'Paid') balance -= number(r.PaidAmount);
  });
  tables['EMI Tracker'].filter(same).forEach((r) => {
    relevant.push(r);
    const month = String(r.StartDate || r.DueDate || '').slice(0, 7);
    const matching = payments.filter(
      (p) =>
        String(p.LoanId) === String(r.id) &&
        String(p.Month).slice(0, 7) === month
    );
    relevant.push(...matching);
    if (r.Status === 'Paid' && matching.length === 0)
      balance -= number(r.MonthlyAmount);
  });
  const cents = Math.round((balance + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents))
    throw new Error('Balance exceeds the supported amount.');
  return {
    account,
    tables,
    cents,
    revision: hash_(
      relevant
        .map((r) => [String(r.id), r._revision])
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    ),
  };
}
function accountAdjustment_(ss, body) {
  const accountId = String(body.accountId || '');
  // Require exact paise from the client: prevents NaN, blank or float rounding surprises.
  const target = body.targetCents;
  if (
    typeof target !== 'number' ||
    !Number.isSafeInteger(target) ||
    Math.abs(target) > 100000000000000
  )
    throw new Error('Enter a valid balance with at most two decimal places.');
  const ledger = adjustmentLedger_(ss, accountId);
  const delta = target - ledger.cents;
  if (!Number.isSafeInteger(delta))
    throw new Error("Adjustment exceeds the supported amount.");
  const today = Utilities.formatDate(
    new Date(),
    ss.getSpreadsheetTimeZone(),
    'yyyy-MM-dd'
  );
  const preview = {
    success: true,
    accountId,
    accountName: ledger.account.Name,
    currentBalance: ledger.cents / 100,
    targetBalance: target / 100,
    delta: delta / 100,
    kind: delta < 0 ? 'Expense' : delta > 0 ? 'Income' : 'None',
    date: today,
    revision: ledger.revision,
  };
  if (body.action === 'previewAdjustment') return preview;
  const props = PropertiesService.getScriptProperties();
  if (
    props.getProperty('AURA_WRITES_ENABLED') !== 'true' ||
    props.getProperty('AURA_SCHEMA_VERSION') !== '2' ||
    props.getProperty('AURA_BACKUP_SOURCE') !== ss.getId()
  )
    throw new Error(
      'Writes are disabled. Verify the backup and enable writes first.'
    );
  const id = String(body.id || '');
  if (
    !/^adj_[0-9a-f-]{36}_-?\d+$/.test(id) ||
    Number(id.slice(id.lastIndexOf('_') + 1)) !== target
  )
    throw new Error('Invalid adjustment request ID. Create a new preview.');
  const prior = [
    ...ledger.tables['Income Tracker'],
    ...ledger.tables['Expense Tracker'],
  ].filter((r) => String(r.id) === id);
  if (prior.length) {
    if (
      prior.length !== 1 ||
      String(prior[0].Account) !== accountId ||
      (prior[0].Name || prior[0].Source) !== 'Account adjustment'
    )
      throw new Error('Adjustment ID conflict.');
    return {
      ...preview,
      duplicate: true,
      id,
      recordedTarget: target / 100,
      entry: prior[0],
    };
  }
  // Archived entries cannot be recreated by an uncertain network retry.
  for (const name of ['Income Tracker', 'Expense Tracker']) {
    const sheet = ss.getSheetByName(name),
      headers = headers_(sheet),
      rows = sheet.getDataRange().getValues();
    if (rows.slice(1).some((r) => String(r[headers.indexOf('id')]) === id))
      throw new Error(
        'This adjustment was archived. Refresh and preview again.'
      );
  }
  if (!body.expectedRevision || body.expectedRevision !== ledger.revision)
    return {
      success: false,
      code: 'CONFLICT',
      error:
        'Account history changed since your preview. Refresh the preview before confirming.',
    };
  if (!delta) return { ...preview, noChange: true };
  const sheetName = delta < 0 ? 'Expense Tracker' : 'Income Tracker';
  const sheet = ss.getSheetByName(sheetName),
    headers = headers_(sheet);
  const entry = {
    id,
    Date: today,
    ExpectedAmount: Math.abs(delta) / 100,
    ActualAmount: Math.abs(delta) / 100,
    Account: accountId,
    ActualDate: today,
    Status: delta < 0 ? 'Paid' : 'Received',
    Notes: 'check bank statement for details',
  };
  if (delta < 0) {
    entry.Name = 'Account adjustment';
    entry.Category = 'Account adjustment';
  } else entry.Source = 'Account adjustment';
  const rowNumber = Math.max(2, sheet.getLastRow() + 1);
  sheet
    .getRange(rowNumber, 1, 1, headers.length)
    .setValues([headers.map((h) => literal_(entry[h]))]);
  SpreadsheetApp.flush();
  const savedRange = sheet.getRange(rowNumber, 1, 1, headers.length);
  const saved = rowObject_(
    ss,
    headers,
    savedRange.getValues()[0],
    savedRange.getFormulas()[0]
  );
  return {
    ...preview,
    id,
    recordedTarget: target / 100,
    currentBalance: target / 100,
    entry: saved,
  };
}
