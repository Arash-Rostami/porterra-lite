import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, readSessionToken, ssoOrigins } from './lib/crypto.js';

const framed = (res) => {
  res.headers.set('Content-Security-Policy', `frame-ancestors 'self' ${ssoOrigins().join(' ')}`.trim());
  return res;
};

export async function proxy(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = readSessionToken(token);
  const isLogin = pathname === '/login';

  if (!session && !isLogin && pathname !== '/sso/receive') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return framed(NextResponse.redirect(url));
  }
  if (session && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return framed(NextResponse.redirect(url));
  }
  return framed(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|img|fonts|api).*)'],
};
