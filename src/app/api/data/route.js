import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { loadBootData } from '@/lib/serverOps.js';

export const GET = handle(async () => {
  const user = await requireUser();
  const boot = await loadBootData();
  return NextResponse.json({ ...boot, currentUser: user });
});