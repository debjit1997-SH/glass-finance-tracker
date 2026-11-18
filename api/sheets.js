import {
  validSession,
  sameOrigin,
  readBody,
  send,
} from '../server/finance-auth.js';
export default async function handler(req, res) {
  if (!validSession(req))
    return send(res, 401, { error: 'Sign in to access your records.' });
  if (!['GET', 'POST'].includes(req.method))
    return send(res, 405, { error: 'Method not allowed' });
  if (req.method === 'POST' && !sameOrigin(req))
    return send(res, 403, { error: 'Invalid request origin' });
  const endpoint = process.env.GAS_WEB_APP_URL,
    token = process.env.GAS_SHARED_SECRET;
  if (
    !endpoint ||
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint) ||
    !token ||
    token.length < 32
  )
    return send(res, 503, {
      error:
        'Server connection is not configured. Set GAS_WEB_APP_URL and GAS_SHARED_SECRET.',
    });
  try {
    const query = new URL(req.url, 'https://local').searchParams;
    const input =
      req.method === 'GET'
        ? {
            action:
              query.get('action') === 'capabilities' ? 'capabilities' : 'read',
            sheet: query.get('sheet'),
          }
        : await readBody(req);
    const allowed = [
      'read',
      'readMany',
      'capabilities',
      'create',
      'update',
      'delete',
      'previewAdjustment',
      'adjustBalance',
    ];
    if (!allowed.includes(input.action))
      return send(res, 400, { error: 'Unknown action' });
    if (
      ['create', 'update', 'delete', 'adjustBalance'].includes(input.action)
    ) {
      const check = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'capabilities', token }),
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      const capabilities = await check.json();
      if (
        !check.ok ||
        capabilities.version !== 2 ||
        !capabilities.schemaReady ||
        !capabilities.writesEnabled ||
        !capabilities.backupCreated ||
        (input.action === 'adjustBalance' && !capabilities.accountAdjustment)
      )
        return send(res, 409, {
          error: 'Verified v2 backend, backup and enabled writes are required.',
        });
    }
    const body = {
      action: input.action,
      sheet: input.sheet,
      sheets: input.sheets,
      row: input.row,
      id: input.id,
      expectedRevision: input.expectedRevision,
      createOnly: input.createOnly === true,
      token,
      accountId: input.accountId,
      targetCents: input.targetCents,
    };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      signal: AbortSignal.timeout(
        ['read', 'readMany'].includes(input.action) ? 45000 : 25000
      ),
    });
    if (!response.ok)
      return send(res, 502, {
        error:
          'Google Sheets service is unavailable. Refresh before retrying a save.',
      });
    const result = await response.json();
    if (!result || typeof result !== 'object')
      throw new Error('Invalid response');
    return send(
      res,
      result.code === 'AUTH_REQUIRED'
        ? 502
        : result.code === 'CONFLICT'
          ? 409
          : 200,
      result
    );
  } catch {
    return send(res, 502, {
      error:
        'The Sheet request could not be confirmed. Refresh and check the record before retrying.',
    });
  }
}
