import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkReminderScope } from '@/lib/serverOps.js';
import { getReminderById } from '@/lib/queries.js';
import { parseOrThrow, ReminderUpdate, Id } from '@/lib/models.js';

export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(ReminderUpdate, body.patch);
  await checkReminderScope(user, await getReminderById(id));
  if (patch.forAgent !== undefined) await checkReminderScope(user, { forAgent: patch.forAgent });
  return NextResponse.json(await tryOp('updateReminder', { id, patch }));
});

export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  await checkReminderScope(user, await getReminderById(id));
  return NextResponse.json(await tryOp('deleteReminder', { id }));
});
