import { withTransaction, isConnError } from './db.js';
import {
  applyOp,
  loadAllFromDb,
  reseedLeads,
  findUserByEmail,
  createUser,
  updateUserLastLogin,
} from './queries.js';
import {mkdir, readdir, readFile, rename, unlink, writeFile} from 'fs/promises';
import path from 'path';
import { SEED_DATA } from '../data/seed.js';
import { parseOrThrow, LeadCreate, LoginInput } from './models.js';
import { encryptString, decryptString } from './crypto.js';
import { rowToUser } from './mappers.js';

const OFFLINE_DIR = path.join(process.cwd(), '.porterra');
const QUEUE_FILE = path.join(OFFLINE_DIR, 'queue.json');
const SNAPSHOT_FILE = path.join(OFFLINE_DIR, 'snapshot.json');

let queueChain = Promise.resolve();

async function ensureDir() {
    await mkdir(OFFLINE_DIR, {recursive: true});
    // Sweep stale temp files left by a crash mid-write.
    for (const name of await readdir(OFFLINE_DIR).catch(() => [])) {
        if (name.endsWith('.tmp')) await unlink(path.join(OFFLINE_DIR, name)).catch(() => {});
    }
}

async function writeJson(file, data) {
    await ensureDir();
    const tmp = file + '.tmp';
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, file);
}

async function readJson(file) {
    try {
        return JSON.parse(await readFile(file, 'utf8'));
    } catch {
        return null;
    }
}

function readQueue() {
    return readJson(QUEUE_FILE).then((q) => (Array.isArray(q) ? q : []));
}

function appendOp(op, payload) {
    queueChain = queueChain.then(async () => {
        const q = await readQueue();
        q.push({id: `${op}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, op, payload, ts: Date.now()});
        await writeJson(QUEUE_FILE, q);
        return q.length;
    });
    return queueChain;
}

function clearQueue() {
    return unlink(QUEUE_FILE).catch(() => {});
}

function getQueueCount() {
    return readQueue().then((q) => q.length);
}

function readSnapshot() {
    return readJson(SNAPSHOT_FILE);
}

function writeSnapshot(data) {
    return writeJson(SNAPSHOT_FILE, data);
}

export async function tryOp(op, payload) {
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

export async function loadBootData() {
  let data;
  try {
    data = await loadAllFromDb();
  } catch {
    const snap = await readSnapshot();
    return { data: snap || { records: [], companyMeta: {}, reminders: [], products: [], agents: [], categories: [] }, offline: true, queueCount: await getQueueCount() };
  }
  await writeSnapshot(data).catch(() => {});
  return { data, offline: false, queueCount: await getQueueCount() };
}

export async function syncData() {
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
    return { data, synced: queue.length, remaining: 0 };
  } catch (err) {
    return { error: 'sync-failed', message: err && err.message ? err.message : 'sync failed', remaining: await getQueueCount() };
  }
}

export async function importLeads(records) {
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

export async function resetData() {
  await reseedLeads(SEED_DATA);
  return { ok: true };
}

export async function authenticateUser(email, password) {
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