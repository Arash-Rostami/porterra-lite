# src/lib — business logic

Every function here is a direct port of a function in `public/panel_mostaqel_moshtarian.html`
(the original prototype). When modifying anything in this folder, find the equivalent
function in that file first and check the diff is intentional — diverging from it silently
breaks documented business rules (plain-language rules in `public/handoff_spec.md` §4).

None of these functions should touch the DOM or React — they take plain data in, return
plain data out. Components call them and render the result. Keep it that way.

## File-by-file

### `utils.js` — `Utils` static class
Date/string primitives everything else depends on: `parseDate` (parses `dd.mm.yyyy`, the
canonical date format used everywhere in this app — never `Date` objects in stored data),
`toISODate`/`fromISODate` (bridge to `<input type="date">`, which wants `yyyy-mm-dd`),
`normSpace` (trim + collapse whitespace + used as the basis for company-name matching),
`formatTs` (toggle-aware `formatTs(ts, calendar)` — renders Gregorian `dd.mm.yyyy — HH:MM` or
Jalali `DD <month> JYYY — HH:MM`, both Asia/Tehran-anchored via `Intl.DateTimeFormat` so
login/comment timestamps stay stable across server/viewer TZs),
`escapeHtml`/`escapeAttr` (unused now that React escapes by default, kept for parity —
harmless to leave, safe to delete if you're cleaning up).

### `filters.js`
- `effectiveResult(r)` — **the** status-resolution function. If `r.result` is set, use it;
  otherwise scan `r.notes` for `FAIL_NOTE_PATTERNS` ('یادم نمیاد', 'جواب نداد', 'پاسخ نداد',
  'جواب نمی', 'پاسخ نمی') and infer `'ناموفق'`; otherwise `null` ("بدون وضعیت" / no status).
  Every stat (funnel, KPIs, agent report, suggestions) reads status through this function,
  never `r.result` directly. If you add a new stat, do the same.
- `smartSearch(records, query)` — multi-token, scored, OR-across-fields search (company,
  name, phone, notes, product, category, source, coordinator-label). Not a filter — returns
  every record with `score >= 1` sorted by score. This is intentionally permissive (feels
  like "fuzzy" search) rather than an AND-all-tokens filter.
- `getFiltered(records, filters, chartFilter, sort)` — the single function the contacts
  table's row-list comes from. Order of operations matters and mirrors the original exactly:
  dropdown filters → date range → chart drill-down (`chartFilter`) → smart search → sort.
- `chartFilter` shapes: `{type:'month', y, m}`, `{type:'day', y, m, day, agent}`,
  `{type:'otherSource', topSet}`. This is a *separate* filter dimension from
  `filters.category`/`filters.source` — see the `uiStore.js` note below for the rule about
  keeping them mutually exclusive.

### `suggestions.js`
`computeSuggestions(records)` — the "who to call today" engine, grouped by agent. Algorithm
(exact order, don't reorder):
1. Reduce to **one record per customer** — the most recent by date. Older records for the
   same company are ignored entirely, even if they were never actioned.
2. Skip if `converted` or `effectiveResult === 'موفق'` (already won).
3. Skip if the latest contact date is today or in the future (`days <= 0`).
4. `noStatus = !effectiveResult` → priority rank 3 (highest), overriding `record.priority`.
5. `isNoAnswer = effectiveResult === 'ناموفق'` → always surfaced regardless of days elapsed.
6. Everything else (e.g. "در حال پیگیری") only surfaces once `days >= 3` OR priority rank 3.
`filterAgentSuggestions` applies the optional per-agent category/product/search UI filters
on top of the computed pool, and caps the visible list (6 normally, 20 while searching) —
this cap is cosmetic (`shown`), `filtered.length` (uncapped) is what's shown in the count.

### `duplicates.js`
`findDuplicateCompany` — exact match after `normSpace().toLowerCase()`. `findDuplicatePhone`
— compares the **last 8 digits** after stripping non-digits, to tolerate `0912…` vs
`+98912…` formats. Both are live-as-you-type warnings, not hard blocks — the prototype never
prevented saving a duplicate, only warned. Keep it that way; hard-blocking would be a
behavior change, not a bug fix.

### `analytics.js`
Pure "compute metrics from records" — folded `kpis.js` + `chartData.js` + `agentStats.js`
into one file. `computeKpis` — 4 fixed cards: total records, distinct companies;
Solar-category count; Polymer+Petrochemical+Chemical combined count (category string match
uses `.indexOf('Polymer') > -1`, so `'Chemical/Polymer'` counts toward Polymer, not
Chemical — deliberate, matches the original); calls in the last 7 days (inclusive of today).
`computeAgentReport` — per-agent totals across all records; `computeAgentStats` — same tally
for one agent with an optional date range (agent profile modal). `agentColor` — 3 hardcoded
brand colors for FARNAZ/PARDIS/ZOHREH, falls back to a deterministic HSL hash for any other
coordinator. `computeFunnelStages`/`computeTrendData`/`computeDailyAgentData`/
`computeCategoryData`/`computeSourceData` — pure data-prep for the dashboard charts (no
Chart.js objects here — components own the `Chart` instance). `computeDailyAgentData`'s
outlier cap (`cap = max(15, min(40, p75*3))`) exists so one bulk-import day doesn't flatten
the monthly bar chart — the *real* number still appears in the tooltip via `rawData`, only
the bar height is clamped. Don't "simplify" this away; it's there on purpose.

### `excel.js`
`parseImportFile` reads any `.xlsx`/`.xls`, matches columns via `IMPORT_ALIASES` (Persian
or English header names, case-insensitive), and skips rows with no company name. It returns
data only — the caller (`ImportExportBar.jsx`) decides how to merge/persist/toast, matching
the original's separation of "read the file" from "what happens on import."

### `calendar.js`
Jalali/Persian date conversion, **display-only**. Exports `JALALI_MONTHS`, `FA_MONTHS`
(Persian month names for Gregorian months, index 0 = January — used for trend-chart / company
report month labels; folded in from the deleted `constants.js`),
`gregorianToJalali(gy,gm,gd)`, `formatDisplayDate(ddmmyyyy, calendar)`. Dates are always
*stored* as Gregorian `dd.mm.yyyy`; only rendering flips to Jalali when the toggle is on.
Chart month-bucket grouping stays Gregorian on purpose — re-bucketing by Jalali month would
change what's grouped together, not just the label.

### `store.js`
Client singleton holding `records`/`customerMeta`/`reminders`/`currentUser`, backed by
**MySQL via the REST API in `src/app/api/*` (client `apiClient.js` → server `serverOps.js`)** —
the prototype's `window.storage` is gone, and the former `src/app/actions.js` Server Actions
layer is gone too (replaced wholesale by the API). `loadAll()` calls `loadAllDataAction` once
(guarded against re-entry) and stashes
`currentUser`; mutations go through `persist(rollback, actionFn)`, which applies the change
optimistically and rolls back on failure, redirecting to `/login` on `UNAUTHORIZED`/`FORBIDDEN`.
`logout()` clears state and redirects. `custKey` (company normalization) lives here rather than
`filters.js` only because it's needed to key `customerMeta`/reminders — anything else needing a
company key should import it from here. `useScopedData` (folded in from a separate
`useScopedData.js`) is the read hook every top-level page uses instead of `useStore((s) =>
s.records)`: it returns `{records, reminders, customerMeta}` filtered by the current user's
`agentCode` when `uiStore.scope` is `'mine'` (the default), unfiltered when `'all'` (or for
admins, who have no `agentCode` so `'mine'` is a no-op) — the default view is per-user while
the underlying data stays shared. `resetToSeed()` mirrors the prototype's "بازگشت به داده
اولیه" footer button (admin-only server-side now). `syncNow()` replays the offline queue and
swaps in the fresh server data.

**Read path & DB-hit pattern (for future reference):** `loadAllData` reads from **MySQL as
primary** and only falls back to the disk `snapshot.json` when the DB is unreachable
(`isConnError`) — disk is the emergency path, not the default. It runs **once per app open**
(guarded by `state.loaded`/`state.loading`); there is **no full reload per edit** — mutations
are optimistic and the in-memory store is the UI's source of truth, so a normal edit is ~2 DB
round-trips (the `getUserById` auth re-validation + the one write). No polling/interval runs
while online (the 20s `syncNow` timer in `AppShell` fires only while `offline === true`).
`snapshot.json` is rewritten after every successful load/sync, so a slightly-stale full copy of
`records`/`customerMeta`/`reminders` always sits on disk in plaintext JSON — that's the offline
fallback and the reason `.porterra/` must stay gitignored and local.

### `auth.js`, `crypto.js` — new infra (NOT prototype ports)
These three exist only because of the login + multi-user + MySQL migration; they have no
ancestor in `panel_mostaqel_moshtarian.html`. (The offline queue/snapshot mechanics that
used to live in `offline.js` are now inlined into `serverOps.js` — see below.)
- **`contactPrefs.js`** (new, also not a prototype port): per-user **view** preferences for the
  contacts table — a manual row order (`order`: `string[]` of record ids) and a set of
  "important" flags (`flags`: `string[]`). Persisted in `localStorage` keyed per username
  (`crm_contact_order_${username}` / `crm_contact_flags_${username}`), same convention as
  `uiStore.js`'s `scope`. `initContactPrefsForUser` runs from `store.loadAll`; `resetContactPrefs`
  from `store.logout`. **Manual ordering is applied in `ContactTable.jsx` *after* `getFiltered`
  returns (passing `sort=null` in manual mode) — never inside `filters.js`**, whose order of
  operations mirrors the prototype and must stay pure. Records absent from `order` sort after
  the ranked ones, preserving their `getFiltered` order. Drag-drop reorders the full stored
  `order` (so filtered-out rows keep their positions), not just the visible page.
- **`auth.js`** (server-only): `getSessionUser()` reads the `crm_session` cookie, decrypts it,
  and **re-validates the user against the DB on every call** (React `cache` memoizes
  per-request) — `proxy.js` is not a security boundary, so this is the real check. Falls back
  to the token payload only when the DB is unreachable (`isConnError`), so offline mode still
  works. `requireUser()`/`requireAdmin()` throw `UNAUTHORIZED`/`FORBIDDEN`; **every API route
  handler calls one at the top** (via `apiHandler.handle`).
- **`crypto.js`** (server-only): AES-256-GCM `encryptString`/`decryptString` + session-token
  pack/unpack, keyed by `ENCRYPTION_KEY` (env, never committed). Powers BOTH password storage
  (reversible by the user's explicit request — weaker than hashing, acceptable only for this
  local CRM; a reviewer will flag it, it stays because the user required it) and the httpOnly
  session cookie. Zero deps (Node `crypto` only).
- **offline queue/snapshot** (server-only, inlined in `serverOps.js`): atomic append-only
  queue (`queue.json`) + snapshot (`snapshot.json`) under the gitignored `/.porterra/` dir.
  `tryOp` queues a mutation when the DB is unreachable; `syncData` replays the queue then
  writes a fresh snapshot. **Data must never be lost** — the queue is never cleared on logout;
  it persists until a successful sync. (Was a separate `offline.js`; folded into `serverOps.js`
  since `serverOps` was its only consumer.)
- **`apiClient.js`** / **`serverOps.js`** / **`apiHandler.js`** / **`src/app/api/**/route.js`** —
  the REST API transport that **replaced `src/app/actions.js` wholesale** (new infra, not
  prototype ports). `apiClient.js` is the **client** fetch mirror: it exports the *same names,
  signatures, and return shapes* the old Server Actions had, so `store.js`/`users/page.js`
  swapped one import path and nothing else, and `login/page.js` moved from `useActionState` to a
  controlled `onSubmit`. `loadAllData` translates a 401 into
  `{data:null,currentUser:null,unauthorized:true}` (no throw) so `store.loadAll`'s
  `unauthorized` branch is untouched; `login` returns `{user}`/`{error}` (no throw) so
  `login/page.js`'s `res?.user`/`res?.error` logic is untouched. All other exports throw
  `Error('UNAUTHORIZED')` on 401 and `Error('FORBIDDEN')` on 403 — the exact strings
  `store.isUnauthorized` / `users.isUnauthorized` branch on. `serverOps.js` is the **server**
  orchestration moved verbatim out of `actions.js`: `tryOp`, `loadBootData` (MySQL→snapshot
  fallback + writeSnapshot), `syncData` (replay queue in one transaction → `loadAllFromDb` →
  snapshot), `importContacts` (per-record queue on DB-down), `resetData`, `authenticateUser`.
  It also inlines the offline queue/snapshot mechanics (append-only `queue.json`, atomic
  `snapshot.json` under `/.porterra/`) that were a separate `offline.js`.
  `apiHandler.js` exports `handle(fn)`, the one error→status mapper every route uses:
  `UNAUTHORIZED`→401, `FORBIDDEN`→403, `VALIDATION` (by `err.code` or `message` prefix)→400,
  else 500 — passing `err.message` through verbatim so `users.cleanErr` and `store.persist`
  toasts are byte-identical to the old Server-Action path. Route handlers are thin
  (`require*` → `parseOrThrow` → `tryOp`/`queries`/`serverOps` → `NextResponse.json`); the
  user-management routes copy the `create/update/deleteUserAction` bodies (dup checks, self
  guards, `encryptString`, partial-patch whitelist) verbatim. **`proxy.js`'s matcher excludes
  `/api`** so an unauthenticated API call returns 401 JSON (handled by `apiClient`) instead of a
  307 redirect to `/login`.

### `queries.js` / `mappers.js` / `models.js` — server-only DB CRUD (MySQL)
`queries.js` exports one consistent CRUD set per table — `listX`, `getXById`, `createX`,
`updateX`, `deleteX` — every function takes an optional pooled `conn` (used when called inside
`applyOp`'s transaction; otherwise runs on the pool). Coverage:
- **`contacts`**: `listContacts`, `getContactById`, `createContact` (upsert), `updateContact`, `deleteContact`.
- **`customer_activity`**: `listActivity`, `getActivityById`, `createActivity` (upsert), `updateActivity`, `deleteActivity`.
- **`reminders`**: `listReminders`, `getReminderById`, `createReminder` (upsert), `updateReminder`, `deleteReminder`.
- **`users`**: `listUsers`/`listUsersRaw`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, plus finders
  (`findUserByUsername`, `findUserByEmail`) and partial setters (`updateUserLastLogin`, `setUserActive`, `upsertUser`).

`create*` are idempotent upserts (`INSERT ... ON DUPLICATE KEY UPDATE`) keyed on the VARCHAR PK —
this matches the last-write-wins + offline-queue model. `update*` take a partial patch and `SET`
only present keys (absent = unchanged). **`applyOp` is the offline-queueable mutation dispatcher
and calls these same functions** — client-driven writes go through it (via `tryOp` in
`serverOps.js`) so a DB-down mutation lands in the `/.porterra/queue.json` queue; do not call the
`create/update/delete*` functions directly from an API route for client mutations unless you
also wire the offline path. `loadAllFromDb` + `reseedContacts` are bulk read/reset, not CRUD.
Row⇄object mapping lives in `mappers.js` (`rowToContact`/`rowToActivity`/`rowToReminder`/`rowToUser`
+ `*ToRow`); the `*_COLS` arrays there are the single source of truth for column order.
`models.js` holds the Zod schemas (`*Create`/`*Update`, `Id`, `LoginInput`) every API route
handler validates via `parseOrThrow` before any SQL runs.

### `uiStore.js`
Ephemeral, unpersisted UI state. **The one rule that's easy to get wrong**: a chart
drill-down (`applyCategoryFilter`, `applySourceFilter`, `applyMonthFilter`, `applyDayFilter`)
must own exactly one filter dimension — every one of these functions either sets
`chartFilter` to `null` or explicitly resets the other filter fields it doesn't apply to.
**This was broken until it was fixed** (the functions silently left old filters/chartFilter
in place, so clicking a chart bar after any prior filter was active could AND them together
and show zero rows). If you add a new chart click-to-filter interaction, copy the pattern
from an existing `applyXFilter`, including the reset of unrelated fields — don't just call
`setFilters`/`setChartFilter` directly from a component.
`scope` (`'mine'`|`'all'`) is persisted in `localStorage` keyed per-username
(`initScopeForUser` runs on login); it's a **default view, not access control** — any agent
can toggle to `'all'` by design, and admins have no `agentCode` so `'mine'` is a no-op for
them.
`calendar` and `fontScale` are also localStorage-persisted but follow `theme.js`'s SSR-safe
pattern: `ui` starts at server defaults (`'gregorian'`/`FONT_SCALE_DEFAULT`) and reads
localStorage only lazily in `subscribe` (`hydrateUi`), and `getServerSnapshot` returns a
frozen `SERVER_UI` snapshot — not the live `ui`. Reading these prefs at module load would
leak the client value into the hydration snapshot and mismatch the server-rendered default
(calendar toggle title, `.crm-root` zoom); don't move those reads back into the `ui` literal.

### `confirm.js`
`'use client'`. Promise-based `confirm(options)` → a real modal (`ui/Modal.jsx`) replacing
native `confirm()`: any handler can `await confirm({title,message,tone,...})` and resolve on
`answerConfirm(val)`. `useConfirmState()` is the `useSyncExternalStore` hook the modal reads;
state is module-level (one global confirm), same external-store pattern as `uiStore.js`.

### `theme.js`, `useCountUp.js`
Presentation-only helpers (dark mode persistence, animated count-up). No business logic to
deviate on.
