import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { listNotificationsFor } from '@/lib/queries.js';
import Utils from '@/lib/utils.js';

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json({ notifications: await listNotificationsFor(Utils.recipientKey(user)) });
});
