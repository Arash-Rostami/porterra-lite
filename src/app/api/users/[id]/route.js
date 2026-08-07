import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, requireElevated } from '@/lib/auth.js';
import { parseOrThrow, UserUpdate, Id } from '@/lib/models.js';
import { findUserByEmail, updateUser, deleteUser } from '@/lib/queries.js';
import { encryptString } from '@/lib/crypto.js';

export const PATCH = handle(async (req, ctx) => {
  const actor = await requireUser();
  const { id: rawId } = await ctx.params;
  const targetId = parseOrThrow(Id, rawId);
  const elevated = actor.role === 'admin' || actor.role === 'developer';
  const isSelf = actor.id === targetId;
  if (!elevated && !isSelf) throw new Error('FORBIDDEN');

  const body = await req.json();
  let u = parseOrThrow(UserUpdate, body.patch);
  if (!elevated) u = { email: u.email, password: u.password };
  if (isSelf && u.role !== undefined) throw new Error('VALIDATION: نقش حساب خودتان قابل تغییر نیست');
  if (isSelf && u.active !== undefined) throw new Error('VALIDATION: وضعیت حساب خودتان قابل تغییر نیست');

  if (u.email !== undefined && u.email !== null) {
    const existing = await findUserByEmail(u.email);
    if (existing && existing.id !== targetId) throw new Error('VALIDATION: این ایمیل قبلاً ثبت شده');
  }
  const queryPatch = {};
  if (u.displayName !== undefined) queryPatch.displayName = u.displayName;
  if (u.email !== undefined) queryPatch.email = u.email;
  if (u.agentCode !== undefined) queryPatch.agentCode = u.agentCode;
  if (u.role !== undefined) queryPatch.role = u.role;
  if (u.active !== undefined) queryPatch.active = u.active;
  if (u.password) queryPatch.passwordCipher = encryptString(u.password);
  await updateUser(targetId, queryPatch);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req, ctx) => {
  const admin = await requireElevated();
  const { id: rawId } = await ctx.params;
  const target = parseOrThrow(Id, rawId);
  if (target === admin.id) throw new Error('cannot delete self');
  await deleteUser(target);
  return NextResponse.json({ ok: true });
});