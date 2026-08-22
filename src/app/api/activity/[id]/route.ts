import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, ActivityUpdate, Id } from '@/lib/models';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(ActivityUpdate, body.patch);
  return NextResponse.json(await tryOp('updateActivity', { id, patch }));
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  return NextResponse.json(await tryOp('deleteActivity', { id }));
});
