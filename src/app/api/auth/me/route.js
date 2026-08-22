import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { getSessionUser } from '@/lib/auth';

export const GET = handle(async () => {
  return NextResponse.json(await getSessionUser());
});