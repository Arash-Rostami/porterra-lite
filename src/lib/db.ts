import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';

const port = (() => {
  const p = Number(process.env.MYSQL_PORT);
  return Number.isFinite(p) && p > 0 ? p : 3306;
})();

const ssl = process.env.MYSQL_SSL ? (process.env.MYSQL_SSL === 'accept' ? {} : { rejectUnauthorized: true }) : undefined;
const cfg = {
  host: process.env.MYSQL_HOST || 'localhost',
  port,
  ssl,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'porterra-lite',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
};

let _pool: Pool | null = null;
export function getPool(): Pool {
  if (!_pool) _pool = mysql.createPool(cfg);
  return _pool;
}

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* rollback already failed; nothing to do */ }
    throw err;
  } finally {
    conn.release();
  }
}

const CONN_ERR = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET', 'EPIPE',
  'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_CON_COUNT_ERROR',
  'ER_DBACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR',
]);

export function isConnError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; errno?: unknown };
  if (CONN_ERR.has(e.code as string) || CONN_ERR.has(e.errno as string)) return true;
  return typeof e.code === 'string' && (e.code.startsWith('PROTOCOL') || e.code.startsWith('ECONN'));
}
