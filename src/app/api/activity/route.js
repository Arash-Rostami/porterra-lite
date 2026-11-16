import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { tryOp, resolveScope } from '@/lib/serverOps.js';
import { findCompanyOwnerByCustKey, findLeadRefsByKey, getActivityById } from '@/lib/queries.js';
import { isConnError } from '@/lib/db.js';
import { companyKey } from '@/lib/companies.js';
import { parseOrThrow, Activity } from '@/lib/models.js';

function refuse(message) {
  return Object.assign(new Error('VALIDATION: ' + message), { code: 'VALIDATION' });
}

async function requireVisibleCompany(user, key) {
  const refs = await findLeadRefsByKey(key);
  if (!refs.length) throw refuse('شرکت پیدا نشد');
  if (isElevated(user)) return;
  const scope = await resolveScope(user);
  const covers = (code) => (scope.type === 'own' ? scope.agentCode != null && code === scope.agentCode : scope.agentCodes.includes(code));
  if (!refs.some((r) => covers(r.coordinator))) throw refuse('این شرکت در دسترس شما نیست');
}

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const activity = parseOrThrow(Activity, body);
  activity.companyKey = companyKey(activity.companyKey);
  try {
    if (await getActivityById(activity.id)) throw refuse('شناسه تکراری است');
    await requireVisibleCompany(user, activity.companyKey);
  } catch (err) {
    if (!isConnError(err) || activity.id.startsWith('msg-')) throw err;
  }
  activity.author = user.displayName || user.username;
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