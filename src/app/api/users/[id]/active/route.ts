import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireElevated } from '@/lib/auth';
import { parseOrThrow, Id } from '@/lib/models';
import { setUserActive } from '@/lib/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  await setUserActive(id, !!body.active);
  return NextResponse.json({ ok: true });
});
