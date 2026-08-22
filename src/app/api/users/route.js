import { NextResponse } from 'next/server';
import { handle } from '@/lib/apiHandler';
import { requireUser, requireAdmin, requireElevated } from '@/lib/auth';
import { parseOrThrow, UserCreate } from '@/lib/models';
import {
  listUsers,
  listUsersRaw,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findDepartmentByNormalizedName,
} from '@/lib/queries';
import { encryptString, decryptString } from '@/lib/crypto';
import { rowToUser } from '@/lib/mappers';

export const GET = handle(async (req) => {
  if (req.nextUrl.searchParams.get('raw') === '1') {
    await requireAdmin();
    const rows = await listUsersRaw();
    return NextResponse.json({ users: rows.map((r) => ({ ...rowToUser(r), password: decryptString(r.password_cipher) })) });
  }
  const actor = await requireUser();
  const all = await listUsers();
  const users = actor.role === 'manager' ? all.filter((u) => u.department === actor.department) : all;
  return NextResponse.json({ users });
});

export const POST = handle(async (req) => {
  await requireElevated();
  const body = await req.json();
  const u = parseOrThrow(UserCreate, body);
  if (u.department) {
    const canonical = await findDepartmentByNormalizedName(u.department);
    u.department = canonical || u.department;
  }
  if (await findUserByUsername(u.username)) throw new Error('VALIDATION: username already exists');
  if (u.email && (await findUserByEmail(u.email))) throw new Error('VALIDATION: email already exists');
  const row = {
    id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    username: u.username,
    email: u.email ?? null,
    display_name: u.displayName,
    agent_code: u.agentCode,
    department: u.department ?? null,
    password_cipher: encryptString(u.password),
    role: u.role,
    active: u.active ? 1 : 0,
    last_login: null,
    created_at: Date.now(),
  };
  await createUser(row);
  return NextResponse.json({ user: rowToUser(row) });
});