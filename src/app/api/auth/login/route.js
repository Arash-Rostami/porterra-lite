import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { createSession } from '@/lib/auth';
import { authenticateUser } from '@/lib/serverOps';

export const POST = handle(async (req) => {
  const body = await req.json();
  const res = await authenticateUser(body.email, body.password);
  if (res.user) await createSession(res.user);
  return NextResponse.json(res);
});