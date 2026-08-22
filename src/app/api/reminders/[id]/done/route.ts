import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, Id } from '@/lib/models';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  return NextResponse.json(await tryOp('markReminderDone', { id }));
});
