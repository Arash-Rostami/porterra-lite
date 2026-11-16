import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { getActivityById } from '@/lib/queries.js';
import { parseOrThrow, ActivityUpdate, Id } from '@/lib/models.js';

function refuse(message) {
  return Object.assign(new Error('VALIDATION: ' + message), { code: 'VALIDATION' });
}

async function ownedComment(user, id) {
  const existing = await getActivityById(id);
  if (!existing) throw refuse('نظر پیدا نشد');
  if (existing.type !== 'comment') throw refuse('فقط نظرها قابل ویرایش یا حذف هستند');
  if (!isElevated(user) && existing.author !== (user.displayName || user.username)) throw refuse('فقط نویسنده یا مدیر می‌تواند این نظر را تغییر دهد');
}

export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(ActivityUpdate, body.patch);
  await ownedComment(user, id);
  return NextResponse.json(await tryOp('updateActivity', { id, patch }));
});

export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  await ownedComment(user, id);
  return NextResponse.json(await tryOp('deleteActivity', { id }));
});
