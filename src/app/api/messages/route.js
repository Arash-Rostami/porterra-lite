import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser } from '@/lib/auth.js';
import { tryOp } from '@/lib/serverOps.js';
import { listMessages, listUsers } from '@/lib/queries.js';
import { parseOrThrow, MessageInput } from '@/lib/models.js';
import Utils from '@/lib/utils.js';

const CHANNEL = '#public';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mentions(text, name) {
  return !!name && new RegExp('(^|[\\s(«])@' + escapeRe(name) + '(?=$|[\\s،.,:!؟?)»])').test(text);
}

export const GET = handle(async (req) => {
  await requireUser();
  const since = Number(new URL(req.url).searchParams.get('since')) || 0;
  return NextResponse.json({ messages: await listMessages(since) });
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const { text } = parseOrThrow(MessageInput, await req.json());
  const author = user.displayName || user.username;
  const ts = Date.now();
  const id = 'msg-' + ts + '-' + Math.floor(Math.random() * 100000);
  const me = Utils.recipientKey(user);
  const recipients = (await listUsers()).filter((u) => {
    const key = Utils.recipientKey(u);
    return u.active && key && key.length <= 32 && key !== me && (mentions(text, u.displayName) || mentions(text, u.username));
  });
  const notifications = recipients.map((u, i) => ({
    id: `NOTIF-${ts}-${i}-${Math.floor(Math.random() * 100000)}`,
    forAgent: Utils.recipientKey(u), type: 'mention', custKey: null, company: null,
    text: `${author} در پیام‌رسان شما را نام برد: ${text.slice(0, 120)}`, createdAt: ts, read: false,
  }));
  const activity = { id, companyKey: CHANNEL, type: 'message', ts, author, text };
  const res = await tryOp('addMessage', { activity, notifications });
  return NextResponse.json(res.ok ? { ...res, message: { id, ts, author, text } } : res);
});
