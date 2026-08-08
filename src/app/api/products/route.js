import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { parseOrThrow, ProductCreate } from '@/lib/models.js';

export const POST = handle(async (req) => {
  await requireUser();
  const body = await req.json();
  const product = parseOrThrow(ProductCreate, body.product);
  try {
    await tryOp('createProduct', { product });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const dup = new Error('این محصول قبلاً ثبت شده');
      dup.code = 'VALIDATION';
      throw dup;
    }
    throw err;
  }
  return NextResponse.json({ product });
});
