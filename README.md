# porterra-lite

A Persian-language (RTL) sales CRM for a small team of coordinators: tracks
leads/contacts, runs a 3-stage price-quote workflow, suggests who to call
today, and builds reports. Built on Next.js 16 (App Router) with a MySQL
backend — no ORM, no third-party auth provider, no external SaaS
dependencies.

## Tech stack

- **Next.js 16** (App Router, Turbopack, React Compiler) + **React 19**
- **MySQL 8** via `mysql2`, raw SQL (`src/lib/queries.js`) — no ORM
- **Zod** for server-side request validation
- Custom CSS design system (`src/app/globals.css`), no component library —
  synced 1:1 with a sister app's visual language, see `src/app/CLAUDE.md`
- `xlsx` for Excel import/export, `chart.js` for dashboard charts
- Auth: httpOnly session cookie, AES-256-GCM encrypted (reversible, not
  hashed — see `src/lib/crypto.js`) — no third-party auth

## Prerequisites

- Node.js ≥ 20
- Docker (for the DB — see below), or your own MySQL 8+ instance

## Quick start

```bash
git clone <repo-url>
cd porterra-lite
npm install

# 1. Start the database (MySQL 8, schema auto-applied on first start)
docker compose up -d

# 2. Configure your local env
cp .env.local.example .env.local
# then set a real ENCRYPTION_KEY — see the comment inside that file

# 3. Create your first login
npm run db:create-user -- --email you@example.com --password ChangeMe123 --displayName "Your Name" --role admin

# 4. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the
account you just created. See `db/README.md` for details on the schema,
resetting the DB, or applying it to a non-Docker MySQL instance.

## Environment variables

All local dev config lives in `.env.local` (gitignored — copy it from
`.env.local.example`, never commit real values).

| Variable | Purpose |
|---|---|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | DB connection (`src/lib/db.js`). Defaults in `.env.local.example` match `docker-compose.yml` exactly. |
| `ENCRYPTION_KEY` | Base64, 32 bytes. AES-256-GCM key for password storage + session cookies. Generate your own: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Never share or commit this** — combined with DB access it decrypts every stored password. |
| `MYSQL_SSL` | Production only — leave blank for local/Docker. See `SERVER_CONFIG.md`. |

Production env vars (Chabokan deployment) are documented separately in
`SERVER_CONFIG.md` — set in the hosting dashboard, never in a file.

## Project structure

```
src/app/            Routes (App Router) — see src/app/CLAUDE.md for the route map
src/app/api/         REST API route handlers — see src/app/api/CLAUDE.md
src/components/      React components, one folder per feature — see src/components/CLAUDE.md
src/lib/             Business logic, DB access, auth — see src/lib/CLAUDE.md
src/proxy.js         Edge auth guard (redirects unauthenticated requests to /login)
db/                  Schema (schema.sql) + setup docs — see db/README.md
scripts/             CLI tooling (create-user.mjs)
public/              Static assets + the original prototype (panel_mostaqel_moshtarian.html)
```

## Docs map

Every directory that has its own conventions has a `CLAUDE.md` documenting
them — read the one for whatever you're about to touch. Full index and
architecture overview: **`CLAUDE.md`** (repo root) — that's the intended
entry point for a human or an AI agent picking up this codebase for the
first time.

| Doc | Covers |
|---|---|
| `CLAUDE.md` | Architecture overview + full doc index. **Start here.** |
| `db/README.md` | DB schema, Docker setup, resetting, first-user creation, migration history. |
| `SERVER_CONFIG.md` | Production deployment (Chabokan). |
| `src/lib/CLAUDE.md` | Business logic, file by file. |
| `src/app/CLAUDE.md` | Route map + the full UI/UX visual design system. |
| `src/app/api/CLAUDE.md` | REST route table (method, auth, purpose). |
| `src/components/CLAUDE.md` | Component organization + shared-component rules. |

## Deployment

Production runs on Chabokan (a separate MySQL instance from your local dev
DB) — see `SERVER_CONFIG.md` for the full deploy flow, environment variables,
and known gotchas.

## Handing this off

If you're cloning/forking this repo for someone else: everything sensitive
(`.env.local`, the offline-cache snapshot in `.porterra/`, local Claude Code
credentials in `.claude/tmp/`) is already gitignored and never leaves a
normal `git clone`/`git push`/`git archive`. No real business data or real
credentials ship with the source — a fresh clone starts from an empty schema
(`db/schema.sql`) and you create your own login with `db:create-user`.
