import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { getContactById } from '@/lib/queries.js';
import { parseOrThrow, Id, QuoteAnnouncePrice, QuoteResolve } from '@/lib/models.js';
import Utils from '@/lib/utils.js';

function validationError(message) {
  const err = new Error(message);
  err.code = 'VALIDATION';
  return err;
}

export const PATCH = handle(async (req, ctx) => {
  await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const contact = await getContactById(id);
  if (!contact) throw validationError('لید یافت نشد');
  if (contact.result !== 'در حال استعلام') throw validationError('این لید در وضعیت استعلام نیست');

  if (body.action === 'announce-price') {
    const input = parseOrThrow(QuoteAnnouncePrice, body);
    const patch = { quotePrice: input.price, quotePriceType: input.priceType, quoteTerms: input.terms, quotePriceDate: Utils.todayDdMmYyyy() };
    return NextResponse.json(await tryOp('updateContact', { id, patch }));
  }
  if (body.action === 'resolve') {
    if (!contact.quotePrice) throw validationError('ابتدا باید قیمت اعلام شود');
    if (contact.quoteResult) throw validationError('این استعلام قبلاً نهایی شده');
    const input = parseOrThrow(QuoteResolve, body);
    const patch = {
      quoteResult: input.result,
      quoteResultDate: Utils.todayDdMmYyyy(),
      quoteFailReason: input.result === 'ناموفق' ? input.failReason : null,
      converted: input.result === 'موفق' ? true : contact.converted,
    };
    return NextResponse.json(await tryOp('updateContact', { id, patch }));
  }
  throw validationError('action نامعتبر');
});
