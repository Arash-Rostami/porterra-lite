import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { loadBootData } from '@/lib/serverOps';

export const GET = handle(async () => {
  const user = await requireUser();
  const boot = await loadBootData(user);
  return NextResponse.json({ ...boot, currentUser: user });
});