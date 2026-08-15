import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, LeadCreate } from '@/lib/models.js';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const rec = parseOrThrow(LeadCreate, body.rec);
  return NextResponse.json(await tryOp('createLead', { rec }));
});