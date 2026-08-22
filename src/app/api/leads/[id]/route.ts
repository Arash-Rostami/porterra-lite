import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkLeadScope } from '@/lib/serverOps.js';
import { getLeadById } from '@/lib/queries.js';
import { parseOrThrow, LeadUpdate, Activity, Id } from '@/lib/models.js';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(LeadUpdate, body.patch);
  const existing = await getLeadById(id);
  await checkLeadScope(user, existing, patch.coordinator);
  return NextResponse.json(await tryOp('updateLead', { id, patch }));
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const existing = await getLeadById(id);
  await checkLeadScope(user, existing, undefined);
  const body = await req.json().catch(() => ({}));
  const changeLogEntry = body.changeLogEntry
    ? parseOrThrow(Activity, { ...body.changeLogEntry, type: 'change' })
    : null;
  return NextResponse.json(await tryOp('deleteLead', { id, changeLogEntry }));
});
