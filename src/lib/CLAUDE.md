# src/lib — business logic

Every function here is a direct port of a function in `public/panel_mostaqel_moshtarian.html`
(the original prototype). When modifying anything in this folder, find the equivalent
function in that file first and check the diff is intentional — diverging from it silently
breaks documented business rules. (The original handoff spec that wrote those rules out in
plain language was a scratch doc removed before this repo was handed off — this file and the
prototype HTML are now the two sources of truth for behavior.)

See `../app/CLAUDE.md` for the route map and the UI/UX design-pattern contract (former
`stylesPattern.md`, folded in there) — this file covers logic, that one covers routes + visuals.

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
`normalizePhone(s)` converts
Persian (`۰-۹`) and Arabic-Indic (`٠-٩`) digits to Latin, preserves a leading `+`, strips
non-dial chars; `PhoneLink` (`src/components/ui/PhoneLink.jsx`) uses it to build `tel:`
URIs for read-only phone displays (agent suggestions, suggestions panel, report preview
phone column) — phone edit inputs stay plain `<input>`.
`normName(s)` is the **identity normalizer**: `normSpace` plus only ي/ى→ی and ك→ک — exactly the
fold the production data migration applied to company names, so a typed name matches stored keys.
`recipientKey(user)` (`agentCode`, else `username`) is the one rule for whom a notification
belongs to. `phoneDigits(s)` / `isPhoneOk(s)` (empty is OK; otherwise ≥10 digits) back phone validation.
`normText(s)` is the **search-comparison normalizer**: lowercases, maps Arabic Yeh/Alef-Maksura
(`ي`/`ى`) and Arabic Kaf (`ك`) to their Persian forms (`ی`/`ک`), folds `أإآ`→`ا`, `ةۀ`→`ه`, `ؤ`→`و`,
`ئ`→`ی`, drops tatweel and Arabic diacritics, converts Persian/Arabic-Indic
digits to Latin, strips ZWNJ/LRM/RLM to a space, then collapses whitespace — so text typed on one
keyboard layout still substring-matches data entered on another even though both render
identically. Every free-text search comparison in the app routes both the query and the compared
field through this (never raw `.toLowerCase()`): `smartSearch`/`filterAgentSuggestions` above,
plus the search boxes in `AgentProfileModal`, `AgentReport`, `AgentsPanel`, `CategoriesPanel`,
`CompanyReport` (its substring-fallback branch only — the `custKey` exact-match branch is
identity/grouping, not search, and stays on `normSpace`), `QuotesPanel`, `ProductsPanel`,
`UsersPanel`, and `CompanySuggest` (`ui/`). If you add a new search input, normalize through this,
not a local `.toLowerCase()`. Deliberately **not** applied to identity/dedup keys (`custKey` in
`store.js` — an alias of `companyKey` (normName + lower), as are `duplicates.js`, `excel.js`'s import matching and `CompanyReport`'s grouping — plus `queries.js`'s department dedup) — those
compare for exact record/company identity, a different concern from fuzzy search, and stay on
`normSpace` only.

### `filters.js`
- Also holds the app's shared enum constants (`COORD_OPTS`, `RESULT_OPTS`, `STATUS_OPTS`,
  `PRICE_TYPE_OPTS`) — these used to be duplicated per-component; this file
  already owned `COORD_LABELS` so the rest of the label/option vocabulary lives beside it instead
  of a separate constants module. `COMMENT_AUTHORS` was removed; its replacement `commentAuthors()`
  was later removed too once `LeadProfileModal` stopped using an author dropdown (the comment/
  changelog author is now derived automatically from the logged-in user). The hardcoded `AGENT_OPTS`
  3-option dropdown in `UserFormModal` was also removed —
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
  `scopedCoordOptions(currentUser)` is the role-aware wrapper every coordinator-picker Dropdown in
  the app actually uses (`LeadFilters`, `DashboardFilters`, `ReportBuilder`, `AddLeadForm`,
  `LeadProfileModal`'s 4 coordinator/for-agent pickers) — admin/developer get the full
  `coordOptions()` list, a `manager` gets only agents whose `department` (via the parallel
  `AGENT_DEPARTMENTS` map, populated alongside `AGENT_DIRECTORY` in `setAgentDirectory`) matches
  their own, and a plain `agent` gets a single-item list of just themselves. This is a UI
  convenience layered on top of the real server-side scoping (see `auth.js`/`serverOps.js`
  below) — picking an out-of-scope value isn't possible from these dropdowns, and would also be
  rejected server-side if forced via a direct API call. Raw `coordOptions()` should no longer be
  called directly from a filter/picker component; use `scopedCoordOptions` instead.
  `coordClass(co)` still special-cases exactly `FARNAZ`/`PARDIS`/`ZOHREH` for their brand colors
  and falls back to `-other` for any other agent — same treatment as `agentColor()` in
  `analytics.js`, intentionally not extended to a per-agent color table. `coordCodeFromLabel(label)`
  is the reverse of `coordLabel` (display name → `agentCode`, or null); `excel.js`'s
  `normalizeImportCoordinator` tries it first so an imported display name (e.g. `'فرناز'`) for any
  active agent resolves to its code, then falls back to the legacy 3-name map, then raw passthrough.
  Onboarding a new expert = a `users` row with role `agent` + a unique `agentCode`; after
  `loadAll`/`syncNow` it appears in `coordOptions()`, the agents panel (chips
  derive from `r.coordinator`), and analytics (auto HSL color via `agentColor()`). `COORD_OPTS`/
  `COORD_LABELS`/`coordClass`/`AGENT_COLORS` remain as intentional legacy fallback/color logic —
  same precedent as `badgeClass`/`catColors` below — not dead code.
- `SOURCE_OPTS` is the **fixed list for non-elevated roles**: for agents/managers the lead source
  forms (`AddLeadForm`, `LeadProfileModal` edit + quick-call) show a `Dropdown` over `SOURCE_OPTS`, and
  `POST /api/leads` rejects anything else; for admin/developer they use a free-text `<input
  className="crm-input" list="...">` + a native `<datalist>` of suggestions from `sourceSuggestions(records)`
  (the 9 `SOURCE_OPTS` defaults ∪ distinct `Utils.normSpace(r.source)` from records,
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
- `getFiltered` no longer special-cases `result === 'غیرفعال'` — deactivated leads show under
  "همه وضعیت‌ها" (no status filter) exactly like any other status; the old always-hide-unless-
  checkbox behavior (`filters.showDeactivated`) was removed, and the "نمایش غیرفعال‌ها" checkbox
  in `LeadFilters` is gone. Filter to only deactivated leads via `filters.status === 'غیرفعال'`.
- `smartSearch(records, query)` — multi-token search over `searchHay(r)` (company, name, phone
  + phone digits, notes, product, category, source, coordinator code + label, all through
  `Utils.normText`, cached per record in a `WeakMap`; rows from `companyRows` carry a ready
  `hay`). **Every token must match** (AND, tokens may sit in different fields); `score` is 2 when
  the whole phrase appears contiguously, else 1, and results sort by score. The old
  any-token (OR) behavior returned 83 unrelated hits for a 3-word query — don't restore it.
  `getFiltered` also honors `filters.temp` (matches `r.temp`) and uses `r.status` when a row
  carries one (company rows), else `effectiveResult(r)`; date sorts decorate once instead of
  re-parsing per comparison. Also exports `SOURCE_OPTS` (9 production values, `'سایر'` last),
  `OTHER_SOURCES_LABEL` (`'سایر منابع'`, the chart "rest" bucket — distinct from the real
  source `'سایر'`) and `TEMP_OPTS`.
- `textFilter(items, query, fieldsFn)` — the shared single-substring search filter every
  simple panel/report search box uses instead of hand-rolling `.toLowerCase().includes()`:
  normalizes `query` via `Utils.normText` once, keeps items where `fieldsFn(item)` yields at
  least one field containing it. Used by `AgentProfileModal`, `AgentReport`, `AgentsPanel`,
  `CategoriesPanel`, `QuotesPanel`, `ProductsPanel`, `UsersPanel`. Not for the leads/customers
  table search (that's `smartSearch`, scored/multi-token — a different search UX) or
  `CompanySuggest`/`CompanyReport` (their own field is the *only* candidate field, no
  `fieldsFn` indirection needed, so they call `Utils.normText` directly).
- `matchesFilter(fieldValue, filterValue)` — the shared dropdown-filter comparator: if
  `filterValue` is an array, matches when it's empty (no filter) or contains `fieldValue`;
  if it's a plain value (legacy single-select shape, and what a chart drill-down still sets
  — `applyCategoryFilter` etc. in `uiStore.js` never had to change), matches when it's falsy
  (no filter) or strictly equal. `getFiltered`'s coordinator/category/source/product checks
  and `filterAgentSuggestions`' category/product checks both route through it, so multi-select
  (`Dropdown`'s `multiple` mode, `../components/CLAUDE.md`) works everywhere a filter is
  applied without either function needing to know which UI produced the value. `status` has
  its own `activeStatuses(status)` normalizer beside it (array/string/empty → an array of
  active statuses or `null`) because `'بدون وضعیت'` isn't a real `result` value — it means
  `!effectiveResult(r)` — so it can't reuse plain equality even per-element.
- `getFiltered(records, filters, chartFilter, sort)` — the single function the contacts
  table's row-list comes from. Order of operations matters and mirrors the original exactly:
  dropdown filters → date range → chart drill-down (`chartFilter`) → smart search → sort.
  `sort` defaults to `{key:'date', dir:-1}` (newest-first) in every consumer that renders a table
  of records — `LeadTable.jsx`'s `sort` state and `ReportBuilder.jsx`'s call both start there, not
  `null`. Every `<table>` with a date/timestamp column follows the same click-to-sort convention:
  a plain `<th onClick={...}>` (no special class needed — `.crm-table th` is already
  `cursor:pointer`) toggling a local `{key, dir}` state, rendering `▲`/`▼` when active or
  `ArrowsUpDownIcon` (`crm-sort-hint-icon`) otherwise — see `LeadTable.jsx`'s `SORT_COLUMNS` for
  the multi-column version, or `UsersPanel.jsx`/`CategoriesPanel.jsx`/`ProductsPanel.jsx` for the
  single-date-column version (their own local `sort`/`toggleSort`, not routed through
  `getFiltered` since they don't operate on leads). List-based feeds (not `<table>`s — company
  report, agent/lead profile history/changelog/correspondence tabs) are fixed newest-first with no
  toggle, which is intentional there. `RemindersList.jsx` (oldest-due-first) and
  `SuggestionsPanel.jsx`'s `'days'` sort mode (oldest-contact-first) are deliberately **not**
  newest-first — the whole point of both is surfacing stale/overdue items first.
- `chartFilter` shapes: `{type:'month', dateFrom, dateTo}` (Gregorian dd.mm.yyyy bounds —
  a date range, not a `{y,m}` pair, so it works whether the chart bucketed by Gregorian or
  Jalali month), `{type:'day', date, agent}` (single Gregorian dd.mm.yyyy), `{type:'otherSource',
  topSet}`. This is a *separate* filter dimension from `filters.category`/`filters.source` — see
  the `uiStore.js` note below for the rule about keeping them mutually exclusive.

### `companies.js`
The one shared source for "lead", "customer" and "call" — new, not a prototype port. A company is
the group of rows sharing `companyKey(name)` (`Utils.normName` + lowercase). `companies(records)`
builds `{key,name,records(newest first),last,calls,answered,isCustomer,won,lost,openQuotes,priced,
tempManual,lastTs,days,temp}` (plus a **lazy** `hay` — the search text of all the company's calls —
built on first use by `companyHay(c)`; `companyRows(records, callFilters, segment, withHay = false)` and
`leadList` ask for it, `summarize` and the header chip do not, so the first paint stays cheap;
`TEMP_RULES` is internal) once per records-array identity (`WeakMap`; the store always
replaces the array, never mutates it). **Customer** = any row with `converted` or
`quoteResult === 'موفق'`; **lead** = any other company; **call** = a row with a date, result or
notes (`isCall`). `temp` follows `TEMP_RULES` in this order: manual `temperature` override →
open inquiry = hot → `days >= coldDays` = cold → priced non-lost quote or `answered >= hotAnswered`
= hot → `answered >= warmAnswered` = warm → cold (`answered` = calls whose effective result is not
`'بی‌پاسخ'`). `companyRows(records, callFilters, segment)` returns one **representative row**
per company (spread of its latest matching call plus `key,calls,won,inquiries,isCustomer,temp,
tempManual,status,hay`; built once per company and reused when unfiltered; `hay` is the search
text of **all** the company's matching calls, so a phone/product/note that sits only in an older
call is still found; dropdown filters see only the representative row) so `getFiltered`, sort,
export and `openProfile(row.id)` work unchanged. `callFilters = {coordinator,dateFrom,dateTo}` are
applied per call through `callMatcher` (a company appears if it has a matching call; `segment` is
`'lead'|'customer'|undefined`). `leadList(records, filters, segment, chartFilter, sort)` is the
single query behind lists and counts; a chart `month`/`day` drill-down is folded into the **call filters**
(not applied to the representative row), so a bar's number equals the list it opens (verified: busiest
month 323 = 323, busiest day 111 = 111, day+agent 106 = 106) — only `otherSource` stays a row filter. Must stay free of `'use client'` and must not import
`store.js`/`uiStore.js`.

**Caches that must keep sharing identity** (all `WeakMap`s keyed by the store's records array, which is
replaced on every mutation so they die with it): `companies()`, `computeSuggestions()`, and
`store.js`'s `scopeRecordsFor(records, agentCode)` (so every `useScopedData()` caller of an agent gets the
SAME scoped array and therefore the same company cache). `companyKey` itself memoizes by input string
(a bounded `Map`, cleared at 20k entries) — about 15× faster for the per-row key calls scattered through
the app. Never pass a freshly filtered copy of records into these functions.

### `suggestions.js`
`computeSuggestions(records)` — the "who to call today" engine, grouped by agent. Deliberately
**no longer** the prototype's scoring algorithm (priority/price/recency score removed — spec U8);
now: one item per company (`companies()`'s `last` call); skip customers, `'غیرفعال'` and
`'در حال استعلام'` effective results, and `days <= 0`; order by temperature (hot→warm→cold), then
no-answer first, then oldest contact, then missing/short phones last. It returns the **full**
ordered lists, each item `{r,days,temp,isNoAnswer,noStatus,phoneBad,hay}`. The daily cap
(`SUGGESTION_DAILY_CAP`, 30 per agent) is a pure display limit applied **after** the panel's
filters: `SuggestionsPanel` receives the full lists and slices each card to the cap unless the
«نمایش همه» toggle is on, so search/category/product filters always run over the whole pool and
`ReminderBanner`, the agent profile and the Excel export see the real workload.
`summarizeSuggestions` returns `{total,noAnswer,hot}`;
`SUGGESTION_SORT_MODES` is just `smart` (as computed) and `days`.
`filterAgentSuggestions` applies the optional per-agent category/product filters plus an
AND-of-tokens search over the item's `hay` (company-wide search text) and returns the
`filtered` list; `SuggestionsPanel.jsx` caps then paginates it client-side (same pagination
pattern as `LeadTable.jsx`/`AgentProfileModal.jsx`).

### `duplicates.js`
`findDuplicateCompany` — exact match on `companyKey` (`normName` + lowercase, the same key the whole
app uses). `findDuplicatePhone`
— compares the **last 8 digits** after stripping non-digits, to tolerate `0912…` vs
`+98912…` formats. Both sides now route through `Utils.normalizePhone` so Persian/Arabic-digit
phones are detected (the old `.replace(/\D/g,'')` silently dropped them). Both are
live-as-you-type warnings, not hard blocks — the prototype never
prevented saving a duplicate, only warned. Keep it that way; hard-blocking would be a
behavior change, not a bug fix.

### `analytics.js`
Pure "compute metrics from records" — folded `kpis.js` + `chartData.js` + `agentStats.js`
into one file. Every count is **company-level** and comes from `summarize(records, callFilters?)`
(built on `companyRows`, see `companies.js`): `{companies,leads,customers,followUp,inInquiry,
noAnswer,deactivated,noStatus,hot,warm,cold,calls,inquiryCompanies (companies with a quote row among the
**filtered** calls),quoteOpen,quoteWon,quoteLost,
quoteTotal,leadConversionRate,quoteToSaleRate}`. Lead statuses use each company's latest call's
`effectiveResult`, so status counts sum to `leads` and `leads + customers = companies`. Quote
tallies are call-level and key on `r.quoteResult` first (`'موفق'`/`'ناموفق'`), open = `isQuoteOpen`
— **never** compares `effectiveResult` against `'موفق'`/`'ناموفق'`, since `result` can't hold
them (see `filters.js`). `quoteToSaleRate` = won/(won+lost+open), `0` when `quoteTotal` is 0 (UI
shows "—" from `quoteTotal`). `computeKpis(records, callFilters?)` — 6 cards (leads, customers,
open inquiries, deactivated, in follow-up, no answer), each with `target:{href,filters}` so the
click opens a list whose count equals the card. `computeAgentReport` / `computeAgentStats` (adds
`recs`, the agent's matching calls, for the profile modal) wrap `summarize` per agent: `total` is
the call count, `converted` = customers. `agentColor` — 3 hardcoded
brand colors for FARNAZ/PARDIS/ZOHREH, falls back to a deterministic HSL hash for any other
coordinator. `computeFunnelStages` returns `{stages, leadConversionRate, quoteToSaleRate,
quoteTotal}` — 4 stages (companies → in follow-up → companies with an inquiry → customers).
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
the original's separation of "read the file" from "what happens on import." `parseImportFile`
deliberately doesn't resolve the raw `category` text to a `categoryId` itself (it has no
access to the live `categories` list) — `resolveImportCategoryIds(records, categories)` does
that afterward, applying the same chemical/polymer alias mapping as the categories migration
(`Polymer`/`Petrochemical`/`Chemical` → the `Chemical/Polymer` category). The leads and customers
exports pass `leadList(allRecords, filters, segment, chartFilter)` into `exportToExcel`, so an
export is one row per **company** and respects the active filter + chart drill-down (columns
include «دما» and «تعداد تماس»; price/priority are gone). **`xlsx` is loaded with a dynamic
`import('xlsx')` inside every export/import function** (`exportToExcel`, `exportProductsToExcel`,
`downloadImportTemplate`, `parseImportFile` are all `async` now) so the library no longer ships in
the `/leads`/`/customers` bundles — callers must `await` them. Excel **import stays lenient**
(`addRecords` → `/api/leads/import`); the add form and quick call use the strict `addRecord` →
`POST /api/leads` instead.

### `calendarEvents.js`, `productStats.js` — pure data-prep for `/calendar` and the company report
`calendarEvents.js`: `buildDayIndex(records, reminders, agent)` → `Map<'yyyy-mm-dd', {reminders, calls}>`
(undone reminders by `dueDate`; calls = `isCall` rows by their `dd.mm.yyyy` date, both filtered through
`matchesFilter` on the agent), `periodOf(cursor, view, jalali)` (month = whole weeks starting Saturday;
week; day), `stepCursor`, `cellLabel`, `monthKeyOf`, `isoOf` (local-time ISO — never `toISOString`, which
shifts the day); call dates with a 2-digit year or no zero padding are normalized to the same key. Verified: 1 Aban 1405 = 23 Oct 2026, Esfand→Farvardin rolls the year.
`productStats.js`: `contacts.product` is free text (often a list), so `makeProductMatcher(names)` finds the
known product names inside it (token-boundary match on `normText`, longest name first and removed once
matched, so «TEXTILE PET» is not also counted as «PET»); no match → `UNKNOWN_PRODUCT` («نامشخص», ~17% of
production calls). `productStats(records, names)` → `{byCompany: Map<companyKey, {product: calls}>,
total}` over `isCall` rows; `productColor(name)` is the same deterministic HSL hash as `agentColor`.

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

`getUnifiedFeed(key)` (per-company changelog + comments, sorted newest-first) and
`addComment`/`addChangeLogEntry` are consumed by `CompanyActivityTabs.jsx`
(`src/components/customer/`) — the one shared tab body for a company's activity, used by
both `LeadProfileModal.jsx` (a single lead's profile) and `CompanyReport.jsx` (the
company-wide view), so the two surfaces show identical changelog/correspondence/reminders
without cross-navigating. **Scoping inconsistency, pre-existing, not introduced by that
component:** `AppShell.jsx` passes `LeadProfileModal` the raw unscoped `records`/
`companyMeta` straight from `useStore` (not `useScopedData`) — `reminders` was added the
same unscoped way when the reminders tab was built, matching that existing pattern rather
than fixing it. `CompanyReport.jsx` (via `/company-report/page.js`) gets all three through
`useScopedData`, which IS agent-narrowed. A manager/admin never notices (both scoped and
unscoped resolve to "everything"); a plain `agent` role could in theory see a reminder
`forAgent`-assigned to a different agent for the same company via the lead-profile route but
not via `/company-report` — a real inconsistency, but scoped to whether they can *see* a
reminder's existence, not a security boundary (no mutation, no PII beyond what's already
in that company's shared record set). Fix it in `AppShell.jsx` if this bites someone —
route `LeadProfileModal` through `useScopedData()` there too — but that's a bigger change
than adding the reminders tab warranted on its own, so it wasn't done as part of this.
The reminders tab also lets a user **create** a reminder directly (`addReminder`, same
shape as `LeadProfileModal`'s own pre-existing `reminder`/`quickReminder` mini-forms:
`{date, time, for, text}` → `{custKey, company, dueDate, dueTime, forAgent, text,
createdAt, done:false}`) — closes the gap where reminders could previously only be created
while editing a lead's form or during a quick-call. `company` (the display-name string, not
`custKey`) and `currentUser` (for `scopedCoordOptions(currentUser)`'s role-scoped agent
picker) are threaded in as two more props alongside `custKey`/`reminders`. Matches the
existing flows' two non-obvious behaviors exactly: `forAgent` falls back to
`currentUser?.agentCode` when the "برای چه کسی" picker is left blank (never bare `null` —
`scopeBootData` in `serverOps.js` drops a `null`-`forAgent` reminder from the boot payload
for both `agent` and `manager` scopes, so an un-assigned reminder would otherwise be
invisible to everyone but admin/developer), and every successful `addReminder` here is
paired with an `addChangeLogEntry(custKey, ...)` call, same as `LeadProfileModal`'s two
reminder-creation paths — a reminder created from this tab now leaves the same
"یادآوری برای … ثبت شد" trail in تاریخچه تغییرات that every other reminder-creation
surface already does. If you add a fourth reminder-creation surface anywhere, pair
`addReminder` with both of these — never one alone.

**Deleting a company's last call deletes the company.** The old `EMPTY_RECORD_PATCH` blanking
(which left ghost companies in every list) is gone. `deleteCompany(company)` removes the company's
rows, activity (comments/changelog), reminders and notifications locally and on the server
(`DELETE /api/companies`, op `deleteCompany`); the three delete entry points (`LeadProfileModal.jsx`'s
`handleDelete`, `src/app/leads/page.js`, `src/app/customers/page.js`) confirm first and use it when no
other row of the company remains. Each page's `records` IS pre-narrowed by `converted`, so the "is this
the last record" check and the `find` of the clicked row use the FULL `useScopedData().records` —
call it `allRecords` — never the page's narrowed `records`. A fourth delete entry point must follow
the same `allRecords`-not-`records` rule.
**Renaming a company** is `renameCompany(oldName, newName, author)` (`PATCH /api/companies`, op
`renameCompany`): one transaction updates `contacts.company`, `customer_activity.company_key`, and
`reminders`/`notifications` `cust_key`+`company`, and writes a changelog entry on the new key, so a
rename can no longer split a company's history. Renaming onto an existing company **merges** them
(elevated roles only; `LeadProfileModal` asks for confirmation, an agent gets a toast). The modal's
save calls `renameCompany` and omits `company` from the row patch.
Client singleton holding `records`/`companyMeta`/`reminders`/`currentUser`, backed by
**MySQL via the REST API in `src/app/api/*` (client `apiClient.js` → server `serverOps.js`)** —
the prototype's `window.storage` is gone, and the former `src/app/actions.js` Server Actions
layer is gone too (replaced wholesale by the API). `loadAll()` calls `loadAllDataAction` once
(guarded against re-entry) and stashes
`currentUser`; mutations go through `persist(rollback, actionFn)`, which applies the change
optimistically and rolls back on failure, redirecting to `/login` on `UNAUTHORIZED`/`FORBIDDEN`.
`logout()` clears state and redirects. `custKey` is `companyKey` re-exported from `companies.js`
(`normName` + lowercase, so Arabic/Persian letter variants are one key); it lives here rather than
`filters.js` only because it's needed to key `companyMeta`/reminders — anything else needing a
company key should import it from here. **The real access-control boundary is server-side now**
(see `auth.js`/`serverOps.js`/`queries.js` below: `resolveScope(user)` + `scopeBootData()`, plus
per-record checks in the leads API routes) — `GET /api/data`/`POST /api/sync` already return only
the records/reminders/companyMeta a `department`/`agent`-scoped `role` is allowed to see.
`useScopedData` (folded in from a separate `useScopedData.js`) is the read hook every top-level
page uses instead of `useStore((s) => s.records)`; on top of the server-scoped data it already
received, it applies one further client-side narrowing — filtering `{records, reminders,
companyMeta}` down to the current user's own `agentCode` — but **only when `role === 'agent'`**
(a `manager` sees their whole server-scoped department by default, not just their own records;
admin/developer have no `agentCode` and see everything). This narrowing is a "default view"
convenience on top of already-authorized data, not itself a security boundary — removing it would
only change what an agent sees by default, not what they're allowed to fetch. There is no
user-facing toggle to opt out of it; the removed "همه" (all) option in `UserMenu.jsx` predates
real server-side scoping and was dropped as a false sense of control back when it was the only
scoping that existed.
The prototype's "بازگشت به داده اولیه" reset (`resetToSeed`, `/api/admin/reset`, `resetData`,
`reseedLeads`, `src/data/seed.js`) was **removed entirely** — on the shared production DB it could
wipe everyone's data, and it also dragged the whole seed file into every page's client bundle.
`markAllNotificationsRead()` marks all of the caller's own notifications read (per-recipient).
`refreshNotifications()` (polled every 60 s by `NotificationsBell`, skipped when the tab is hidden) swaps in the server's list without a re-render when nothing changed, and keeps anything already marked read locally.
`syncNow()` replays the offline queue and
swaps in the fresh server data.

**Read path & DB-hit pattern (for future reference):** `loadAllData` reads from **MySQL as
primary** and only falls back to the disk `snapshot.json` when the DB is unreachable
(`isConnError`) — disk is the emergency path, not the default. It runs **once per app open**
(guarded by `state.loaded`/`state.loading`); there is **no full reload per edit** — mutations
are optimistic and the in-memory store is the UI's source of truth, so a normal edit is ~2 DB
round-trips (the `getUserById` auth re-validation + the one write). No sync polling runs
while online (the 20s `syncNow` timer in `AppShell` fires only while `offline === true`); the only
online interval is the `/messages` visible-tab message poll (`MessengerPanel`, 20 s), which never
touches the store or the boot payload.
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
  (`crm_lead_order_${username}` / `crm_lead_flags_${username}`), same per-username-key convention
  as `uiStore.js`'s `calendar`/`fontScale` prefs. `initLeadPrefsForUser` runs from `store.loadAll`; `resetLeadPrefs`
  from `store.logout`. **Manual ordering is applied in `LeadTable.jsx` *after* `getFiltered`
  returns (passing `sort=null` in manual mode) — never inside `filters.js`**, whose order of
  operations mirrors the prototype and must stay pure. Records absent from `order` sort after
  the ranked ones, preserving their `getFiltered` order. Drag-drop reorders the full stored
  `order` (so filtered-out rows keep their positions), not just the visible page.
- **`auth.js`** (server-only): `getSessionUser()` reads the `crm_session` cookie, decrypts it,
  and **re-validates the user against the DB on every call** (React `cache` memoizes
  per-request) — `proxy.js` is not a security boundary, so this is the real check. Falls back
  to the token payload only when the DB is unreachable (`isConnError`), so offline mode still
  works — the offline-fallback payload also carries `department` (from the session token) so
  scoping keeps working while offline. `requireUser()`/`requireAdmin()` throw
  `UNAUTHORIZED`/`FORBIDDEN`; **every API route handler calls one at the top** (via
  `apiHandler.handle`). `isElevated(user)` (`role === 'admin' || 'developer'`) is the one helper
  every department-scoping check in `serverOps.js`/`queries.js`/the leads & users API routes
  branches on first — elevated always bypasses scoping entirely. `requireElevated()` is the
  route-guard wrapper (`requireUser()` + `isElevated()` check) gating all `users` table CRUD
  (`POST /api/users`, `PATCH`/`DELETE /api/users/[id]`, `PATCH /api/users/[id]/active`) —
  `manager` does not get an exception here, by design (see `serverOps.js` below).
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
  fallback + a fire-and-forget `writeSnapshot` — not awaited, with a per-call unique tmp file so
  concurrent boots can't interleave), `syncData` (replay queue in one transaction → `loadAllFromDb` →
  snapshot), `importLeads` (per-record queue on DB-down), `authenticateUser`. `checkLeadScope` / `checkReminderScope`
refuse with a **`400 VALIDATION` message, never 403** (the client treats 403 as "logged out").
  `loadBootData(user)`/`syncData(user)` additionally resolve `resolveScope(user)` (`{type:'all'}`
  for elevated, `{type:'department', agentCodes}` for a manager via `listAgentCodesByDepartment`,
  `{type:'own', agentCode}` for an agent — fails closed to an empty set on a lookup error) and run
  the response through `scopeBootData(data, scope)`, a pure in-memory filter over
  `records`/`reminders`/`notifications`/`companyMeta` (products/categories are never scoped — see
  `filters.js` above). **Company-level sharing (added 2026-09-09):** `scopeBootData` first computes
  the scoped user's directly-owned records (`matchAgent(r.coordinator)`, same as before), then
  derives the set of companies those records belong to (`ownedCompanyKeys`) and widens `records` to
  include EVERY record for any company in that set — regardless of which coordinator/department
  owns it. This is the fix for the reported gap where two departments both working the same
  company/lead couldn't see each other's side of it. `reminders` gets the same treatment via
  `rm.custKey`. **This only widens READ scope** (what `loadBootData`/`syncData` return) — write
  permission is completely unaffected, still gated purely by `checkLeadScope`'s coordinator check
  (below), which was NOT touched: you can now see a lead another department owns, but still can't
  edit/delete it unless you're elevated or it's actually assigned to your scope. An agent/manager
  with zero company overlap with anyone else sees exactly what they saw before this change — the
  widening only activates when `ownedCompanyKeys` actually has an entry another coordinator also
  used. Verified against the live dev DB (dummy cross-department companies, confirmed shared
  visibility + confirmed an unrelated company never leaks in) before shipping. `notifications` is
  NOT widened by company-sharing — it stays a strict `matchAgent(n.forAgent)` filter, since a
  notification is inherently addressed to one specific agent, not company-wide. **Critically,
  `loadAllFromDb()` itself — and the `snapshot.json` it writes — stays
  always unscoped**; scoping is applied as a post-filter on top of either the live query or the
  snapshot read, never baked into the snapshot-writing query. Scoping a snapshot at write time
  would let one user's restricted view become the shared offline-fallback file, potentially
  serving a different, less-privileged user's session someone else's data during a DB outage.
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
  `createLead` / the bulk `upsertLeads` (**insert-only**: `ON DUPLICATE KEY UPDATE id=id`, so an offline-queue
  replay or a crafted id can never overwrite an existing lead; `createProduct`/`createCategory` swallow only a
  duplicate of their OWN id on replay, a genuine duplicate name still errors), `updateLead`, `deleteLead`. Also holds `temperature` (`'hot'|'warm'|'cold'|NULL`,
  the manual lead-temperature override; every query selects it explicitly, so the column must exist —
  `db/schema.sql`/the production fix scripts add it). The override is **company-level but stored on rows**:
  `store.js`'s `setCompanyTemperature(company, temp)` writes it to the company's latest row (or clears
  it on every row), and `companies()` reads the first non-null newest-first, so a newer call never loses
  an older override (deleting the one row that carries it does drop it — set it again). Holds the 8 quote/deactivation columns
  (`deactivate_reason`, `quote_price`, `quote_price_type`, `quote_terms`, `quote_price_date`,
  `quote_result`, `quote_result_date`, `quote_fail_reason`) added for the inquiry workflow —
  `quote_price_date`/`quote_result_date` are `dd.mm.yyyy` VARCHAR like `date`, not SQL `DATE`, to
  match the rest of this app's date convention (`normDate` in `mappers.js` covers all three).
  `updateLead` maps camelCase patch keys to snake_case columns via the `LEAD_UPDATE` `{k, col}`
  array (the multi-word quote fields don't collapse to their column name the way the single-word
  legacy fields did).
- **`customer_activity`**: `listActivity`, `getActivityById`, `createActivity` (upsert — so routes must refuse an existing id before calling it), `updateActivity` (text only), `deleteActivity`. It also holds the messenger channel: rows with `type='message'`, `company_key='#public'`, read only through `listMessages(since)` (latest 200, ascending) and written by the `addMessage` op (message + mention notifications in one transaction). **Every general read excludes them** (`listActivity` and `loadAllFromDb` filter `type<>'message'`; `renameCompany`/`deleteCompany` skip them) so chat never reaches `companyMeta`, the boot payload or `snapshot.json`.
- **`reminders`**: `listReminders`, `getReminderById`, `createReminder` (upsert), `updateReminder`, `deleteReminder`.
- **`notifications`** (added 2026-09-09, new table — see `db/README.md`'s Migration history):
  persistent per-agent notifications, distinct from `reminders` (due-date follow-ups). `listNotifications`,
  `createNotification` (idempotent upsert like every other `create*` — **required**, not
  cosmetic: `updateLeadWithNotification`/`addComment`'s notification branch both run inside the
  offline-queue replay path, and a plain non-upsert `INSERT` would throw `ER_DUP_ENTRY` and jam
  the whole queue forever if a sync partially succeeds then fails before the queue is cleared —
  this was caught in review and fixed before shipping), `markNotificationRead`;
  `findCompanyOwnerByCustKey(key)` resolves a company's current coordinator (most-recent record
  by `contact_date`) — used to decide WHO gets notified, never exposed to the client. Deliberately
  does its own exact-match filtering in JS (`Utils.normSpace(...).toLowerCase()`, matching
  `custKey()`'s contract byte-for-byte) after a cheap SQL `LIKE` pre-filter, rather than trying to
  replicate whitespace-collapsing in SQL — the live dev DB is actually MySQL 5.7 (despite
  `db/README.md`/`schema.sql` documenting "MySQL 8+"; worth reconciling separately, not touched
  here), so `REGEXP_REPLACE` isn't available, and a bare SQL `LOWER(TRIM(...))` under-normalizes
  (misses internal double-spaces) versus what `custKey()` actually produces client-side — caught
  in review, fixed, and verified against a live double-space company name before shipping.
  Notifications are only ever constructed server-side (no client-facing Zod
  schema; nothing accepts a raw notification object from a request body) at 3 hook points, each
  skipping the notification entirely if the acting user IS the recipient (no self-notify): (1)
  `POST /api/activity` — a new comment notifies the company's coordinator; (2)
  `PATCH /api/quotes/[id]` (`announce-price`/`resolve`) — notifies the lead's own coordinator when
  someone else prices/resolves their open quote; (3) `PATCH /api/leads/[id]` — notifies the NEW
  coordinator when a lead's `coordinator` patch field actually changes to someone else. (2) and (3)
  route through the new `applyOp` case `updateLeadWithNotification` (wraps the existing `updateLead`
  + a `createNotification`, transaction-wrapped like `deleteLead`) instead of touching the plain
  `updateLead` case — **`updateLead` itself was deliberately left untouched**, so every other caller
  (quick-calls, the edit form, bulk import) is unaffected; a
  regression test confirmed a plain `updateLead` call creates zero notifications. `POST /api/activity`
  similarly extends the existing `addComment` case with an optional `payload.notification` — omitted,
  it's byte-identical to the pre-existing behavior. All 3 hook points were verified end-to-end against
  the live dev DB (dummy company/lead, confirmed notification creation, `updateLeadWithNotification`'s
  patch still applies correctly, `markNotificationRead` persists) before shipping.
- **`users`**: `listUsers`/`listUsersRaw`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, plus finders
  (`findUserByUsername`, `findUserByEmail`) and partial setters (`updateUserLastLogin`, `setUserActive`).
  `role` is a 4-value ENUM: `admin`, `developer` (both "elevated" — see `isElevated()` in
  `auth.js`, they bypass all scoping and see/manage everything), `manager` (department-scoped
  view of leads/customers/reminders/activity and of the `users` list, but **no create/edit/delete
  rights over other users** — those stay elevated-only, same as before this role existed), and
  `agent` (own-records-only scope). `department` (`users.department VARCHAR(150) NULL`) is a
  plain free-text column — same "no lookup table" trade-off as `source`/`agentCode` (see below),
  not a separate `departments` table/FK. The distinct-values list for its UI datalist comes from
  `listDepartmentNames()` (`SELECT DISTINCT department ...`); `findDepartmentByNormalizedName(name)`
  does the duplicate-prevention canonicalization (trim + lowercase compare) so `POST`/`PATCH
  /api/users[/id]` never create a near-duplicate department from a casing/whitespace typo;
  `listAgentCodesByDepartment(department)` resolves a manager's own department to the `agentCode`
  set used for scoping. `GET /api/departments` (`requireUser`) exposes `listDepartmentNames()` to
  the client for the `UserFormModal.jsx` department field, which is a free `<input list>` +
  `<datalist>` — the same UI pattern as `source`, not a constrained Dropdown — with the strict
  duplicate rejection enforced server-side instead.
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
  `category` column on `products`/`contacts` is retained for external/legacy consumers that still
  read it directly from the DB — `createProduct`/`updateProduct`/`createLead`/`updateLead`/
  `upsertLeads` write-sync it from `categoryId` on every save (via `CATEGORY_NAME_SUBQUERY` in
  `queries.js`), so it's never stale even though app code itself reads `category_id` exclusively.
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
also wire the offline path. `loadAllFromDb` is the bulk read, not CRUD.
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
`openProfile(id, quickCall = false, tab = 'form')` also takes the profile modal's starting tab
(`ui.profileTab`, reset on close) — a comment notification/banner opens `'correspondence'`, so the
comment is on screen instead of hidden behind the form tab. Comment edit/delete is
`store.updateComment/deleteComment(key, id, …)` (author or elevated, enforced server-side).
`applyLeadFilter(partial)` is the one way a card/KPI/agent-row click opens a list: it resets
`chartFilter` and sets `{...DEFAULT_FILTERS, ...partial}`, so the list count equals the card
(the old `applyKpiFilter` and `getFiltered`'s `type:'kpi'` branch are gone). While on `/leads`,
`setFilters` mirrors the filters to the URL with `history.replaceState`
(`?agent=&status=&temp=&cat=&source=&product=&from=&to=&q=`, list values comma-joined) and
`/leads` calls `hydrateFiltersFromUrl()` on mount (only when the URL has a query), so a refreshed or
shared link keeps its filter; a chart `chartFilter` is not mirrored and does not survive a shared link.
`ui.filters` (`DEFAULT_FILTERS`, now including `temp`) is shared, global state, not per-page — `/leads`'
`LeadFilters` (multi-select `coordinator`, via `Dropdown`'s `multiple` mode) and `/agents`'
`AgentsPanel` chip row (`setCoordinatorFilter`, exposed as `activeCoordinator`/
`onToggleCoordinator` in `src/app/agents/page.js`) read/write the exact same
`filters.coordinator` field. The chip row is a **deliberately single-exclusive quick-pick**
(clicking a chip always narrows to just that one agent, clicking the sole active one clears
it — same "owns exactly one value" contract as a chart drill-down, not a second multi-select
UI), while the dropdown is genuinely multi-select — so `AgentsPanel`'s chip *highlight* check
must be array-safe (`Array.isArray(activeCoordinator) ? .includes(n) : === n`, so multiple
dropdown-selected agents still show `-active`) but the chip *click* handler deliberately stays
plain `activeCoordinator === n` (not array-aware) so a chip click always collapses to a single
agent rather than merging into the dropdown's array. Don't "fix" the click handler to be
array-toggle-aware to match the highlight logic — that was tried and reverted; the two need
different logic on purpose because they answer different questions ("is this chip part of the
current selection" vs. "what should clicking it set").
`calendar` and `fontScale` are localStorage-persisted, following `theme.js`'s SSR-safe
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
