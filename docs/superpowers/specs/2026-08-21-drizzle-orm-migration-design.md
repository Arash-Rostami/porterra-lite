# Drizzle ORM migration — design

## Why

`src/lib/queries.js`/`mappers.js` are hand-written raw `mysql2` SQL. The app
is not yet live, which is the cheapest point to introduce schema-as-code and
a typed query layer without a production-data migration risk. This document
scopes a like-for-like swap to Drizzle: same stored formats, same observable
behavior, only the data-access implementation changes.

## Non-goals

- No schema cleanup. `dd.mm.yyyy` VARCHAR dates, the legacy free-text
  `category` column kept write-synced alongside `category_id`, and the
  upsert-by-VARCHAR-PK model all stay exactly as they are today. (Documented
  as intentional in the `leads-contacts`, `products-catalog`, and
  `categories` OpenSpec baselines — none of those requirements change.)
- No change to `models.js` (Zod validation), `src/lib/` business logic,
  `serverOps.js` orchestration, or any API route's external behavior.
- No change to the offline queue/snapshot mechanics beyond swapping the
  transaction primitive underneath `applyOp`.

## Decision: ORM

**Drizzle**, not Prisma. This is a plain JS project (no TypeScript), so
type-safety — Prisma's headline benefit — is a smaller factor. Drizzle sits
directly on top of the existing `mysql2` pool (`db.js`), has a first-class
raw-`sql` escape hatch for the patterns this app relies on (partial-patch
`SET`-only-present-keys updates, `ON DUPLICATE KEY UPDATE` upserts, the
category-name write-sync subquery, transactional queue replay), and
`drizzle-kit` generates migrations from a schema-as-code file without a
separate query engine/runtime the way Prisma requires.

## Decision: schema ownership

The Drizzle schema becomes the source of truth going forward;
`db/schema.sql` becomes generated/derived output (or is regenerated from the
Drizzle schema and diffed against the current file to confirm equivalence,
then kept in sync). This is a one-time cutover, appropriate now specifically
*because* the app isn't live — this is the last point where "swap the schema
representation" carries no data-migration risk.

## Sequencing

### 0. Pre-refactor safety net (on `main`, before branching)

Two test passes against the *current* raw-SQL implementation, so there is a
real regression check to run the Drizzle rewrite against:

- Unit tests for the remaining pure `src/lib` modules not yet covered:
  `analytics.js`, `suggestions.js`, `duplicates.js`, `calendar.js`,
  `models.js` (including the Zod `.superRefine`/`.refine` conditional-
  required rules for `deactivateReason` and `failReason`).
- Integration tests for `queries.js`'s current CRUD
  (`listX`/`getXById`/`createX`/`updateX`/`deleteX` per table) against the
  Docker Compose MySQL instance documented in `db/README.md`. These are
  characterization tests: they pin down *actual current behavior*
  (including the upsert semantics, partial-patch behavior, and the
  category-name write-sync) so the Drizzle rewrite can be diffed against
  them table-by-table.

Both passes must be green on `main` before branching.

### 1. Branch

Create `refactor/drizzle-orm` off `main`. All ORM work happens there; nothing
lands on `main` until the swap is complete and green.

### 2. Schema-first

Define all 6 tables (`categories`, `contacts`, `customer_activity`,
`products`, `reminders`, `users`) in a Drizzle schema file. Generate a
migration via `drizzle-kit` and diff the resulting DDL against
`db/schema.sql` to confirm equivalence — same columns, types, FKs (including
`ON DELETE RESTRICT` on both `category_id` FKs), and unique constraints
(`categories.name`, `products.name`). `db.js`'s existing `mysql2` pool
becomes the connection Drizzle's mysql2 driver wraps; no new connection
config.

### 3. Table-by-table query migration

Order (simplest/lowest-risk first, busiest/most complex last):

1. `categories`
2. `products`
3. `reminders`
4. `users`
5. `customer_activity`
6. `contacts` (carries the 8 quote/deactivation columns and the busiest call
   sites — migrated last, once the pattern is proven on 5 simpler tables)

Per table:
- Port `listX`/`getXById`/`createX`/`updateX`/`deleteX` to Drizzle.
- Use Drizzle's raw `sql` template for anything its query builder doesn't
  naturally express: the upsert (`ON DUPLICATE KEY UPDATE`), the
  category-name write-sync subquery (`CATEGORY_NAME_SUBQUERY`), and
  partial-patch updates that only `SET` present keys.
- Keep `mappers.js`'s row→object output shape byte-identical so nothing
  upstream (business logic, API routes) needs to change.
- Run that table's integration tests (ported from step 0's characterization
  tests) before moving to the next table.

### 4. Transactions

`withTransaction`/`applyOp`'s offline-queue-replay transaction moves to
Drizzle's `db.transaction(...)`, preserving the same all-or-nothing replay
semantics (`syncData` in `serverOps.js`).

### 5. Cutover

Once all 6 tables are migrated and their integration tests are green,
remove the old raw-SQL functions from `queries.js` (or delete the file if
nothing raw remains) and any now-unused raw pool export from `db.js`.

## Error handling

No change to the error contract: `apiHandler.js`'s `UNAUTHORIZED`/
`FORBIDDEN`/`VALIDATION`→ status-code mapping stays as-is. The one thing to
verify per table: MySQL constraint violations (`ER_DUP_ENTRY` on
`products.name`/`categories.name`, the `ON DELETE RESTRICT` FK violation on
category deletion) must still surface through Drizzle in a form the existing
`translate to VALIDATION/400` logic can catch — confirmed via the
integration tests, not assumed.

## Testing strategy during migration

- Step 0's integration tests are the baseline; each migrated table's tests
  are the same assertions run against the Drizzle implementation.
- No new test framework decisions needed — Vitest is already wired up
  (`vitest.config.js`), integration tests just need a `beforeAll`/`afterAll`
  that points at the Docker Compose DB and resets it between runs.
- `filters.test.js` (already on `main`) is unaffected — it tests pure logic
  with no DB dependency.

## Out of scope / explicitly deferred

- Any schema shape change (dates, legacy category column) — see Non-goals.
- Migrating `src/data/seed.js` (the legacy admin-reset seed) to the new
  schema representation — it already produces `NULL category_id` today and
  that's documented as acceptable in the `admin-data-reset` OpenSpec
  baseline; no change needed for this migration specifically.
