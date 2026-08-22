import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { deleteSession } from '@/lib/auth';

export const POST = handle(async () => {
  await deleteSession();
  return NextResponse.json({ ok: true });
});