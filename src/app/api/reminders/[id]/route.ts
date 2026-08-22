import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, ReminderUpdate, Id } from '@/lib/models';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(ReminderUpdate, body.patch);
  return NextResponse.json(await tryOp('updateReminder', { id, patch }));
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  return NextResponse.json(await tryOp('deleteReminder', { id }));
});
