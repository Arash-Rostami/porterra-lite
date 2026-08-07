import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { getSessionUser } from '@/lib/auth.js';

export const GET = handle(async () => {
  return NextResponse.json(await getSessionUser());
});