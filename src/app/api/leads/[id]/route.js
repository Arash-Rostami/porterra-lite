import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkLeadScope } from '@/lib/serverOps.js';
import { getLeadById } from '@/lib/queries.js';
import { parseOrThrow, LeadUpdate, Activity, Id } from '@/lib/models.js';
import Utils from '@/lib/utils.js';

export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(LeadUpdate, body.patch);
  const existing = await getLeadById(id);
  await checkLeadScope(user, existing, patch.coordinator);

  const reassigned = existing && patch.coordinator !== undefined && patch.coordinator
    && patch.coordinator !== existing.coordinator && patch.coordinator !== user.agentCode;
  if (!reassigned) return NextResponse.json(await tryOp('updateLead', { id, patch }));

  const company = patch.company !== undefined ? patch.company : existing.company;
  const notification = {
    id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
    forAgent: patch.coordinator, type: 'reassigned',
    custKey: Utils.normSpace(company).toLowerCase(), company,
    text: `سرنخ «${company}» به شما واگذار شد`, createdAt: Date.now(), read: false,
  };
  return NextResponse.json(await tryOp('updateLeadWithNotification', { id, patch, notification }));
});

export const DELETE = handle(async (req, ctx) => {
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