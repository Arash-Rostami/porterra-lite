import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireElevated } from '@/lib/auth.js';
import { parseOrThrow, Id } from '@/lib/models.js';
import { setUserActive } from '@/lib/queries.js';

export const PATCH = handle(async (req, ctx) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  await setUserActive(id, !!body.active);
  return NextResponse.json({ ok: true });
});