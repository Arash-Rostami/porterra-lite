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
harmless to leave, safe to delete if you're cleaning up). `normalizePhone(s)` converts
Persian (`۰-۹`) and Arabic-Indic (`٠-٩`) digits to Latin, preserves a leading `+`, strips
non-dial chars; `PhoneLink` (`src/components/ui/PhoneLink.jsx`) uses it to build `tel:`
URIs for read-only phone displays (agent suggestions, suggestions panel, report preview
phone column) — phone edit inputs stay plain `<input>`.

### `filters.js`
- Also holds the app's shared enum constants (`COORD_OPTS`, `RESULT_OPTS`, `STATUS_OPTS`,
  `PRIORITY_OPTS`, `PRICE_TYPE_OPTS`) — these used to be duplicated per-component; this file
  already owned `COORD_LABELS` so the rest of the label/option vocabulary lives beside it instead
  of a separate constants module. `COMMENT_AUTHORS` was removed — replaced by `commentAuthors()`
  (below). The hardcoded `AGENT_OPTS` 3-option dropdown in `UserFormModal` was also removed —
  `agentCode` is now a free-text input (`.trim().toUpperCase()` on submit, both create and edit),
  which is what unblocks onboarding a 4th+ expert.
- `COORD_LABELS`/`COORD_OPTS` are now a **fallback only**, not the source of truth — the real
  coordinator/agent list comes from active `users` rows (`agentCode`/`displayName`), loaded once
  at boot into a module-level registry via `setAgentDirectory(agents)` (called from `store.js`'s
  `loadAll`/`syncNow`/`logout`). `coordLabel(v)` checks that registry first, falls back to
  `COORD_LABELS[v]`, then the raw code. `coordOptions()` builds the dropdown list from the
  registry, falling back to the hardcoded `COORD_OPTS` only when the registry is empty (before
  boot load completes, or genuinely offline with no cached snapshot yet — `products`/`agents` are
  both part of the cached `snapshot.json`, so a normal offline session still has real data).
  `coordClass(co)` still special-cases exactly `FARNAZ`/`PARDIS`/`ZOHREH` for their brand colors
  and falls back to `-other` for any other agent — same treatment as `agentColor()` in
  `analytics.js`, intentionally not extended to a per-agent color table. `commentAuthors()`
  returns the active agents' display names (`Object.values(AGENT_DIRECTORY).sort(...)`) and feeds
  the two "تغییر توسط"/"از طرف" author dropdowns in `LeadProfileModal`. `coordCodeFromLabel(label)`
  is the reverse of `coordLabel` (display name → `agentCode`, or null); `excel.js`'s
  `normalizeImportCoordinator` tries it first so an imported display name (e.g. `'فرناز'`) for any
  active agent resolves to its code, then falls back to the legacy 3-name map, then raw passthrough.
  Onboarding a new expert = a `users` row with role `agent` + a unique `agentCode`; after
  `loadAll`/`syncNow` it appears in `coordOptions()`, `commentAuthors()`, the agents panel (chips
  derive from `r.coordinator`), and analytics (auto HSL color via `agentColor()`). `COORD_OPTS`/
  `COORD_LABELS`/`coordClass`/`AGENT_COLORS` remain as intentional legacy fallback/color logic —
  same precedent as `badgeClass`/`catColors` below — not dead code.
- `SOURCE_OPTS` is now a **seed/fallback only** — lead source forms (`AddLeadForm`,
  `LeadProfileModal` edit + quick-call) use a free-text `<input className="crm-input"
  list="...">` + a native `<datalist>` of suggestions from `sourceSuggestions(records)`
  (the 8 `SOURCE_OPTS` defaults ∪ distinct `Utils.normSpace(r.source)` from records,
  memoized per form); the source filter dropdowns (`LeadFilters`, `ReportBuilder`) use the
  data-driven `opts.sources` from `filterOptionsFrom(records)` instead of `SOURCE_OPTS`.
  Adding a source = type it on a lead once and save; it then appears in every form's
  suggestion list and every filter dropdown automatically via the record-derived option
  lists — no `sources` table, no migration, no FK; rename/delete unsupported (a source
  "exists" while leads use it — same no-table trade-off as `agentCode`). `SOURCE_OPTS`/
  `filterOptionsFrom` (which already returns a data-driven `.sources` list) are unchanged.
- `badgeClass(cat)` (here) and `catColors` (`analytics.js`) are **intentional color logic keyed
  on the hydrated category NAME**, not a category list. They survived the category→`category_id`
  migration on purpose — `hydrateAllCategoryNames()` (store.js) resolves `categoryId`→display
  `name` onto every record/product as `r.category`/`p.category`, so these name-keyed color helpers
  keep working unchanged. Do not flag them as dead or migrate them to `categoryId`. (The old
  hardcoded `CATEGORY_OPTS` form list was removed — category dropdowns now read
  `useStore((s)=>s.categories)` instead.)
- `result` is now a 4-state enum, never `'موفق'`/`'ناموفق'` directly: `'در حال پیگیری'` (follow-up),
  `'در حال استعلام'` (an inquiry/quote is open — see the `quote*` fields below), `'بی‌پاسخ'`
  (no answer), `'غیرفعال'` (deactivated, requires `deactivateReason`). `'موفق'`/`'ناموفق'` only
  exist as `quoteResult` values, set exclusively by resolving a quote (`resolveQuote` in `store.js`).
- `effectiveResult(r)` — **the** status-resolution function. If `r.result` is set, use it;
  otherwise scan `r.notes` for `FAIL_NOTE_PATTERNS` ('یادم نمیاد', 'جواب نداد', 'پاسخ نداد',
  'جواب نمی', 'پاسخ نمی') and infer `'بی‌پاسخ'` (**not** `'ناموفق'` — that value doesn't exist on
  `result` anymore); otherwise `null` ("بدون وضعیت" / no status). Every stat (funnel, KPIs, agent
  report, suggestions) reads status through this function, never `r.result` directly. If you add a
  new stat, do the same — and never compare `effectiveResult(r) === 'موفق'`/`'ناموفق'`, since that's
  the exact stale-enum bug the quote-model migration fixed upstream (check `r.quoteResult` instead).
- `isQuoteOpen(r)` — `r.result === 'در حال استعلام' && !r.quoteResult`.
- `statusBadgeInfo(r)` — `r.converted || r.quoteResult === 'موفق'` → success badge;
  `r.quoteResult === 'ناموفق'` → fail badge; `'غیرفعال'` → fail-styled; else falls through to
  `effectiveResult(r)`.
- `getFiltered` hides `result === 'غیرفعال'` rows by default — pass `filters.showDeactivated: true`
  or `filters.status === 'غیرفعال'` to include them (mirrors the prototype's "نمایش غیرفعال‌ها"
  checkbox).
- `smartSearch(records, query)` — multi-token, scored, OR-across-fields search (company,
  name, phone, notes, product, category, source, coordinator-label). Not a filter — returns
  every record with `score >= 1` sorted by score. This is intentionally permissive (feels
  like "fuzzy" search) rather than an AND-all-tokens filter.
- `getFiltered(records, filters, chartFilter, sort)` — the single function the contacts
  table's row-list comes from. Order of operations matters and mirrors the original exactly:
  dropdown filters → date range → chart drill-down (`chartFilter`) → smart search → sort.
- `chartFilter` shapes: `{type:'month', dateFrom, dateTo}` (Gregorian dd.mm.yyyy bounds —
  a date range, not a `{y,m}` pair, so it works whether the chart bucketed by Gregorian or
  Jalali month), `{type:'day', date, agent}` (single Gregorian dd.mm.yyyy), `{type:'otherSource',
  topSet}`. This is a *separate* filter dimension from `filters.category`/`filters.source` — see
  the `uiStore.js` note below for the rule about keeping them mutually exclusive.

### `suggestions.js`
`computeSuggestions(records)` — the "who to call today" engine, grouped by agent. Algorithm
(exact order, don't reorder):
1. Reduce to **one record per customer** — the most recent by date. Older records for the
   same company are ignored entirely, even if they were never actioned.
2. Skip if `converted`, `result === 'غیرفعال'`, or `result === 'در حال استعلام'` (deactivated leads
   and open quotes are handled by their own surfaces — the deactivated list and the Inquiry Panel —
   not by call suggestions).
3. Skip if the latest contact date is today or in the future (`days <= 0`).
4. `noStatus = !effectiveResult` → priority rank 3 (highest), overriding `record.priority`.
5. `isNoAnswer = effectiveResult === 'بی‌پاسخ'` → always surfaced regardless of days elapsed.
6. Everything else (e.g. "در حال پیگیری") only surfaces once `days >= 3` OR priority rank 3.
`filterAgentSuggestions` applies the optional per-agent category/product/search UI filters
on top of the computed pool and returns the sorted `filtered` list; `SuggestionsPanel.jsx`
paginates it client-side (same pagination pattern as `LeadTable.jsx`/`AgentProfileModal.jsx`)
rather than the function itself capping the visible count.

### `duplicates.js`
`findDuplicateCompany` — exact match after `normSpace().toLowerCase()`. `findDuplicatePhone`
— compares the **last 8 digits** after stripping non-digits, to tolerate `0912…` vs
`+98912…` formats. Both sides now route through `Utils.normalizePhone` so Persian/Arabic-digit
phones are detected (the old `.replace(/\D/g,'')` silently dropped them). Both are
live-as-you-type warnings, not hard blocks — the prototype never
prevented saving a duplicate, only warned. Keep it that way; hard-blocking would be a
behavior change, not a bug fix.

### `analytics.js`
Pure "compute metrics from records" — folded `kpis.js` + `chartData.js` + `agentStats.js`
into one file. `computeKpis` — 6 fixed cards matching the quote-model status set: total
records, `converted` count, open-quote count (`isQuoteOpen`), `'غیرفعال'` count, `'در حال
پیگیری'` count, `effectiveResult === 'بی‌پاسخ'` count. `tally()` (private) buckets every
record into exactly one of `noAnswer`/`deactivated`/`followUp`/`quoteOpen`/`quoteWon`/
`quoteLost` via `effectiveResult`, then branches into the quote sub-states by `r.quoteResult`
when `effectiveResult === 'در حال استعلام'` — **never** compares `effectiveResult` against
`'موفق'`/`'ناموفق'` directly, since `result` can't hold those values (see `filters.js`).
`computeAgentReport` — per-agent totals across all records; `computeAgentStats` — same tally
for one agent with an optional date range (agent profile modal). `agentColor` — 3 hardcoded
brand colors for FARNAZ/PARDIS/ZOHREH, falls back to a deterministic HSL hash for any other
coordinator. `computeFunnelStages` returns `{stages, leadConversionRate, quoteToSaleRate}` —
3 stages (total leads → open+resolved quotes → `converted` count) plus the two conversion
rates the quote-model spec calls for, replacing the old 4-stage "price-field-truthy" funnel.
`computeTrendData`/`computeDailyAgentData`/`computeCategoryData`/`computeSourceData` — pure
data-prep for the dashboard charts (no Chart.js objects here — components own the `Chart`
instance). `computeDailyAgentData`'s outlier cap (`cap = max(15, min(40, p75*3))`) exists so
one bulk-import day doesn't flatten the monthly bar chart — the *real* number still appears
in the tooltip via `rawData`, only the bar height is clamped. Don't "simplify" this away;
it's there on purpose.

### `excel.js`
`parseImportFile` reads any `.xlsx`/`.xls`, matches columns via `IMPORT_ALIASES` (Persian
or English header names, case-insensitive), and skips rows with no company name. It returns
data only — the caller (`ImportExportBar.jsx`) decides how to merge/persist/toast, matching
the original's separation of "read the file" from "what happens on import." The leads
export (`src/app/leads/page.js` `handleExport`) passes
`getFiltered(records, filters, chartFilter)` into `exportToExcel`, so export respects the
active filter + chart drill-down, not the raw scoped set.

### `calendar.js`
Jalali/Persian date conversion. Exports `JALALI_MONTHS`, `FA_MONTHS` (Persian month names for
Gregorian months, index 0 = January — used for trend-chart / company report month labels when
the toggle is off; folded in from the deleted `constants.js`), `gregorianToJalali(gy,gm,gd)`,
`jalaliToGregorian(jy,jm,jd)` (its inverse, same algorithm family/constants — used by `DateField`
and the analytics month-bucketing below), `jalaliMonthLength(jy,jm)` (resolves Esfand's 29-vs-30
days by round-tripping through both conversion functions rather than a separate leap-year
formula), `formatDisplayDate(ddmmyyyy, calendar)`. Dates are always *stored* as Gregorian
`dd.mm.yyyy` — the toggle never changes that. What it *does* change: `DateField.jsx`
(`src/components/ui/DateField.jsx`) renders Jalali day/month/year `Dropdown`s instead of the
native `<input type="date">`, converting to/from the same Gregorian ISO value contract; and
`computeTrendData`/`computeDailyAgentData` in `analytics.js` bucket by Jalali month instead of
Gregorian when passed `calendar === 'jalali'`. Because of that second point, the chart
click-to-filter payload (`applyMonthFilter`/`applyDayFilter` in `uiStore.js`) is a Gregorian
date-range/date, not a `{y,m}`/`{y,m,day}` int pair — see the `uiStore.js` note below.

### `store.js`
Also holds `products` (loaded once at boot alongside `records`) and three quote/product actions
that follow the same optimistic-`persist()` pattern as everything else: `addProduct`,
`announceQuotePrice(id, price, priceType, terms)`, `resolveQuote(id, result, failReason)`. Both
quote actions stamp `Utils.todayDdMmYyyy()` client-side for the optimistic update; the server
route recomputes the same value authoritatively, so the two only diverge if the client's clock is
wrong, and a `loadAll`/`syncNow` refresh corrects it.

Also holds `categories` (loaded once at boot alongside `records`/`products`) with
`addCategory`/`updateCategory`/`deleteCategory` mutators following the same optimistic-`persist()`
pattern. `hydrateAllCategoryNames()` resolves `categoryId`→display `name` onto every record/product
as `r.category`/`p.category` so all existing readers (filters, analytics, charts, badge colors) stay
name-based and unchanged — called on `loadAll`/`syncNow` and after `updateRecord`/`addProduct`/
`updateProduct`/`addRecords`/`updateCategory` (a category rename re-hydrates every record/product in
one pass).

Client singleton holding `records`/`companyMeta`/`reminders`/`currentUser`, backed by
**MySQL via the REST API in `src/app/api/*` (client `apiClient.js` → server `serverOps.js`)** —
the prototype's `window.storage` is gone, and the former `src/app/actions.js` Server Actions
layer is gone too (replaced wholesale by the API). `loadAll()` calls `loadAllDataAction` once
(guarded against re-entry) and stashes
`currentUser`; mutations go through `persist(rollback, actionFn)`, which applies the change
optimistically and rolls back on failure, redirecting to `/login` on `UNAUTHORIZED`/`FORBIDDEN`.
`logout()` clears state and redirects. `custKey` (company normalization) lives here rather than
`filters.js` only because it's needed to key `companyMeta`/reminders — anything else needing a
company key should import it from here. `useScopedData` (folded in from a separate
`useScopedData.js`) is the read hook every top-level page uses instead of `useStore((s) =>
s.records)`: it returns `{records, reminders, companyMeta}` filtered by the current user's
`agentCode` when `uiStore.scope` is `'mine'` (the default), unfiltered when `'all'` (or for
admins, who have no `agentCode` so `'mine'` is a no-op) — the default view is per-user while
the underlying data stays shared. `resetToSeed()` mirrors the prototype's "بازگشت به داده
اولیه" footer button (admin-only server-side now). `src/data/seed.js` is legacy — seed data
still uses the old `category` name shape, so a reset yields leads with `NULL` `category_id`.
Acceptable because it's an admin-only "wipe to initial data" path, unused on the production DB.
`syncNow()` replays the offline queue and
swaps in the fresh server data.

**Read path & DB-hit pattern (for future reference):** `loadAllData` reads from **MySQL as
primary** and only falls back to the disk `snapshot.json` when the DB is unreachable
(`isConnError`) — disk is the emergency path, not the default. It runs **once per app open**
(guarded by `state.loaded`/`state.loading`); there is **no full reload per edit** — mutations
are optimistic and the in-memory store is the UI's source of truth, so a normal edit is ~2 DB
round-trips (the `getUserById` auth re-validation + the one write). No polling/interval runs
while online (the 20s `syncNow` timer in `AppShell` fires only while `offline === true`).
`snapshot.json` is rewritten after every successful load/sync, so a slightly-stale full copy of
`records`/`companyMeta`/`reminders` always sits on disk in plaintext JSON — that's the offline
fallback and the reason `.porterra/` must stay gitignored and local.

### `auth.js`, `crypto.js` — new infra (NOT prototype ports)
These three exist only because of the login + multi-user + MySQL migration; they have no
ancestor in `panel_mostaqel_moshtarian.html`. (The offline queue/snapshot mechanics that
used to live in `offline.js` are now inlined into `serverOps.js` — see below.)
- **`leadPrefs.js`** (new, also not a prototype port): per-user **view** preferences for the
  leads table — a manual row order (`order`: `string[]` of record ids) and a set of
  "important" flags (`flags`: `string[]`). Persisted in `localStorage` keyed per username
  (`crm_lead_order_${username}` / `crm_lead_flags_${username}`), same convention as
  `uiStore.js`'s `scope`. `initLeadPrefsForUser` runs from `store.loadAll`; `resetLeadPrefs`
  from `store.logout`. **Manual ordering is applied in `LeadTable.jsx` *after* `getFiltered`
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
  snapshot), `importLeads` (per-record queue on DB-down), `resetData`, `authenticateUser`.
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
- **`contacts`** (table name kept as-is — "leads" in the app layer, `contacts` is the physical
  MySQL table, deliberately not renamed to avoid a DB migration): `listLeads`, `getLeadById`,
  `createLead` (upsert), `updateLead`, `deleteLead`. Holds the 8 quote/deactivation columns
  (`deactivate_reason`, `quote_price`, `quote_price_type`, `quote_terms`, `quote_price_date`,
  `quote_result`, `quote_result_date`, `quote_fail_reason`) added for the inquiry workflow —
  `quote_price_date`/`quote_result_date` are `dd.mm.yyyy` VARCHAR like `date`, not SQL `DATE`, to
  match the rest of this app's date convention (`normDate` in `mappers.js` covers all three).
  `updateLead` maps camelCase patch keys to snake_case columns via the `LEAD_UPDATE` `{k, col}`
  array (the multi-word quote fields don't collapse to their column name the way the single-word
  legacy fields did).
- **`customer_activity`**: `listActivity`, `getActivityById`, `createActivity` (upsert), `updateActivity`, `deleteActivity`.
- **`reminders`**: `listReminders`, `getReminderById`, `createReminder` (upsert), `updateReminder`, `deleteReminder`.
- **`users`**: `listUsers`/`listUsersRaw`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, plus finders
  (`findUserByUsername`, `findUserByEmail`) and partial setters (`updateUserLastLogin`, `setUserActive`, `upsertUser`).
- **`products`**: `listProducts`, `getProductById`, `createProduct` (plain insert — `name` is
  `UNIQUE`, a duplicate throws `ER_DUP_ENTRY`, translated to a 400 by both `POST /api/products`
  and `PATCH /api/products/[id]`), `updateProduct`, `deleteProduct`. Diverges from the prototype
  here — `state.customProducts` was append-only, but the `/products` admin tab needs real
  edit/delete, so `updateProduct`/`deleteProduct` were added (`update*`/`delete*` gated to
  `requireElevated`; `create*` stays open to any authenticated user, since `ProductField.jsx`'s
  inline "add on the fly" widget relies on that). Loaded once at boot via
  `loadAllFromDb`/`loadBootData` alongside contacts/activity/reminders; the `/products` page
  reads/writes this same `store.js` `products` state (via `addProduct`/`updateProduct`/
  `deleteProduct`) rather than fetching independently like `/users` does. The legacy free-text
  `category` column on `products`/`contacts` is intentionally retained as dormant legacy/audit —
  the app uses `category_id` exclusively.
- **`categories`**: `listCategories`, `getCategoryById`, `createCategory`, `updateCategory`,
  `deleteCategory` + `CATEGORY_COLS`/`CATEGORY_UPDATE` — same CRUD shape as the other tables.
  `rowToCategory`/`categoryToRow` in `mappers.js`; `CategoryCreate`/`CategoryUpdate` Zod schemas
  in `models.js`. POST `/api/categories` is `requireUser` (any authenticated user can create —
  the inline create-category shortcut in `ProductField`/`ProductFormModal` relies on that);
  PATCH/DELETE `/api/categories/[id]` is `requireElevated` (admin/developer only). DELETE is
  blocked by `ON DELETE RESTRICT` — a category in use surfaces as a `VALIDATION` toast. Leads
  and products now use `category_id` (FK → `categories(id)`); `LEAD_UPDATE`/`PRODUCT_UPDATE` both
  map `categoryId`→`category_id`. `loadAllFromDb` loads categories alongside the other tables;
  the `/products` and `/leads` import routes accept `categoryId`.

Quote lifecycle (`PATCH /api/quotes/[id]`, one route handling both stage transitions via an
`action` body field) reuses the existing `updateLead`/`applyOp('updateLead', ...)` path
rather than adding new `applyOp` cases — it's still just a lead patch, with the server
computing `quotePriceDate`/`quoteResultDate` (`Utils.todayDdMmYyyy()`) and enforcing stage order
(`announce-price` requires `result === 'در حال استعلام'`; `resolve` requires `quotePrice` already
set **and `quoteResult` not already set** — `result` never transitions away from `'در حال
استعلام'` once opened, so without that second check a resolved quote could be resolved again,
flipping `quoteResult`/`converted` with no audit trail) before calling it. `QuoteResolve`'s Zod schema requires `failReason` when `result ===
'ناموفق'` via `.refine`; `LeadCreate`/`LeadUpdate` similarly require `deactivateReason` when
`result === 'غیرفعال'` via `.superRefine` — both are the server-side enforcement the prototype's
handoff spec calls out as missing (client-only validation there).

`create*` are idempotent upserts (`INSERT ... ON DUPLICATE KEY UPDATE`) keyed on the VARCHAR PK —
this matches the last-write-wins + offline-queue model. `update*` take a partial patch and `SET`
only present keys (absent = unchanged). **`applyOp` is the offline-queueable mutation dispatcher
and calls these same functions** — client-driven writes go through it (via `tryOp` in
`serverOps.js`) so a DB-down mutation lands in the `/.porterra/queue.json` queue; do not call the
`create/update/delete*` functions directly from an API route for client mutations unless you
also wire the offline path. `loadAllFromDb` + `reseedLeads` are bulk read/reset, not CRUD.
Row⇄object mapping lives in `mappers.js` (`rowToLead`/`rowToActivity`/`rowToReminder`/`rowToUser`
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
