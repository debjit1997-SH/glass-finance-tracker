import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
export const COOKIE = 'aura_session';
export function equal(a, b) {
  return timingSafeEqual(
    createHash('sha256').update(String(a)).digest(),
    createHash('sha256').update(String(b)).digest()
  );
}
export function configReady() {
  return Boolean(
    process.env.APP_PASSWORD?.length >= 12 &&
    process.env.SESSION_SECRET?.length >= 32
  );
}
export function signSession(now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      expires: now + 7 * 86400000,
      nonce: randomBytes(18).toString('hex'),
    })
  ).toString('base64url');
  const signature = createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}
export function validSession(req, now = Date.now()) {
  if (!configReady()) return false;
  try {
    const cookies = String(req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim());
    const token =
      cookies
        .find((x) => x.startsWith(COOKIE + '='))
        ?.slice(COOKIE.length + 1) || '';
    const [payload, signature, ...extra] = token.split('.');
    if (extra.length || !payload || !signature) return false;
    const expected = createHmac('sha256', process.env.SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    if (!equal(signature, expected)) return false;
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return (
      Number.isFinite(body.expires) &&
      body.expires > now &&
      body.expires <= now + 7 * 86400000
    );
  } catch {
    return false;
  }
}
export function sameOrigin(req) {
  try {
    return new URL(req.headers.origin).host === req.headers.host;
  } catch {
    return false;
  }
}
export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 250000) throw new Error('Request too large');
  }
  return JSON.parse(text || '{}');
}
export function sessionCookie(req, token, maxAge) {
  const secure =
    process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
