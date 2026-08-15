# Category Migration — `porterra-lite`

Adds a normalized `category_id` FK on `products` and `contacts` into a new
`categories` table, alongside the existing free-text `category` column (which
is retained as a dormant legacy field — see §7). Run in phpMyAdmin against the
`porterra-lite` database (select it in the left sidebar first).

> ⚠️ **Run each section in order. Do NOT split a section's statements apart.**
> The ALTER and backfill for each table live in ONE block — run the whole block.
> If you get `Unknown column 'category_id'`, the ALTER didn't run: re-run that
> table's whole block.
>
> ⚠️ هر بخش را به‌ترتیب اجرا کن. ALTER و backfill هر جدول در یک بلوک با هم هست —
> آن‌ها را از هم جدا نکن. اگر خطای `Unknown column 'category_id'` گرفتی، یعنی
> ALTER اجرا نشده: بلوک آن جدول را دوباره اجرا کن.

**Normalization mapping** (applied to `contacts.category` during backfill):
- `Chemical/Polymer`, `Polymer`, `Petrochemical`, `Chemical` → `CAT-chempoly`
- `Solar` → `CAT-solar`
- `NULL` → stays `NULL`

`products` backfill is direct: `Chemical/Polymer` → `CAT-chempoly`, `Solar` → `CAT-solar`.

**This migration is NON-DESTRUCTIVE** — the legacy free-text `category` column on
`products` and `contacts` is **intentionally RETAINED** as a dormant legacy/audit
field. The app no longer reads or writes it (it uses `category_id` exclusively);
the old column keeps its existing values and is left untouched going forward.
**Do not drop it.** (Backing up first is still good practice: phpMyAdmin → select
DB → Export → Custom → SQL → Go.)

**Run order**: §1–§6 are the whole migration; §5 is a verification pause (eyeball
the counts before adding the FKs in §6). **§7 is intentionally NOT run** — it is
documented only as a future option, never part of this migration. **Run §1–§6
before deploying the matching app code** that expects `category_id`.

---

## 1. Create the `categories` table

```sql
-- New lookup table. Re-running after success errors with
-- "Table already exists" (MySQL) / "Table 'categories' already exists" (MariaDB)
-- — that's expected, skip this block.
CREATE TABLE categories (
  id         VARCHAR(40)  NOT NULL,
  name       VARCHAR(150) NOT NULL,
  is_custom  TINYINT      NOT NULL DEFAULT 1,
  created_at BIGINT       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 2. Seed the 2 base categories

```sql
-- Idempotent: safe to re-run (ON DUPLICATE KEY UPDATE is a no-op here).
INSERT INTO categories (id, name, is_custom, created_at) VALUES
  ('CAT-chempoly', 'Chemical/Polymer', 0, UNIX_TIMESTAMP(NOW()) * 1000),
  ('CAT-solar',    'Solar',           0, UNIX_TIMESTAMP(NOW()) * 1000)
ON DUPLICATE KEY UPDATE name = name;
```

## 3. PRODUCTS — add `category_id` and backfill it (run together)

```sql
-- ⚠️ Run this WHOLE block. The ALTER adds the column; the UPDATE fills it.
-- If the ALTER errors "Duplicate column name 'category_id'" because the column
-- already exists from a prior partial run, that's fine — the UPDATE after it
-- still runs and is idempotent (SET is safe to re-run).
-- NOTE: phpMyAdmin stops a multi-statement block at the first error UNLESS
-- "Continue on error" is enabled (the SQL tab checkbox / "Ignore errors" toggle).
-- So either tick that, OR if the ALTER errored just re-run the UPDATE line alone.
ALTER TABLE products
  ADD COLUMN category_id VARCHAR(40) NULL AFTER category;

-- Direct mapping; only 2 source values exist. Safe to re-run (idempotent SET).
UPDATE products
  SET category_id = CASE category
    WHEN 'Chemical/Polymer' THEN 'CAT-chempoly'
    WHEN 'Solar'            THEN 'CAT-solar'
  END
  WHERE category IS NOT NULL;
```

## 4. CONTACTS — add `category_id` and backfill it (run together)

```sql
-- ⚠️ Run this WHOLE block. The ALTER adds the column; the UPDATE fills it.
-- If the ALTER errors "Duplicate column name 'category_id'" because the column
-- already exists from a prior partial run, that's fine — the UPDATE after it
-- still runs and is idempotent (SET is safe to re-run).
-- NOTE: phpMyAdmin stops a multi-statement block at the first error UNLESS
-- "Continue on error" is enabled (the SQL tab checkbox / "Ignore errors" toggle).
-- So either tick that, OR if the ALTER errored just re-run the UPDATE line alone.
ALTER TABLE contacts
  ADD COLUMN category_id VARCHAR(40) NULL AFTER category;

-- Normalization mapping: legacy noise values merge into the 2 canonical IDs.
-- NULL category stays NULL (filtered out by WHERE). Safe to re-run.
UPDATE contacts
  SET category_id = CASE category
    WHEN 'Chemical/Polymer' THEN 'CAT-chempoly'
    WHEN 'Polymer'          THEN 'CAT-chempoly'
    WHEN 'Petrochemical'    THEN 'CAT-chempoly'
    WHEN 'Chemical'         THEN 'CAT-chempoly'
    WHEN 'Solar'            THEN 'CAT-solar'
  END
  WHERE category IS NOT NULL;
```

## 5. Verify before adding FKs / dropping the old column

```sql
-- NON-DESTRUCTIVE. Run these and eyeball the counts before §6 and §7.
-- Expected: contacts NULL count = 20  (the 20 originally-NULL rows)
SELECT COUNT(*) AS contacts_null_count FROM contacts WHERE category_id IS NULL;
-- Expected: products NULL count = 0   (all 19 rows had a valid category)
SELECT COUNT(*) AS products_null_count FROM products WHERE category_id IS NULL;

-- Expected split:
--   CAT-chempoly = 1169
--   CAT-solar    = 258
--   NULL         = 20
SELECT category_id, COUNT(*) AS cnt FROM contacts GROUP BY category_id;
-- Expected split:
--   CAT-chempoly = 18
--   CAT-solar    = 1
SELECT category_id, COUNT(*) AS cnt FROM products GROUP BY category_id;
```

## 6. Add the foreign keys

```sql
-- Every non-NULL category_id now references an existing categories.id, so the
-- FK can be created. Re-running after success errors with
-- "Duplicate foreign key constraint name" / "Cannot add foreign key constraint"
-- — that's expected, skip this block.
ALTER TABLE products
  ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT;

ALTER TABLE contacts
  ADD CONSTRAINT fk_contacts_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT;
```

## 7. (NOT RUN) Drop the legacy `category` columns — intentionally retained

> ⛔ **Do NOT run this.** The legacy `category` column is deliberately kept as a
> dormant legacy/audit field — it still holds the original free-text values for
> all pre-migration rows, and new rows get `NULL` there since the app never
> writes it. Dropping it would destroy historical data with no benefit; the app
> already ignores this column. This block is documented here ONLY so the option
> exists for an explicit future decision; it is not part of this migration.

```sql
-- ⛔ NOT PART OF THE MIGRATION. Do not execute unless you have an explicit,
-- future reason to destroy the legacy column. Running it permanently drops the
-- historical free-text category data.
-- ALTER TABLE products  DROP COLUMN category;
-- ALTER TABLE contacts DROP COLUMN category;
```

---

## Rollback (best-effort)

Because the legacy `category` column was **never dropped**, rollback is simple
and lossless: the original free-text values are still in place. To fully revert,
remove the FK + `category_id` columns added by this migration; `category` then
becomes the live field again.

```sql
-- 1. Drop the FK constraints added in §6.
ALTER TABLE products  DROP FOREIGN KEY fk_products_category;
ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_category;

-- 2. Drop the category_id columns added in §3/§4. The legacy `category`
--    column is untouched and still holds the original free-text values.
ALTER TABLE products  DROP COLUMN category_id;
ALTER TABLE contacts DROP COLUMN category_id;

-- 3. (Optional) Drop the categories table if you no longer need it.
-- DROP TABLE categories;
```