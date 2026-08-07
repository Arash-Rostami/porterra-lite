import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, Activity } from '@/lib/models.js';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const activity = parseOrThrow(Activity, body);
  const op = activity.type === 'change' ? 'addChangeLog' : 'addComment';
  return NextResponse.json(await tryOp(op, { activity }));
});