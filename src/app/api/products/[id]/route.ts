import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireElevated } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, ProductUpdate, Id } from '@/lib/models';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function dupToValidation(err: unknown): never {
  if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
    const dup = new Error('این محصول قبلاً ثبت شده') as Error & { code?: string };
    dup.code = 'VALIDATION';
    throw dup;
  }
  throw err;
}

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext) => {
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

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext) => {
  await requireElevated();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  await tryOp('deleteProduct', { id });
  return NextResponse.json({ ok: true });
});
