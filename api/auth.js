import {
  configReady,
  equal,
  signSession,
  validSession,
  sameOrigin,
  send,
  readBody,
  sessionCookie,
} from '../server/finance-auth.js';
const attempts = new Map(); // Best-effort per-instance throttling; not a distributed rate limiter.
export default async function handler(req, res) {
  if (!configReady())
    return send(res, 503, {
      error:
        'Set APP_PASSWORD (12+ characters) and SESSION_SECRET (32+ random characters) on the server.',
    });
  if (req.method === 'GET')
    return send(res, 200, { authenticated: validSession(req) });
  if (req.method !== 'POST')
    return send(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req))
    return send(res, 403, { error: 'Invalid request origin' });
  try {
    const body = await readBody(req);
    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
      return send(res, 200, { success: true });
    }
    const ip = String(
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local'
    ).slice(0, 120);
    const now = Date.now();
    for (const [key, item] of attempts)
      if (now > item.until) attempts.delete(key);
    if (attempts.size > 10000) attempts.clear();
    const current = attempts.get(ip) || { count: 0, until: now + 15 * 60000 };
    if (current.count >= 8)
      return send(res, 429, {
        error: 'Too many attempts. Try again in 15 minutes.',
      });
    if (
      typeof body.password !== 'string' ||
      !equal(body.password, process.env.APP_PASSWORD)
    ) {
      current.count++;
      attempts.set(ip, current);
      return send(res, 401, { error: 'Incorrect password' });
    }
    attempts.delete(ip);
    res.setHeader('Set-Cookie', sessionCookie(req, signSession(), 7 * 86400));
    return send(res, 200, { authenticated: true });
  } catch {
    return send(res, 400, { error: 'Invalid login request' });
  }
}
