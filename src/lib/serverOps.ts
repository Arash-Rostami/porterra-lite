import { withTransaction, isConnError } from './db';
import {
  applyOp, loadAllFromDb, reseedLeads, findUserByEmail, createUser, updateUserLastLogin, listAgentCodesByDepartment,
} from './queries';
import type { BootData } from './queries';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { SEED_DATA } from '../data/seed.js';
import { parseOrThrow, LeadCreate, LoginInput } from './models';
import { encryptString, decryptString } from './crypto';
import { rowToUser } from './mappers';
import { isElevated } from './auth';
import Utils from './utils';
import type { User } from '../types/user';

export interface ScopedUser {
  role?: string | null;
  department?: string | null;
  agentCode?: string | null;
}

export type Scope =
  | { type: 'all' }
  | { type: 'department'; agentCodes: string[] }
  | { type: 'own'; agentCode: string | null };

export async function resolveScope(user: ScopedUser): Promise<Scope> {
    if (isElevated(user)) return { type: 'all' };
    if (user.role === 'manager') {
        if (!user.department) return { type: 'department', agentCodes: [] };
        try {
            const agentCodes = await listAgentCodesByDepartment(user.department);
            return { type: 'department', agentCodes };
        } catch {
            return { type: 'department', agentCodes: [] };
        }
    }
    return { type: 'own', agentCode: user.agentCode || null };
}

export async function checkLeadScope(
    user: ScopedUser,
    existingLead: { coordinator?: string | null } | null | undefined,
    nextCoordinator: string | null | undefined
): Promise<void> {
    if (isElevated(user)) return;
    const scope = await resolveScope(user);
    const covers = (code: string | null | undefined) => (scope.type === 'own' ? code === scope.agentCode : scope.type === 'department' ? scope.agentCodes.includes(code ?? '') : true);
    if (existingLead && !covers(existingLead.coordinator)) throw new Error('FORBIDDEN');
    if (nextCoordinator !== undefined && !covers(nextCoordinator)) throw new Error('FORBIDDEN');
}

function scopeBootData(data: BootData, scope: Scope | null | undefined): BootData {
    if (!scope || scope.type === 'all') return data;
    const matchAgent = scope.type === 'own'
        ? (code: string | null) => code === scope.agentCode
        : (code: string | null) => scope.agentCodes.includes(code ?? '');
    const records = data.records.filter((r) => matchAgent(r.coordinator));
    const reminders = data.reminders.filter((rm) => matchAgent(rm.forAgent));
    const companyKeys = new Set(records.map((r) => Utils.normSpace(r.company).toLowerCase()).filter(Boolean));
    const companyMeta: BootData['companyMeta'] = {};
    for (const key of Object.keys(data.companyMeta || {})) {
        if (companyKeys.has(key)) companyMeta[key] = data.companyMeta[key];
    }
    return { ...data, records, reminders, companyMeta };
}

const OFFLINE_DIR = path.join(process.cwd(), '.porterra');
const QUEUE_FILE = path.join(OFFLINE_DIR, 'queue.json');
const SNAPSHOT_FILE = path.join(OFFLINE_DIR, 'snapshot.json');

interface QueueEntry {
  id: string;
  op: string;
  payload: Record<string, unknown>;
  ts: number;
}

let queueChain: Promise<unknown> = Promise.resolve();

async function ensureDir(): Promise<void> {
    await mkdir(OFFLINE_DIR, { recursive: true });
    for (const name of await readdir(OFFLINE_DIR).catch(() => [] as string[])) {
        if (name.endsWith('.tmp')) await unlink(path.join(OFFLINE_DIR, name)).catch(() => {});
    }
}

async function writeJson(file: string, data: unknown): Promise<void> {
    await ensureDir();
    const tmp = file + '.tmp';
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, file);
}

async function readJson(file: string): Promise<unknown> {
    try {
        return JSON.parse(await readFile(file, 'utf8'));
    } catch {
        return null;
    }
}

function readQueue(): Promise<QueueEntry[]> {
    return readJson(QUEUE_FILE).then((q) => (Array.isArray(q) ? (q as QueueEntry[]) : []));
}

function appendOp(op: string, payload: Record<string, unknown>): Promise<number> {
    queueChain = queueChain.then(async () => {
        const q = await readQueue();
        q.push({ id: `${op}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, op, payload, ts: Date.now() });
        await writeJson(QUEUE_FILE, q);
        return q.length;
    });
    return queueChain as Promise<number>;
}

function clearQueue(): Promise<void> {
    return unlink(QUEUE_FILE).then(() => undefined).catch(() => undefined);
}

function getQueueCount(): Promise<number> {
    return readQueue().then((q) => q.length);
}

function readSnapshot(): Promise<BootData | null> {
    return readJson(SNAPSHOT_FILE) as Promise<BootData | null>;
}

function writeSnapshot(data: BootData): Promise<void> {
    return writeJson(SNAPSHOT_FILE, data);
}

export async function tryOp(op: string, payload: Record<string, unknown>): Promise<{ ok: boolean; queued?: boolean; queueCount?: number }> {
  try {
    await applyOp(op, payload);
    return { ok: true };
  } catch (err) {
    if (isConnError(err)) {
      const queueCount = await appendOp(op, payload);
      return { ok: false, queued: true, queueCount };
    }
    throw err;
  }
}

export async function loadBootData(user: ScopedUser): Promise<{ data: BootData; offline: boolean; queueCount: number }> {
  const scope = await resolveScope(user);
  let data: BootData;
  try {
    data = await loadAllFromDb();
  } catch {
    const snap = await readSnapshot();
    const fallback: BootData = snap || { records: [], companyMeta: {}, reminders: [], products: [], agents: [], categories: [] };
    return { data: scopeBootData(fallback, scope), offline: true, queueCount: await getQueueCount() };
  }
  await writeSnapshot(data).catch(() => {});
  return { data: scopeBootData(data, scope), offline: false, queueCount: await getQueueCount() };
}

export async function syncData(user: ScopedUser): Promise<
  | { data: BootData; synced: number; remaining: number }
  | { error: string; message: string; remaining: number }
> {
  const queue = await readQueue();
  try {
    if (queue.length > 0) {
      await withTransaction(async (conn) => {
        for (const entry of queue) await applyOp(entry.op, entry.payload, conn);
      });
    }
    const data = await loadAllFromDb();
    await writeSnapshot(data);
    if (queue.length > 0) await clearQueue();
    const scope = await resolveScope(user);
    return { data: scopeBootData(data, scope), synced: queue.length, remaining: 0 };
  } catch (err) {
    const e = err as { message?: string };
    return { error: 'sync-failed', message: e && e.message ? e.message : 'sync failed', remaining: await getQueueCount() };
  }
}

export async function importLeads(records: unknown[]): Promise<{ ok: boolean; count?: number; queued?: boolean; queueCount?: number }> {
  const valid = records.map((r) => parseOrThrow(LeadCreate, r));
  try {
    await applyOp('importRecords', { records: valid });
    return { ok: true, count: valid.length };
  } catch (err) {
    if (isConnError(err)) {
      let queueCount = await getQueueCount();
      for (const r of valid) queueCount = await appendOp('createLead', { rec: r });
      return { ok: false, queued: true, queueCount };
    }
    throw err;
  }
}

export async function resetData(): Promise<{ ok: boolean }> {
  // SEED_DATA (src/data/seed.js) predates the categoryId/quote-workflow migration and uses the
  // old free-text `category` shape (see src/lib/CLAUDE.md) — it's a known, accepted mismatch with
  // the current LeadCreate schema (yields NULL category_id on reset), not a real runtime type. Cast
  // only; no validation added here, preserving the original's un-validated reseed behavior exactly.
  await reseedLeads(SEED_DATA as unknown as Parameters<typeof reseedLeads>[0]);
  return { ok: true };
}

export async function authenticateUser(email: string, password: string): Promise<{ user: User } | { error: string }> {
  const input = parseOrThrow(LoginInput, { email, password });
  const row = await findUserByEmail(input.email);
  if (!row) return { error: 'invalid' };
  if (!row.active) return { error: 'inactive' };
  const raw = decryptString(row.password_cipher);
  if (raw === null || raw !== input.password) return { error: 'invalid' };
  const user = rowToUser(row);
  await updateUserLastLogin(user.id, Date.now());
  return { user };
}
