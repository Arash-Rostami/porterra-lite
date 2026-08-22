import { cache } from 'react';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, createSessionToken, readSessionToken } from './crypto.js';
import type { SessionUser } from './crypto.js';
import { isConnError } from './db.js';
import { getUserById } from './queries.js';
import { rowToUser } from './mappers.js';
import type { User } from '../types/user.js';

const loadActiveUser = cache(async (userId: string): Promise<User | null> => {
  const row = await getUserById(userId);
  if (!row || !row.active) return null;
  return rowToUser(row);
});

export async function getSessionUser(): Promise<User | SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = readSessionToken(token);
  if (!payload) return null;
  try {
    return await loadActiveUser(payload.userId);
  } catch (err) {
    if (isConnError(err)) {
      return {
        id: payload.userId,
        username: payload.username,
        email: null,
        displayName: payload.displayName,
        agentCode: payload.agentCode ?? null,
        department: payload.department ?? null,
        role: payload.role,
      };
    }
    throw err;
  }
}

export async function requireUser(): Promise<User | SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(): Promise<User | SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

export async function requireElevated(): Promise<User | SessionUser> {
  const user = await requireUser();
  if (!isElevated(user)) throw new Error('FORBIDDEN');
  return user;
}

export function isElevated(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'developer';
}

export async function createSession(user: SessionUser): Promise<void> {
  const { token, expiresAt } = createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
}
