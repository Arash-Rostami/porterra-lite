import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireElevated } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, CategoryUpdate, Id } from '@/lib/models';

function dupToValidation(err) {
  if (err && err.code === 'ER_DUP_ENTRY') {
    const dup = new Error('این دسته‌بندی قبلاً ثبت شده');
    dup.code = 'VALIDATION';
    throw dup;
  }
  throw err;
}

export const PATCH = handle(async (req, ctx) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const patch = parseOrThrow(CategoryUpdate, body.patch);
  try {
    await tryOp('updateCategory', { id, patch });
  } catch (err) {
    dupToValidation(err);
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req, ctx) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  try {
    await tryOp('deleteCategory', { id });
  } catch (err) {
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED')) {
      const ref = new Error('این دسته‌بندی توسط محصول یا سرنخ در استفاده است و قابل حذف نیست');
      ref.code = 'VALIDATION';
      throw ref;
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
});