import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { createSession } from '@/lib/auth.js';
import { authenticateUser } from '@/lib/serverOps.js';

export const POST = handle(async (req) => {
  const body = await req.json();
  const res = await authenticateUser(body.email, body.password);
  if (res.user) await createSession(res.user);
  return NextResponse.json(res);
});