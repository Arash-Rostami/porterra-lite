# Database setup

`schema.sql` in this folder is the **current-state source of truth** for the
`porterra-lite` MySQL schema — 6 tables (`categories`, `contacts`,
`customer_activity`, `products`, `reminders`, `users`), generated from
`SHOW CREATE TABLE` against the real running app, not hand-written. Column
names, business logic per table, and per-file conventions are documented in
`../src/lib/CLAUDE.md` (the `queries.js`/`mappers.js`/`models.js` section).

## Quickest path: Docker Compose

From the repo root:

```bash
docker compose up -d
```

This starts MySQL 8, creates the `porterra-lite` database, and — **the first
time the container's data volume is created** — automatically runs
`schema.sql` (MySQL's official image runs anything in
`/docker-entrypoint-initdb.d/` on first init only). Nothing else to do; the
default `.env.local.example` values already match this container's
host/port/user/password/database.

Check it came up healthy:

```bash
docker compose ps
docker compose logs db --tail 50
```

**Reset to a clean schema** (drops all data, re-runs `schema.sql` from
scratch):

```bash
docker compose down -v
docker compose up -d
```

## Applying `schema.sql` to an existing MySQL server instead

If you already have MySQL 8+ running (local install, cloud DB, phpMyAdmin),
just run the file against it:

```bash
mysql -h <host> -P <port> -u <user> -p < db/schema.sql
```

or via phpMyAdmin: create/select the `porterra-lite` database → Import →
select `schema.sql` → Go. The file is written to be safe to run against an
empty database in one pass (`CREATE DATABASE IF NOT EXISTS`, `CREATE TABLE IF
NOT EXISTS`). Re-running it against an **already-migrated** database will
error on the two `ALTER TABLE ... ADD CONSTRAINT` statements near the bottom
("Duplicate foreign key constraint name") — that's expected; skip that block
if you hit it.

## Creating your first login

There's no signup page — passwords are AES-256-GCM encrypted (reversible, not
hashed; see `../src/lib/crypto.js`) rather than stored via a normal
hash+signup flow, so a fresh database has zero users. Create one with:

```bash
npm run db:create-user -- --email you@example.com --password ChangeMe123 --displayName "Your Name" --role admin
```

This reuses the app's real `encryptString` — no separate crypto
implementation to keep in sync. See `--help`-style usage by running it with
no args. `role` is one of `admin` / `agent` / `manager` / `developer` (see
`../src/lib/CLAUDE.md`'s `users` section for what each can see/do).

## What's seeded vs. what isn't

`schema.sql` seeds only the 2 base categories (`Chemical/Polymer`, `Solar`) —
the canonical baseline (see "Migration history" below). No sample
contacts/leads, no sample products, no users ship with this repo; real
business data never leaves the original environment. Once you have a login,
use the app's own `.xlsx` import (Leads page → Import) if you want to load
sample volume for testing.

## Migration history: `categories` / `category_id`

The `categories` table and the `category_id` FKs on `products`/`contacts` in
`schema.sql` were added after the rest of the schema already existed, via a
manual production migration (phpMyAdmin, run section-by-section). The legacy
free-text `category` column on both tables was **deliberately retained**
(not dropped) as a dormant audit field — the app write-syncs it from
`category_id` on every save for any external/legacy consumer that still
reads it directly, but never reads it itself. `schema.sql` already reflects
the fully-migrated state, so this is historical context, not a step you need
to run again.

**Rollback** (only if you ever need to undo the FK/`category_id` addition on
an existing DB — lossless, since `category` was never dropped):

```sql
ALTER TABLE products  DROP FOREIGN KEY fk_products_category;
ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_category;
ALTER TABLE products  DROP COLUMN category_id;
ALTER TABLE contacts DROP COLUMN category_id;
-- categories table itself: DROP TABLE categories; (optional)
```

## Related docs

- `../SERVER_CONFIG.md` — production DB is a separate Chabokan-hosted MySQL
  instance; this folder only concerns local/dev setup.

## Running the integration test suite

`npm run test:integration` runs `queries.js`'s CRUD functions against a real
MySQL instance — the same Docker Compose database from the Quickest path
section above. Steps:

1. `docker compose up -d` (if not already running).
2. `cp .env.test.example .env.test` and adjust credentials if your compose
   setup differs from the defaults.
3. `npm run test:integration`

Every test file resets the database (via `src/lib/testSupport/testDb.js`)
before each test — do not point `.env.test` at a database with data you
care about.
