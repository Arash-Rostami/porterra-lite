import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { syncData } from '@/lib/serverOps';

export const POST = handle(async () => {
  const user = await requireUser();
  return NextResponse.json(await syncData(user));
});