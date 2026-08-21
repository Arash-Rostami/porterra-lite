import { getPool } from '../db.js';

// These ids and the 'Chemical/Polymer' name are depended on by name across
// contacts.integration.test.js, products.integration.test.js, and
// categories.integration.test.js — changing them here silently breaks those fixtures.
const SEED_CATEGORIES = [
  { id: 'CAT-chempoly', name: 'Chemical/Polymer' },
  { id: 'CAT-solar', name: 'Solar' },
];

export async function resetTestDb() {
  const pool = getPool();
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  // Keep this table list in sync with db/schema.sql — a new table added there needs a
  // TRUNCATE line here too, or it will leak state across tests.
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
