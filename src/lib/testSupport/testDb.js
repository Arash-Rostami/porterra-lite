import { getPool } from '../db.js';

const SEED_CATEGORIES = [
  { id: 'CAT-chempoly', name: 'Chemical/Polymer' },
  { id: 'CAT-solar', name: 'Solar' },
];

export async function resetTestDb() {
  const pool = getPool();
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  await pool.query('TRUNCATE TABLE `contacts`');
  await pool.query('TRUNCATE TABLE `customer_activity`');
  await pool.query('TRUNCATE TABLE `reminders`');
  await pool.query('TRUNCATE TABLE `products`');
  await pool.query('TRUNCATE TABLE `users`');
  await pool.query('TRUNCATE TABLE `categories`');
  await pool.query('SET FOREIGN_KEY_CHECKS=1');
  for (const c of SEED_CATEGORIES) {
    await pool.query(
      'INSERT INTO `categories` (`id`,`name`,`is_custom`,`created_at`) VALUES (?,?,0,?)',
      [c.id, c.name, Date.now()]
    );
  }
}

export async function closeTestDb() {
  await getPool().end();
}
