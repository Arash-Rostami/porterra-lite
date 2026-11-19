import { randomBytes } from 'node:crypto';
import { createSession } from '@/lib/auth.js';
import { ssoOrigins } from '@/lib/crypto.js';
import { findUsersByNormalizedEmail, getUserById, updateUserLastLogin } from '@/lib/queries.js';
import { rowToUser } from '@/lib/mappers.js';
import { claimJti, pickSingle, safeNext, verifySsoToken } from '@/lib/ssoToken.js';

export const runtime = 'nodejs';

const denied = (reason) => {
  console.warn('sso receive denied', reason);
  const status = reason === 'rate' ? 429 : 403;
  const html = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PorterrA-lite</title></head><body style="font-family:inherit;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><p>شما در این سامانه حسابی ندارید. برای دسترسی با مدیر تماس بگیرید و بخواهید ایمیل شما را در این سامانه ثبت کند.</p></body></html>';
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};

const hits = new Map();

const limited = (ip) => {
  const now = Date.now();
  for (const [key, hit] of hits) if (hit.reset < now) hits.delete(key);
  if (hits.size > 5000) hits.clear();
  const hit = hits.get(ip) ?? { count: 0, reset: now + 60_000 };
  hit.count += 1;
  hits.set(ip, hit);
  return hit.count > 20;
};

const codes = new Map();

const clientIp = (request) => request.headers.get('x-forwarded-for')?.split(',').at(-1).trim() || 'unknown';

export async function GET(request) {
  try {
    if (limited(`GET:${clientIp(request)}`)) return denied('rate');
    const now = Date.now();
    for (const [key, hit] of codes) if (hit.exp < now) codes.delete(key);
    const code = new URL(request.url).searchParams.get('c') ?? '';
    const hit = codes.get(code);
    codes.delete(code);
    if (!hit) return new Response(null, { status: 303, headers: { Location: '/dashboard', 'cache-control': 'no-store' } });
    const row = await getUserById(hit.id);
    if (!row || !row.active) return denied('inactive');
    const user = rowToUser(row);
    await updateUserLastLogin(user.id, now);
    await createSession(user);
    return new Response(null, { status: 303, headers: { Location: hit.next, 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('sso receive failed', err);
    return denied('error');
  }
}

export async function POST(request) {
  try {
    if (limited(`POST:${clientIp(request)}`)) return denied('rate');
    const issuer = process.env.SSO_TENANT;
    const audience = process.env.SSO_AUDIENCE;
    const origins = ssoOrigins();
    const keys = (process.env.SSO_PUBLIC_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean);
    if (!issuer || !audience || !origins.length || !keys.length) return denied('config');
    if (!origins.includes(request.headers.get('origin'))) return denied('origin');

    const form = await request.formData();
    const assertion = form.get('assertion');
    const next = form.get('next');
    if (typeof assertion !== 'string' || (next !== null && typeof next !== 'string')) return denied('input');

    const claims = verifySsoToken(assertion, keys, issuer, audience);
    if (!claims) return denied('token');
    if (!claimJti(claims.jti)) return denied('replay');

    const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
    const row = pickSingle(await findUsersByNormalizedEmail(email));
    if (!row) return denied('user');
    if (!row.active) return denied('inactive');

    const code = randomBytes(24).toString('base64url');
    codes.set(code, { id: row.id, next: safeNext(next), exp: Date.now() + 30_000 });
    return new Response(null, { status: 303, headers: { Location: `/sso/receive?c=${code}`, 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('sso receive failed', err);
    return denied('error');
  }
}
