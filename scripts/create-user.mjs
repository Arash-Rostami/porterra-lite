#!/usr/bin/env node
// Creates a login for a fresh database. Reuses the app's own encryption
// (src/lib/crypto.js) and DB pool (src/lib/db.js) — no duplicated logic, no
// plaintext password ever touches SQL. Run with env vars loaded, e.g.:
//
//   node --env-file=.env.local scripts/create-user.mjs \
//     --email admin@example.com --password ChangeMe123 \
//     --displayName "Admin" --role admin
//
// Flags: --email (required) --password (required) --displayName --role
// (admin|agent|manager|developer, default admin) --username (defaults to the
// email's local part) --agentCode --department

import { query, getPool } from '../src/lib/db.js';
import { encryptString } from '../src/lib/crypto.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

const ROLES = ['admin', 'agent', 'manager', 'developer'];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email || !args.password) {
    console.error('Usage: node --env-file=.env.local scripts/create-user.mjs --email <email> --password <password> [--displayName <name>] [--role admin|agent|manager|developer] [--username <username>] [--agentCode <code>] [--department <name>]');
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is not set — did you forget --env-file=.env.local?');
    process.exit(1);
  }
  const role = args.role || 'admin';
  if (!ROLES.includes(role)) {
    console.error(`--role must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }

  const username = args.username || String(args.email).split('@')[0];

  const existing = await query('SELECT id FROM `users` WHERE `username`=? OR `email`=? LIMIT 1', [username, args.email]);
  if (existing.length) {
    console.error(`A user with username "${username}" or email "${args.email}" already exists.`);
    process.exit(1);
  }

  const row = {
    id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    username,
    email: args.email,
    display_name: args.displayName || username,
    agent_code: args.agentCode || null,
    department: args.department || null,
    password_cipher: encryptString(args.password),
    role,
    active: 1,
    last_login: null,
    created_at: Date.now(),
  };

  await query(
    'INSERT INTO `users` (`id`,`username`,`email`,`display_name`,`agent_code`,`department`,`password_cipher`,`role`,`active`,`last_login`,`created_at`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [row.id, row.username, row.email, row.display_name, row.agent_code, row.department, row.password_cipher, row.role, row.active, row.last_login, row.created_at]
  );

  console.log(`Created ${role} user "${row.display_name}" — log in with email "${row.email}" at /login.`);
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
