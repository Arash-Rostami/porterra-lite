import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { importLeads } from '@/lib/serverOps';

export const POST = handle(async (req: NextRequest) => {
  await requireUser();
  const body = await req.json();
  return NextResponse.json(await importLeads(body.records));
});
