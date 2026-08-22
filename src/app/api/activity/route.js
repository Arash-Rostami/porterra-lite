import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, Activity } from '@/lib/models';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const activity = parseOrThrow(Activity, body);
  const op = activity.type === 'change' ? 'addChangeLog' : 'addComment';
  return NextResponse.json(await tryOp(op, { activity }));
});