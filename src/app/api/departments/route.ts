import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { listDepartmentNames } from '@/lib/queries';

export const GET = handle(async () => {
  await requireUser();
  return NextResponse.json({ departments: await listDepartmentNames() });
});
