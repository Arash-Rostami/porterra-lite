import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { findLatestLeadByCompany } from '@/lib/queries.js';

export const GET = handle(async (req: NextRequest) => {
  await requireUser();
  const company = (req.nextUrl.searchParams.get('company') || '').trim();
  if (!company) return NextResponse.json({ lead: null });
  const lead = await findLatestLeadByCompany(company);
  return NextResponse.json({ lead });
});
