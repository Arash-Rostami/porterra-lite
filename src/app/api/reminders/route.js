import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, Reminder } from '@/lib/models.js';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const reminder = parseOrThrow(Reminder, body);
  return NextResponse.json(await tryOp('addReminder', { reminder }));
});