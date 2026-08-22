import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, CategoryCreate } from '@/lib/models';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const category = parseOrThrow(CategoryCreate, body.category);
  try {
    await tryOp('createCategory', { category });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const dup = new Error('این دسته‌بندی قبلاً ثبت شده');
      dup.code = 'VALIDATION';
      throw dup;
    }
    throw err;
  }
  return NextResponse.json({ category });
});