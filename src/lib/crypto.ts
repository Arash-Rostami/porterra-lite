import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function key(): Buffer {
  return Buffer.from(process.env.ENCRYPTION_KEY as string, 'base64');
}

export function encryptString(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const payload = {
    iv: iv.toString('hex'),
    value: encrypted,
    tag: cipher.getAuthTag().toString('hex'),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decryptString(payload: string): string | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(parsed.iv, 'hex'));

    decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));

    let decrypted = decipher.update(parsed.value, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

const SESSION_COOKIE = 'crm_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME: string = SESSION_COOKIE;

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  agentCode?: string | null;
  department?: string | null;
  role: string;
}

export interface SessionTokenPayload {
  userId: string;
  username: string;
  displayName: string | null;
  agentCode: string | null;
  department: string | null;
  role: string;
  expiresAt: number;
}

export function createSessionToken(user: SessionUser): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    token: encryptString(JSON.stringify({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      agentCode: user.agentCode ?? null,
      department: user.department ?? null,
      role: user.role,
      expiresAt,
    })),
    expiresAt,
  };
}

export function readSessionToken(token: string | null | undefined): SessionTokenPayload | null {
  if (!token) return null;
  const raw = decryptString(token);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as SessionTokenPayload;
    if (!payload || typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
