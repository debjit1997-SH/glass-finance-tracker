const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  let externalWrites = 0;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const records = {
    Accounts: [
      {
        id: 'preview-bank',
        Name: 'Everyday bank',
        Type: 'bank',
        OpeningBalance: 45000,
      },
    ],
    'Income Tracker': [
      {
        id: 'preview-income',
        Date: '2026-11-01',
        Source: 'Monthly salary',
        ExpectedAmount: 60000,
        ActualAmount: 60000,
        ActualDate: '2026-11-01',
        Account: 'preview-bank',
        Status: 'Received',
      },
    ],
    'Expense Tracker': [
      {
        id: 'preview-expense',
        Date: '2026-11-10',
        Name: 'Groceries',
        Category: 'Groceries',
        ExpectedAmount: 3500,
        ActualAmount: 3500,
        ActualDate: '2026-11-10',
        Account: 'preview-bank',
        Status: 'Paid',
      },
    ],
    'EMI Tracker': [
      {
        id: 'preview-loan',
        LoanName: 'Home loan',
        Lender: 'Example bank',
        MonthlyAmount: 12000,
        OutstandingPrincipal: 450000,
        InterestRate: 8,
        DueDate: '2026-01-05',
        StartDate: '2026-01-05',
        Account: 'preview-bank',
        Status: 'Pending',
      },
    ],
    'Credit Card Tracker': [
      {
        id: 'cc-preview',
        CardName: 'Everyday card',
        CreditLimit: 100000,
        StatementDate: 17,
        PaymentDueDate: 7,
      },
      {
        id: 'ccb-preview',
        CardName: 'cc-preview',
        BillingMonth: '2026-11',
        StatementDate: '2026-11-17',
        BillAmount: 12000,
        AmountPaid: 0,
        PaymentDueDate: '2026-12-07',
        Status: 'Pending',
      },
    ],
    'Savings Goals': [
      {
        id: 'preview-goal',
        GoalName: 'Emergency fund',
        TargetAmount: 200000,
        CurrentSaved: 75000,
        TargetDate: '2027-12-01',
      },
    ],
  };
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth')
      return route.fulfill({ json: { authenticated: true } });
    if (url.pathname === '/api/sheets') {
      if (route.request().method() !== 'GET') {
        externalWrites++;
        return route.abort();
      }
      return route.fulfill({
        json: records[url.searchParams.get('sheet')] || [],
      });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      'gas_cache_settings',
      JSON.stringify([{ key: 'activeMonth', value: '2026-11' }])
    )
  );
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');
  await page.getByText('Up to date', { exact: true }).waitFor();
  fs.mkdirSync('artifacts/ui', { recursive: true });
  await page.screenshot({
    path: 'artifacts/ui/dashboard-light.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Credit Cards', exact: true }).click();
  await page.getByText('Everyday card', { exact: true }).first().waitFor();
  await page.screenshot({
    path: 'artifacts/ui/cards-light.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({
    path: 'artifacts/ui/cards-dark.png',
    fullPage: true,
  });
  await page.reload();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark')
    throw new Error('theme not persisted');
  await page.getByRole('button', { name: 'EMI & Payoff', exact: true }).click();
  await page.getByRole('button', { name: 'Foreclose', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm loan closure', exact: true })
    .waitFor();
  await page.screenshot({
    path: 'artifacts/ui/foreclosure-dark.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Recurring & templates', exact: true })
    .click();
  await page.getByText('Income & expense templates', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await page.getByText('Copy as new expense', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Browse All Pages' }).click();
  await page.getByRole('button', { name: 'Credit Cards', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.screenshot({
    path: 'artifacts/ui/cards-mobile.png',
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  console.log(
    JSON.stringify({
      externalWrites,
      pageErrors: errors,
      mobileOverflow: overflow,
      screenshots: 'artifacts/ui',
    })
  );
  if (externalWrites || errors.length || overflow)
    throw new Error('UI smoke checks failed');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
