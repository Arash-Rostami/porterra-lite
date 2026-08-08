import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireElevated } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, ProductUpdate, Id } from '@/lib/models.js';

function dupToValidation(err) {
  if (err && err.code === 'ER_DUP_ENTRY') {
    const dup = new Error('این محصول قبلاً ثبت شده');
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
  const patch = parseOrThrow(ProductUpdate, body.patch);
  try {
    await tryOp('updateProduct', { id, patch });
  } catch (err) {
    dupToValidation(err);
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req, ctx) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  await tryOp('deleteProduct', { id });
  return NextResponse.json({ ok: true });
});
