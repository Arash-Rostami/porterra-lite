import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireAdmin } from '@/lib/auth.js';
import { resetData } from '@/lib/serverOps.js';

export const POST = handle(async () => {
  await requireAdmin();
  return NextResponse.json(await resetData());
});