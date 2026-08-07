import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { deleteSession } from '@/lib/auth.js';

export const POST = handle(async () => {
  await deleteSession();
  return NextResponse.json({ ok: true });
});