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

If you add a new top-level convention (a new shared pattern, a new table, a
new route group), update the relevant doc in this map rather than leaving it
undocumented — that's the whole point of this map staying accurate.

## SSO receiver

`POST /sso/receive` (`src/app/sso/receive/route.js`) logs a Fateh user in from a
signed assertion; token logic lives in `src/lib/ssoToken.js` (byte-identical copy
of the AI project's `utils/ssoToken.js` — change both or neither).

- **Env:** `SSO_TENANT` (Fateh tenant name), `SSO_AUDIENCE`, `SSO_PUBLIC_KEYS` (comma-separated),
  `SSO_ORIGIN` (comma-separated origins, each trimmed and trailing-slash stripped; parsed by `ssoOrigins()` in `src/lib/crypto.js`).
  Any missing/empty = receiver disabled (generic 403, reason `config`).
  Production dashboard example: `SSO_ORIGIN=https://team.bmsflow.org`.
- **Testing from a local Fateh:** add its public key to `SSO_PUBLIC_KEYS` (comma list) and its origin to `SSO_ORIGIN`
  (e.g. `https://team.bmsflow.org,http://127.0.0.1:8000`), then remove both afterwards.
- **Framing in Fateh's pinned pane:** the host adds `X-Frame-Options: SAMEORIGIN`, which makes the browser say «refused to connect» inside the pane. `src/proxy.js` therefore sets `Content-Security-Policy: frame-ancestors 'self' <origins>` on every response, with the origins read at runtime from `SSO_ORIGIN` (comma-separated, e.g. `https://team.bmsflow.org,http://127.0.0.1:8000`; only `'self'` when empty); browsers ignore `X-Frame-Options` when `frame-ancestors` is present. The `Origin` check below accepts the same list.
- **Order:** rate limit (20/min per last `x-forwarded-for` hop, in-memory Map,
  429 page) → config → exact `Origin` header match against `SSO_ORIGIN` (login-CSRF
  defence, reason `origin`) → form parse → token verify → replay check (`jti`
  Map, single instance only) → user lookup.
- **Match:** by normalized email only; inactive or ambiguous = denied.
- **Success is two steps:** the POST verifies everything, stores a one-time
  random code (in-memory Map, 30 s, single instance) and answers 303 to
  `GET /sso/receive?c=<code>` WITHOUT any cookie; the GET consumes the code,
  loads the user, calls `createSession` and answers 303 to `safeNext(next)`.
  Reason: Chrome drops a `SameSite=Lax` cookie set by the response to a
  cross-site form POST (unsafe method), so the user landed on `/login`; a GET
  navigation may set it. Do not move `createSession` back into the POST.

## Agentic pipeline policy

- **Read skills first, always.** On the very first turn of every session, before any
  reply or tool call, read and internalize
  `.claude/skills/code-reviewer/SKILL.md` and
  `.claude/skills/nextjs-performance/SKILL.md`, then summarize their key rules in
  your own words. Hard prerequisite — only after the summary may you start work.
- **Subagent review mode (since 2026-08-30).** `FATEH_REVIEW_MODE='subagent'` in
  `~/.claude/pipelines/models.ps1` is the pipeline default:
  `.claude/hooks/post_tool_review.php` is INERT in every session — it only tracks
  edit state for the Stop hook. After a coherent unit of work, spawn a FRESH
  `claude-reviewer` subagent via the `Agent` tool (no model override — inherits
  the driving model; correctness/security + performance/pattern lenses); safe
  fixes are applied by the session or a coder subagent, never by the reviewer.
  Trivial-lane single-file edits are the only exception.
- **API only for enrichment + end-stage review.** No API call for coding,
  delivery, unit review, or fixes. API survives in exactly two places: plan
  enrichment (`FATEH_PLAN_MODEL`, plus the OpenAI refiner `FATEH_MAX_MODEL` on
  max) and the end-stage dual review (`FATEH_REVIEWER_MODEL_A` +
  `FATEH_REVIEWER_MODEL_B`, one round per stage, findings fixed by the Lead).
- **Three delegation lanes** — the session is the Lead; planning,
  architecture, and review decisions are never delegated. **Trivial** (one file, few
  lines): do it directly, no delegation or subagent review. **Standard**: optional
  `claude-planner` enrichment, mechanical slices to `claude-coder` (parallel only
  across file-disjoint slices), closed by a `claude-reviewer` pass. **Complex**
  (schema/auth/destructive/multi-module): planner enrichment required, then ask
  whether to refine via the OpenAI refiner (skip if the user already said "max"),
  then as standard.
- **End-stage doc sweep only.** Never update docs/legend/guides/tests after every
  edit; all documentation work happens once, in a single consolidated sweep right
  before declaring the work done (a Stop hook enforces it from the session's real
  edits). Erase temp/probe files the same turn you create them.
- **Vanilla mode.** Saying `vanilla mode` drops all the policies above for the
  session; they resume on `resume project mode` or a new session.
