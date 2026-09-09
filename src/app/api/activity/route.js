import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { findCompanyOwnerByCustKey } from '@/lib/queries.js';
import { parseOrThrow, Activity } from '@/lib/models.js';

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const activity = parseOrThrow(Activity, body);
  const op = activity.type === 'change' ? 'addChangeLog' : 'addComment';
  if (op === 'addChangeLog') return NextResponse.json(await tryOp(op, { activity }));

  const owner = await findCompanyOwnerByCustKey(activity.companyKey);
  const notification = owner && owner.coordinator && owner.coordinator !== user.agentCode ? {
    id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
    forAgent: owner.coordinator,
    type: 'comment',
    custKey: activity.companyKey,
    company: owner.company,
    text: `نظر جدید${activity.author ? ' از ' + activity.author : ''}: ${activity.text}`,
    createdAt: Date.now(),
    read: false,
  } : null;
  return NextResponse.json(await tryOp(op, { activity, notification }));
});