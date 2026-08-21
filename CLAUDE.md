@AGENTS.md

# porterra-lite — project map

A Persian (RTL) sales CRM: contacts/leads, a 3-stage quote workflow, per-agent
call suggestions, and reporting. Next.js 16 (App Router) + MySQL, no ORM (raw
`mysql2` + hand-written SQL in `src/lib/queries.js`). Visually synced 1:1 with
a sister Laravel/Filament app, `BMS-CM`.

## Read these first, in order

1. **`README.md`** — setup: clone → DB → first user → `npm run dev`.
2. **This section** — architecture, then the doc map below tells you exactly
   which file governs which part of the codebase. Don't guess a convention —
   every directory that needs one has a `CLAUDE.md`.
3. Whatever `CLAUDE.md`/`README.md` governs the file you're about to touch
   (see the map below) — read it *before* editing, not after.

## Architecture (top to bottom)

```
Components (src/components/**)
    ↓ read via useScopedData / call plain functions
src/lib/*.js — pure business logic (store.js, filters.js, analytics.js, …)
    ↓ store.js mutations go through apiClient.js
src/app/api/**/route.js — thin REST handlers (auth → validate → delegate)
    ↓
src/lib/serverOps.js / queries.js — orchestration + SQL, offline queue/snapshot
    ↓
MySQL (schema: db/schema.sql)
```

Two invariants that override any "looks about right" instinct:

- **Business logic is a direct port of `public/panel_mostaqel_moshtarian.html`**
  (the original working prototype). If you're changing anything in `src/lib/`,
  find the equivalent function there first — see `src/lib/CLAUDE.md`.
- **Visuals are a 1:1 sync with `BMS-CM`** (`D:\DEV-ENV\BMS-CM`, sister app,
  same brand). Never invent a color/radius/shadow — every token is ported from
  BMS-CM's real CSS. See `src/app/CLAUDE.md`.

## Doc map

| File | Covers |
|---|---|
| `README.md` | Setup, env vars, project overview, deployment pointer. |
| `db/README.md` + `db/schema.sql` | Full current-state DB schema, Docker Compose bootstrap, first-user creation, and the categories/`category_id` migration history. |
| `SERVER_CONFIG.md` | Production deployment (Chabokan) — separate from local/dev DB. |
| `src/lib/CLAUDE.md` | Every business-logic file, one section each — the authoritative "what does this function do and why" reference. |
| `src/app/CLAUDE.md` | Route map (URL → feature/component) + the full UI/UX visual-design-system contract. |
| `src/app/api/CLAUDE.md` | REST route table — method, auth level, purpose per endpoint. |
| `src/components/CLAUDE.md` | Component folder organization + shared-component rules (`Modal.jsx`, `Icon.jsx`). |
| `public/panel_mostaqel_moshtarian.html` | The original prototype — ground truth for business behavior, especially the quote workflow. |
| `db/README.md`'s "Running the integration test suite" section | Unit tests (`npm test`) vs. the real-MySQL integration suite (`npm run test:integration`) — Docker Compose setup, `.env.test`, and the truncate-before-every-test caveat. |

If you add a new top-level convention (a new shared pattern, a new table, a
new route group), update the relevant doc in this map rather than leaving it
undocumented — that's the whole point of this map staying accurate.
