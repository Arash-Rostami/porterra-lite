import { NextRequest, NextResponse } from 'next/server';

export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const e = err as { message?: string; code?: string };
      const msg = e && e.message ? e.message : 'error';
      if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      if (e && (e.code === 'VALIDATION' || msg.startsWith('VALIDATION'))) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}
