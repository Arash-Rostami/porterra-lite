import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkReminderScope } from '@/lib/serverOps.js';
import { getReminderById } from '@/lib/queries.js';
import { isConnError } from '@/lib/db.js';
import { parseOrThrow, Reminder } from '@/lib/models.js';

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const reminder = parseOrThrow(Reminder, body);
  await checkReminderScope(user, reminder, true);
  try {
    if (await getReminderById(reminder.id)) throw Object.assign(new Error('VALIDATION: شناسه تکراری است'), { code: 'VALIDATION' });
  } catch (err) {
    if (!isConnError(err)) throw err;
  }
  return NextResponse.json(await tryOp('addReminder', { reminder }));
});
