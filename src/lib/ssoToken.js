import { createPublicKey, verify } from 'node:crypto';

const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const REPLAY_TTL_MS = 150_000;
const seen = new Map();

const parse = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export function verifySsoToken(token, publicKeys, issuer, audience, skew = 30) {
  try {
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 3 || !issuer || !audience) return null;
    const [header, payload, signature] = parts;
    if (parse(header)?.alg !== 'EdDSA') return null;
    const data = Buffer.from(`${header}.${payload}`);
    const sig = Buffer.from(signature, 'base64url');
    const signed = publicKeys.some((b64) => {
      try {
        const raw = Buffer.from(b64, 'base64');
        if (raw.length !== 32) return false;
        const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
        return verify(null, data, key, sig);
      } catch {
        return false;
      }
    });
    if (!signed) return null;
    const c = parse(payload);
    const now = Math.floor(Date.now() / 1000);
    if (!c || c.iss !== issuer || c.aud !== audience) return null;
    if (!Number.isInteger(c.iat) || !Number.isInteger(c.exp)) return null;
    if (c.iat > now + skew || c.exp < now - skew || c.exp < c.iat || c.exp - c.iat > 60) return null;
    return c;
  } catch {
    return null;
  }
}

export function claimJti(jti, now = Date.now()) {
  if (typeof jti !== 'string' || !jti) return false;
  for (const [k, at] of seen) if (now - at > REPLAY_TTL_MS) seen.delete(k);
  if (seen.has(jti)) return false;
  seen.set(jti, now);
  return true;
}

export function safeNext(next, fallback = '/dashboard') {
  if (typeof next !== 'string' || !/^\/(?!\/)[^\\]*$/.test(next)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next) || next.includes('..') || /[\x00-\x1F\x7F]/.test(next)) return fallback;
  return next;
}

export function pickSingle(rows) {
  return rows.length === 1 ? rows[0] : null;
}
