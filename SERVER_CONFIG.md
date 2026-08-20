# Server config — Chabokan (Next.js)

Deployment reference for `porterra-lite` on Chabokan's "next" platform.

## Platform & service
- Chabokan **"next"** service, name `porterra-lite`.
- Chabokan builds with the project's own `next@16.3.0` (Turbopack): `npm ci` → `next build` → `next start`. Node ≥20 (see `engines.node` in `package.json`).
- `proxy.js` is recognized as "Proxy (Middleware)" — edge auth redirect works.
- Plan: **پایه** (0.5 GB RAM / 0.5 CPU) is enough for <10 users (the DB lives on a separate 4 GB / 2 CPU container). Bump to **برنز** (1 GB) only on OOM during `.xlsx` import or build.

## Deploy flow (the one that works)

```
chabok deploy
chabok service restart -s porterra-lite
chabok service logs -s porterra-lite
```

Run from the project root. (You can also restart from the Chabokan dashboard instead of the CLI.)

**Gotcha:** the first restart right after a deploy can catch a half-placed state and build Chabokan's default scaffold (`app@0.1.0`, `Next.js 13.5.4`, only `/` + `/_not-found`). If you see that, restart once more — the real app builds as `porterra-lite@0.1.0` / `Next.js 16.3.0` with all routes (`/dashboard`, `/contacts`, `/agents`, `/api/*`, …).

```
chabok service restart -s porterra-lite
chabok service logs -s porterra-lite
```

## next.config.mjs
- **Do NOT set `output: 'standalone'`.** Chabokan runs `next start`; with standalone it warns `"next start" does not work with "output: standalone"` and won't serve. Leave it off.
- `reactCompiler: true` is fine (builds cleanly on 16.3.0).

## Environment variables (dashboard → Variables)
Set in the Chabokan dashboard, never in files. Applied at container start — **restart after changing them.**
- `MYSQL_HOST` — cloud MySQL host (Chabokan-internal address if the DB is on Chabokan; external address otherwise)
- `MYSQL_PORT` — `3306`
- `MYSQL_USER` — DB user
- `MYSQL_PASSWORD` — DB password
- `MYSQL_DATABASE` — `porterra-lite`
- `ENCRYPTION_KEY` — **must equal the local `.env.local` value exactly** (44-char base64, 32 bytes). Decrypts the migrated `users.passwordCipher` rows and the session cookies. Mismatched or empty = every login fails with "ایمیل یا گذرواژه نادرست است".
- `MYSQL_SSL` — leave blank (Chabokan-internal DB); set `1` only if the MySQL is external and requires TLS (`accept` = TLS without cert verify).

## Verifying it's live
- Open the URL → log in. A successful login decrypts a real password row, so it confirms DB + `ENCRYPTION_KEY` are correct.
- "Incorrect email/password" on a known-good account = `ENCRYPTION_KEY` not picked up → set it in the dashboard and restart.
- After a failed login, `chabok service logs -s porterra-lite`: no error lines = key mismatch; a DB error (`ECONNREFUSED` / `ER_ACCESS_DENIED` / `PROTOCOL_CONNECTION_LOST`) = a `MYSQL_*` problem.

## What uploads / what stays local
- `.gitignore` keeps `node_modules`, `.next`, `.env*`, `.porterra`, `.claude/tmp` off the server. Only source goes up — no secrets in files.
- `.porterra/` (offline queue + snapshot) is runtime state. Chabokan "next" FS may reset on redeploy; for <10 users on a reliable cloud DB, best-effort offline is fine (the queue only fills when the DB is unreachable, which is rare).

## DB schema — categories table
A `categories` lookup table (id VARCHAR(40) PK, name UNIQUE, is_custom TINYINT, created_at BIGINT)
was added with 2 seeded base categories (CAT-chempoly = "Chemical/Polymer", CAT-solar = "Solar").
`products.category_id` and `contacts.category_id` are FK → `categories(id)` `ON DELETE RESTRICT`.
The legacy free-text `category` column on products/contacts is deliberately retained (never
dropped) and is write-synced from `category_id` on every save, for legacy/external consumers
that still read it directly. Full migration history: `db/README.md`'s "Migration history" section.

## CLI quick reference
- `chabok login` — sign in
- `chabok deploy` — upload + deploy
- `chabok service restart -s porterra-lite` — rebuild + restart
- `chabok service logs -s porterra-lite` — runtime logs (build logs are in the dashboard, not the CLI)
- `chabok service stop` / `chabok service start` `-s porterra-lite` — stop / start