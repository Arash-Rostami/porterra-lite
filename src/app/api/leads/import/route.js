import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { importLeads } from '@/lib/serverOps.js';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  return NextResponse.json(await importLeads(body.records));
});