import mysql from 'mysql2/promise';

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

let _pool = null;
export function getPool() {
  if (!_pool) _pool = mysql.createPool(cfg);
  return _pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

export async function withTransaction(fn) {
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

export function isConnError(err) {
  if (!err) return false;
  if (CONN_ERR.has(err.code) || CONN_ERR.has(err.errno)) return true;
  return typeof err.code === 'string' && (err.code.startsWith('PROTOCOL') || err.code.startsWith('ECONN'));
}