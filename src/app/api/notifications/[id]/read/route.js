import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, Id } from '@/lib/models.js';
import Utils from '@/lib/utils.js';

export const POST = handle(async (req, ctx) => {
  const user = await requireUser();
  const forAgent = Utils.recipientKey(user);
  const { id: rawId } = await ctx.params;
  if (rawId === 'all') return NextResponse.json(await tryOp('markAllNotificationsRead', { forAgent }));
  const id = parseOrThrow(Id, rawId);
  return NextResponse.json(await tryOp('markNotificationRead', { id, forAgent }));
});
