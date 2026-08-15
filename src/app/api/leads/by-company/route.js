import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { findLeadsByCompany } from '@/lib/queries.js';
import Utils from '@/lib/utils.js';

export const GET = handle(async (req) => {
  await requireUser();
  const company = (req.nextUrl.searchParams.get('company') || '').trim();
  if (!company) return NextResponse.json({ lead: null });
  const matches = await findLeadsByCompany(company);
  const latest = matches.reduce((best, r) => {
    if (!best) return r;
    const dt = Utils.parseDate(r.date);
    const bestDt = Utils.parseDate(best.date);
    return dt && (!bestDt || dt > bestDt) ? r : best;
  }, null);
  return NextResponse.json({ lead: latest });
});
