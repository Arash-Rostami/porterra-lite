import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireAdmin } from '@/lib/auth';
import { resetData } from '@/lib/serverOps';

export const POST = handle(async () => {
  await requireAdmin();
  return NextResponse.json(await resetData());
});
