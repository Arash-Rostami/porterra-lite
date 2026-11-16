import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { tryOp, resolveScope } from '@/lib/serverOps.js';
import { parseOrThrow, LeadCreate } from '@/lib/models.js';
import { getLeadById, getCategoryById } from '@/lib/queries.js';
import { isConnError } from '@/lib/db.js';
import { SOURCE_OPTS } from '@/lib/filters.js';
import Utils from '@/lib/utils.js';

function refuse(message) {
  return Object.assign(new Error('VALIDATION: ' + message), { code: 'VALIDATION' });
}

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const rec = parseOrThrow(LeadCreate, body.rec);
  const product = Utils.normSpace(rec.product);
  if (!product || !rec.categoryId) throw refuse('محصول و دسته محصول الزامی است');
  rec.product = product;
  if (!Utils.isPhoneOk(rec.phone)) throw refuse('شماره تلفن کامل نیست (حداقل ۱۰ رقم)');
  const source = Utils.normSpace(rec.source) || 'سایر';
  if (!isElevated(user) && !SOURCE_OPTS.includes(source)) throw refuse('منبع سرنخ باید یکی از موارد فهرست باشد');
  rec.source = source;
  if (!isElevated(user)) {
    const scope = await resolveScope(user);
    if (scope.type === 'own') {
      if (!rec.coordinator) rec.coordinator = scope.agentCode;
      else if (rec.coordinator !== scope.agentCode) throw refuse('نمی‌توانید سرنخی برای این کارشناس ثبت کنید');
    } else if (scope.type === 'department') {
      if (!rec.coordinator || !scope.agentCodes.includes(rec.coordinator)) throw refuse('این کارشناس در دپارتمان شما نیست');
    }
  }
  try {
    if (await getLeadById(rec.id)) throw refuse('شناسه تکراری است');
    if (!(await getCategoryById(rec.categoryId))) throw refuse('دسته محصول نامعتبر است');
  } catch (err) {
    if (!isConnError(err)) throw err;
  }
  return NextResponse.json(await tryOp('createLead', { rec }));
});