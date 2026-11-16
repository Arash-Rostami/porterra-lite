import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, isElevated } from '@/lib/auth.js';
import { importLeads, resolveScope } from '@/lib/serverOps.js';
import { findExistingLeadIds } from '@/lib/queries.js';
import { isConnError } from '@/lib/db.js';

function refuse(message) {
  return Object.assign(new Error('VALIDATION: ' + message), { code: 'VALIDATION' });
}

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  if (!Array.isArray(body.records) || !body.records.every((r) => r && typeof r === 'object')) throw refuse('فهرست رکوردها نامعتبر است');
  const records = body.records;
  if (!isElevated(user)) {
    const scope = await resolveScope(user);
    for (const r of records) {
      if (scope.type === 'own' && !r.coordinator) r.coordinator = scope.agentCode;
      const covers = scope.type === 'own' ? scope.agentCode != null && r.coordinator === scope.agentCode : scope.agentCodes.includes(r.coordinator);
      if (!covers) throw refuse('نمی‌توانید برای این کارشناس سرنخ وارد کنید');
    }
  }
  const batchIds = records.map((r) => r.id);
  if (new Set(batchIds).size !== batchIds.length) throw refuse('شناسه رکوردها تکراری است');
  try {
    const ids = records.map((r) => r.id).filter((id) => typeof id === 'string');
    if ((await findExistingLeadIds(ids)).length) throw refuse('شناسه رکوردها تکراری است');
  } catch (err) {
    if (!isConnError(err)) throw err;
  }
  return NextResponse.json(await importLeads(records));
});
