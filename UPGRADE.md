# AuraFinance v2 — integration package

Base source: `e44d8eafcbded89f710fe50e71c5523a17ec6158`. The supplied Apps Script was used to build the replacement in `apps-script/Code.gs`.

## What has and has not happened

Frontend, Apps Script replacement, Vercel API relay, login, migration procedure and isolated tests are prepared. The live site's HTML still referenced the original frontend bundle when inspected. No Google Sheet read/write, backup, migration, GitHub push or Vercel deployment was performed here. Your existing deployed application remains unchanged.

Use `SETUP_BN.md` for the step-by-step setup. Do not enable the production frontend before its new backend and environment variables are ready.

## Architecture

Browser → same-origin `/api/auth` and `/api/sheets` → server-only secret → new Apps Script deployment → existing Google Sheet.

The browser no longer contacts Apps Script directly. APP_PASSWORD and SESSION_SECRET protect the API session. GAS_SHARED_SECRET is sent only by the server and matches AURA_API_SECRET in Apps Script properties. The login has a signed, HttpOnly, SameSite cookie (Secure on Vercel) with a seven-day lifetime. Password changes alone do not revoke existing cookies; rotate SESSION_SECRET to revoke them. Login throttling is best-effort per server instance, not a durable distributed rate limiter.

## Data preservation

- `previewUpgrade()` only reports the plan.
- `backupAndUpgrade()` checks the existing layout, makes a full spreadsheet copy, verifies original cell values and formula sources, and appends only missing headers/tabs. It does not reorder existing headers, regenerate IDs, seed data or remove rows. It verifies the original rectangle of each existing tab again after changes. Writes remain disabled.
- Duplicate IDs, duplicate/blank headers and missing ID columns in existing data require manual review. The script stops rather than silently repairing them.
- `enableWritesAfterReview()` requires the completed schema, accessible backup, matching source Sheet ID and secret before permitting writes.
- API create preserves the caller's stable ID. Repeated IDs do not append a second row. Template create-only requests never overwrite existing entries.
- Updates check a row revision under a script lock. A stale client must refresh. Formula cells reject conflicting edits; unrelated columns and existing formulas retain their values/sources.
- Delete archives the row by setting `_DeletedAt`. Existing values and IDs remain in the Sheet; normal reads exclude archived rows. To restore an intentionally archived record, the owner can clear only its `_DeletedAt` cell in Sheets. There is no public reset or bulk delete endpoint.
- Locks coordinate this script's executions. Direct manual Sheet edits and a separate old script are not covered by that lock. During migration/cutover, pause all app/manual edits. After successful rollout, retire the old unauthenticated deployment.
- Row-level writes are batched, but multi-record workflows are not spreadsheet-wide transactions. A timeout can leave the result uncertain: refresh and inspect before retrying. Do not claim atomicity across multiple rows or scripts.

## Features

Soft light/dark frosted-glass themes; simple card statements and cumulative partial payments; foreclosure/part-payment history; quick entry; search/date/account filters; copy-as-new entries; monthly income/expense templates; stricter save/refresh handling; quarter/month-end dates; actual-zero amounts; supported-field persistence and page code splitting.

Card and loan event payments are tracking-only and do not generate bank transfers/debits. Existing bank movements are preserved. Reference an existing transaction or enter its cash movement separately. Card totals now use recorded unpaid bills, not old linked-account/unbilled calculations. No old incorrect card records have been relinked or deleted.

Templates use “Prepare this month” to create pending entries in a batch; this is not an unattended scheduler. Existing subscriptions are not silently converted to templates. Existing card/bill rows retain their original shared tab; legacy matches still require owner review.

No bank-PDF import, paid AI/API or database replacement is included. Existing Google/Vercel service limits still apply.

## Added columns and tables

All old schema names remain. New table: `EMI Payments`.

| Table | New/preserved fields beyond the original schema |
| --- | --- |
| All supported tables | `_DeletedAt` (archival marker) |
| Accounts | color, accountNumberLast4, isArchived, createdAt |
| EMI Tracker | StartDate, TotalInstallments, Lifecycle, ClosureDate, SettlementAmount, LoanEvents |
| EMI Payments | id, LoanId, Month, DueDate, Amount, Status, PaidDate, PaidAmount, Account |
| Credit Card Tracker | bank, accountId, color, PaymentHistory |
| Savings Goals | category, icon, color |
| Net Worth Snapshots | month, assetBreakdown, liabilityBreakdown |
| Recurring Bills | autoRenew, TemplateEnabled, EntryKind |
| Tax Saver | financialYear, Notes |

`_revision` is returned by the API, calculated from row contents; it is not a spreadsheet column. Histories/breakdowns are JSON text. Existing row contents are not backfilled during setup.

## Local test environment

Use Node 24+, a separate checkout and a copied test Sheet. Copy `.env.example` to `.env.local`, then set values locally. Never commit `.env.local` or use VITE_ prefixes for server secrets.

```sh
npm ci
npm test
npm run dev:api
# In another terminal:
npm run dev
```

`npm run dev:api` starts the server API on 127.0.0.1:8787; Vite proxies `/api` to it. Use `VITE_ENABLE_UPGRADE_WRITES=false` first. Once the test backend is verified and enabled, set it to true and restart Vite. On Vercel, changing VITE_ variables requires a rebuild.

## Verification and limitations

Run `npm test` for the mocked service, authentication, proxy and Apps Script tests. No test contacts the real Sheet. `npm run build` checks the frontend. The Apps Script tests simulate the Sheets services; they cannot replace actual test-copy verification of Google authorization, locale/formats, deployment redirects, formula behavior or quotas.

Browser smoke test, when Chromium is available:

```sh
npx playwright install chromium
# Keep npm run dev running, then:
node tests/browser.cjs
```

This test intercepts API calls and supplies dummy data. Browser visual QA was blocked in this environment by the Chromium process-socket restriction. No actual live-Sheet or deployed API end-to-end test is claimed.

JSON export covers supported app records. It is not a full backup of arbitrary columns, formulas, custom tabs or archived rows. Use the full spreadsheet copy for rollback. The baseline ZIP contains code only, not financial data.

## Reference documentation checked

- https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet#copy(String)
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://developers.google.com/apps-script/guides/web
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/configuring-functions/duration
