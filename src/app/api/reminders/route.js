import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, Reminder } from '@/lib/models';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const reminder = parseOrThrow(Reminder, body);
  return NextResponse.json(await tryOp('addReminder', { reminder }));
});