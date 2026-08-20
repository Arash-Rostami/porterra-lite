import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { tryOp, resolveScope } from '@/lib/serverOps.js';
import { parseOrThrow, LeadCreate } from '@/lib/models.js';

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const rec = parseOrThrow(LeadCreate, body.rec);
  if (!isElevated(user)) {
    const scope = await resolveScope(user);
    if (scope.type === 'own') {
      if (!rec.coordinator) rec.coordinator = scope.agentCode;
      else if (rec.coordinator !== scope.agentCode) {
        const err = new Error('VALIDATION: نمی‌توانید سرنخی برای این کارشناس ثبت کنید');
        err.code = 'VALIDATION';
        throw err;
      }
    } else if (scope.type === 'department') {
      if (!rec.coordinator || !scope.agentCodes.includes(rec.coordinator)) {
        const err = new Error('VALIDATION: این کارشناس در دپارتمان شما نیست');
        err.code = 'VALIDATION';
        throw err;
      }
    }
  }
  return NextResponse.json(await tryOp('createLead', { rec }));
});