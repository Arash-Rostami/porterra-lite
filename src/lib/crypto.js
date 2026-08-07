import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function key() {
  return Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
}

export function encryptString(text) {
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

export function decryptString(payload) {
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

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function createSessionToken(user) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    token: encryptString(JSON.stringify({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      agentCode: user.agentCode ?? null,
      role: user.role,
      expiresAt,
    })),
    expiresAt,
  };
}

export function readSessionToken(token) {
  if (!token) return null;
  const raw = decryptString(token);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (!payload || typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}