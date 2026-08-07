import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler.js';
import { requireUser, requireAdmin, requireElevated } from '@/lib/auth.js';
import { parseOrThrow, UserCreate } from '@/lib/models.js';
import {
  listUsers,
  listUsersRaw,
  createUser,
  findUserByUsername,
  findUserByEmail,
} from '@/lib/queries.js';
import { encryptString, decryptString } from '@/lib/crypto.js';
import { rowToUser } from '@/lib/mappers.js';

export const GET = handle(async (req) => {
  if (req.nextUrl.searchParams.get('raw') === '1') {
    await requireAdmin();
    const rows = await listUsersRaw();
    return NextResponse.json({ users: rows.map((r) => ({ ...rowToUser(r), password: decryptString(r.password_cipher) })) });
  }
  await requireUser();
  return NextResponse.json({ users: await listUsers() });
});

export const POST = handle(async (req) => {
  await requireElevated();
  const body = await req.json();
  const u = parseOrThrow(UserCreate, body);
  if (await findUserByUsername(u.username)) throw new Error('VALIDATION: username already exists');
  if (u.email && (await findUserByEmail(u.email))) throw new Error('VALIDATION: email already exists');
  const row = {
    id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    username: u.username,
    email: u.email ?? null,
    display_name: u.displayName,
    agent_code: u.agentCode,
    password_cipher: encryptString(u.password),
    role: u.role,
    active: u.active ? 1 : 0,
    last_login: null,
    created_at: Date.now(),
  };
  await createUser(row);
  return NextResponse.json({ user: rowToUser(row) });
});