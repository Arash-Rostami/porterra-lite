import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkReminderScope } from '@/lib/serverOps.js';
import { getReminderById } from '@/lib/queries.js';
import { parseOrThrow, Id } from '@/lib/models.js';

export const POST = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  await checkReminderScope(user, await getReminderById(id));
  return NextResponse.json(await tryOp('markReminderDone', { id }));
});
