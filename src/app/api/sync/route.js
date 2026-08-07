import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { syncData } from '@/lib/serverOps.js';

export const POST = handle(async () => {
  await requireUser();
  return NextResponse.json(await syncData());
});