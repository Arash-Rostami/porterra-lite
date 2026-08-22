import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser } from '@/lib/auth';
import { tryOp } from '@/lib/serverOps';
import { parseOrThrow, ProductCreate } from '@/lib/models';

export const POST = handle(async (req: NextRequest) => {
  await requireUser();
  const body = await req.json();
  const product = parseOrThrow(ProductCreate, body.product);
  try {
    await tryOp('createProduct', { product });
  } catch (err) {
    if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
      const dup = new Error('این محصول قبلاً ثبت شده') as Error & { code?: string };
      dup.code = 'VALIDATION';
      throw dup;
    }
    throw err;
  }
  return NextResponse.json({ product });
});
