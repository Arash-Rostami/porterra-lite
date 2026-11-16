import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { tryOp, checkLeadScope, resolveScope } from '@/lib/serverOps.js';
import { findLeadRefsByKey } from '@/lib/queries.js';
import { companyKey } from '@/lib/companies.js';
import Utils from '@/lib/utils.js';
import { parseOrThrow, CompanyRename, CompanyRef } from '@/lib/models.js';

function refuse(message) {
  return Object.assign(new Error('VALIDATION: ' + message), { code: 'VALIDATION' });
}

async function scopeOf(user) {
  return isElevated(user) ? { type: 'all' } : resolveScope(user);
}

async function scopedRefs(user, key) {
  if (!key) throw refuse('نام شرکت نامعتبر است');
  const refs = await findLeadRefsByKey(key);
  if (!refs.length) throw refuse('شرکت پیدا نشد');
  const checked = new Set();
  for (const ref of refs) {
    if (checked.has(ref.coordinator)) continue;
    checked.add(ref.coordinator);
    await checkLeadScope(user, ref);
  }
  return refs;
}

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const { company, rename, entry } = parseOrThrow(CompanyRename, await req.json());
  const newName = Utils.normName(rename);
  const oldKey = companyKey(company);
  const newKey = companyKey(newName);
  if (!newKey) throw refuse('نام شرکت نامعتبر است');
  await scopedRefs(user, oldKey);
  const merging = oldKey !== newKey && (await findLeadRefsByKey(newKey)).length > 0;
  if (merging && !isElevated(user)) throw refuse('این نام برای شرکت دیگری ثبت شده؛ ادغام فقط توسط مدیر انجام می‌شود');
  const changeLogEntry = entry ? { ...entry, type: 'change', companyKey: newKey } : null;
  return NextResponse.json(await tryOp('renameCompany', { oldKey, newName, changeLogEntry, allowMerge: isElevated(user), scope: await scopeOf(user) }));
});

export const DELETE = handle(async (req) => {
  const user = await requireUser();
  const { company } = parseOrThrow(CompanyRef, await req.json());
  const key = companyKey(company);
  await scopedRefs(user, key);
  return NextResponse.json(await tryOp('deleteCompany', { key, scope: await scopeOf(user) }));
});
