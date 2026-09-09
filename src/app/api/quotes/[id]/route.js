import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp, checkLeadScope } from '@/lib/serverOps.js';
import { getLeadById } from '@/lib/queries.js';
import { parseOrThrow, Id, QuoteAnnouncePrice, QuoteResolve } from '@/lib/models.js';
import Utils from '@/lib/utils.js';

function validationError(message) {
  const err = new Error(message);
  err.code = 'VALIDATION';
  return err;
}

export const PATCH = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id: rawId } = await ctx.params;
  const id = parseOrThrow(Id, rawId);
  const body = await req.json();
  const lead = await getLeadById(id);
  if (!lead) throw validationError('لید یافت نشد');
  await checkLeadScope(user, lead, undefined);
  if (lead.result !== 'در حال استعلام') throw validationError('این لید در وضعیت استعلام نیست');

  function notify(type, text) {
    if (!lead.coordinator || lead.coordinator === user.agentCode) return undefined;
    return {
      id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      forAgent: lead.coordinator, type,
      custKey: Utils.normSpace(lead.company).toLowerCase(), company: lead.company,
      text, createdAt: Date.now(), read: false,
    };
  }

  if (body.action === 'announce-price') {
    const input = parseOrThrow(QuoteAnnouncePrice, body);
    const patch = { quotePrice: input.price, quotePriceType: input.priceType, quoteTerms: input.terms, quotePriceDate: Utils.todayDdMmYyyy() };
    const notification = notify('quote_priced', `قیمت برای استعلام «${lead.company}» اعلام شد`);
    if (!notification) return NextResponse.json(await tryOp('updateLead', { id, patch }));
    return NextResponse.json(await tryOp('updateLeadWithNotification', { id, patch, notification }));
  }
  if (body.action === 'resolve') {
    if (!lead.quotePrice) throw validationError('ابتدا باید قیمت اعلام شود');
    if (lead.quoteResult) throw validationError('این استعلام قبلاً نهایی شده');
    const input = parseOrThrow(QuoteResolve, body);
    const patch = {
      quoteResult: input.result,
      quoteResultDate: Utils.todayDdMmYyyy(),
      quoteFailReason: input.result === 'ناموفق' ? input.failReason : null,
      converted: input.result === 'موفق' ? true : lead.converted,
    };
    const notification = notify('quote_resolved', `استعلام «${lead.company}» با نتیجه «${input.result}» نهایی شد`);
    if (!notification) return NextResponse.json(await tryOp('updateLead', { id, patch }));
    return NextResponse.json(await tryOp('updateLeadWithNotification', { id, patch, notification }));
  }
  throw validationError('action نامعتبر');
});
