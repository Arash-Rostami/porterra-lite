import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { listDepartmentNames } from '@/lib/queries.js';

export const GET = handle(async () => {
  await requireUser();
  return NextResponse.json({ departments: await listDepartmentNames() });
});
