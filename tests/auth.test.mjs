import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signSession,
  validSession,
  sameOrigin,
} from '../server/finance-auth.js';
import handler from '../api/sheets.js';
process.env.APP_PASSWORD = 'example-password-for-tests-only';
process.env.SESSION_SECRET = 'x'.repeat(40);
test('signed session accepts only untampered, unexpired cookies', () => {
  const now = Date.now(),
    token = signSession(now);
  assert(validSession({ headers: { cookie: 'aura_session=' + token } }, now));
  assert(
    !validSession({ headers: { cookie: 'aura_session=' + token + 'x' } }, now)
  );
  assert(
    !validSession(
      { headers: { cookie: 'aura_session=' + token } },
      now + 8 * 86400000
    )
  );
});
test('cross-origin mutations are rejected', () => {
  assert(
    sameOrigin({ headers: { origin: 'https://app.test', host: 'app.test' } })
  );
  assert(
    !sameOrigin({ headers: { origin: 'https://other.test', host: 'app.test' } })
  );
});
test('proxy does not contact Google without a session', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error('Network forbidden');
  };
  let body;
  const res = {
    setHeader() {},
    end(v) {
      body = JSON.parse(v);
    },
  };
  await handler(
    { headers: {}, method: 'GET', url: '/api/sheets?sheet=Accounts' },
    res
  );
  assert.equal(res.statusCode, 401);
  assert.equal(calls, 0);
  assert(body.error);
});

test('authenticated proxy uses server secret and never returns it', async () => {
  process.env.GAS_WEB_APP_URL =
    'https://script.google.com/macros/s/test-deployment/exec';
  process.env.GAS_SHARED_SECRET = 'server-only-secret-'.repeat(3);
  let forwarded;
  global.fetch = async (_, options) => {
    forwarded = JSON.parse(options.body);
    return { ok: true, json: async () => [{ id: 'x', Name: 'Example' }] };
  };
  let body;
  const res = {
    setHeader() {},
    end(value) {
      body = JSON.parse(value);
    },
  };
  await handler(
    {
      headers: { cookie: 'aura_session=' + signSession() },
      method: 'GET',
      url: '/api/sheets?sheet=Accounts',
    },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(forwarded.token, process.env.GAS_SHARED_SECRET);
  assert.equal(forwarded.action, 'read');
  assert(!JSON.stringify(body).includes(process.env.GAS_SHARED_SECRET));
});
test('old or unverified backend is rejected before mutation', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ error: 'Unknown action' }) };
  };
  const res = { setHeader() {}, end() {} };
  await handler(
    {
      headers: {
        cookie: 'aura_session=' + signSession(),
        origin: 'https://app.test',
        host: 'app.test',
      },
      method: 'POST',
      url: '/api/sheets',
      body: { action: 'create', sheet: 'Accounts', id: 'x', row: { id: 'x' } },
    },
    res
  );
  assert.equal(res.statusCode, 409);
  assert.equal(calls, 1);
});
