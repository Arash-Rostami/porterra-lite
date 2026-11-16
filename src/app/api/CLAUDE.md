# src/app/api — REST routes

**Route handlers are intentionally thin — don't put business logic here.**
Every handler follows the same shape: `require*()` (auth) → `parseOrThrow()`
(Zod validation, `../../lib/models.js`) → `serverOps.js`/`queries.js` call →
`NextResponse.json(...)`, wrapped in `apiHandler.js`'s `handle()` for
error→status mapping (`UNAUTHORIZED`→401, `FORBIDDEN`→403, `VALIDATION`→400,
else 500). **The real logic lives in `../../lib/CLAUDE.md`** — read that file
for what each table/mutation actually does; this file is just the route map
and auth level, so the two docs don't duplicate each other.

`src/proxy.js`'s matcher excludes `/api` on purpose — an unauthenticated API
call returns 401 JSON here (handled by `apiClient.js`) instead of a redirect,
which is correct for a fetch caller.

## Auth levels

- **`requireUser()`** — any authenticated user (agent/manager/admin/developer).
- **`requireElevated()`** — `role === 'admin' || 'developer'` only.
- **`requireAdmin()`** — `role === 'admin'` only (rarer — used for the raw
  user-list-with-passwords debug view). The old full-data-reset route was deleted on purpose:
  with a shared production DB it could wipe everyone's data.

**Scope refusals are `400 VALIDATION` with a Persian message, never `403`**: `store.js`'s `persist()` treats
401/403 as "session expired" and redirects to `/login`, so a normal "this lead/reminder belongs to another
agent" refusal must not use it (`checkLeadScope` and `checkReminderScope` in `serverOps.js` follow this).
Routes whose underlying insert is an upsert refuse an already-existing id (`/api/leads`, `/api/leads/import`,
`/api/activity`, `/api/reminders`), and `createActivity` itself is write-once (`ON DUPLICATE KEY UPDATE id=id`).

Department/own-record scoping on top of these (a `manager` seeing only their
department, an `agent` seeing only their own records) is enforced inside
`serverOps.js`/`queries.js`, not visible at the route level — see
`../../lib/CLAUDE.md`'s `auth.js`/`serverOps.js` section for `resolveScope`/`scopeBootData`.

## Route table

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | — | Email+password login, sets `crm_session` cookie. |
| `/api/auth/logout` | POST | — | Clears the session cookie. |
| `/api/auth/me` | GET | session (soft) | Current user from the session cookie. |
| `/api/data` | GET | requireUser | Full scoped boot payload (records/reminders/notifications/companyMeta/products/categories/agents) — `store.js`'s `loadAll`. |
| `/api/sync` | POST | requireUser | Replay offline queue + refresh boot data — `store.js`'s `syncNow`. |
| `/api/leads` | POST | requireUser | Create a lead (physical table `contacts`) — the **strict** path used by the add form and the quick call: product + category required, a given phone needs ≥10 digits, an empty source becomes `'سایر'`, and a non-elevated user's source must be one of `SOURCE_OPTS` (admin/developer may add new ones); the product is trimmed, the `categoryId` must exist, and an **already-existing lead id is refused for every role** (`createLead` is an upsert, so this closes an overwrite-someone-else's-lead hole; the id/category lookups are skipped on a DB-connection error so the op still queues); refusals are `400 VALIDATION`. The lenient bulk path is `/api/leads/import`. Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/leads/[id]` | PATCH, DELETE | requireUser + `checkLeadScope` | Update / delete one lead (a non-elevated PATCH may not change `company` — renaming goes through `/api/companies`, which carries the merge rule). A PATCH that actually changes `coordinator` to someone other than the acting user notifies the new coordinator (`updateLeadWithNotification` — see `../../lib/CLAUDE.md`'s `queries.js` `notifications` entry). |
| `/api/leads/by-company` | GET | requireUser | The single most-recent lead for one company name (`findLatestLeadByCompany`, `queries.js`) — **deliberately unscoped** (any authenticated user, no department/agent narrowing) so `AddLeadForm`'s autofill still finds a match another agent logged. Fires on `CompanySuggest`'s `onSelect` (picking a live-typeahead suggestion) and still on plain blur (typing a full company name with no suggestion picked) — see `AddLeadForm.jsx`'s `autofillFromCompany`. |
| `/api/leads/import` | POST | requireUser | Bulk `.xlsx` import (per-record offline-queueable). Lenient on content (no product/category requirement) but **not on ownership**: `records` must be an array of objects; a non-elevated user's rows must have a coordinator inside their scope (an agent's empty coordinator becomes their own code); any id that already exists is refused (the insert is an upsert, so this closes an overwrite-another-agent's-lead hole). |
| `/api/quotes/[id]` | PATCH | requireUser + `checkLeadScope` | Quote lifecycle transitions (`announce-price` / `resolve`) via `action` body field — still just a lead patch under the hood, so it enforces the same department/own-record scope as `/api/leads/[id]` (both call the shared `checkLeadScope` in `serverOps.js`). If the lead's coordinator differs from the acting user, this also notifies them (`updateLeadWithNotification` — see `../../lib/CLAUDE.md`'s `queries.js` `notifications` entry). |
| `/api/notifications` | GET | requireUser | The caller's own notifications only (`for_agent` index) — polled once a minute by the bell (visible tab only) so new mentions light it without a reload. |
| `/api/companies` | PATCH, DELETE | requireUser + `checkLeadScope` on every row of the company (merge — renaming onto an existing company — additionally needs `isElevated`) | PATCH `{company, rename, entry?}` (the changelog `entry` is forced to type `change`; the op carries `allowMerge: isElevated(user)` and a `scope`, and **re-checks both inside the transaction** (every row of the company must be in the caller's scope, so a call inserted between the route check and the write cannot be renamed/deleted by an out-of-scope user; a payload without `scope` is refused). Privilege refusals from `requireAdmin`/`requireElevated`/user patch are `400 VALIDATION`, never 403 (the client treats 403 as logout). `/api/reminders` POST requires `forAgent`; `/api/activity` stamps the author server-side for every type; `/api/leads/import` refuses duplicate ids inside one batch (the Excel importer now numbers ids `IMP-<stamp>-<row index>`; random ids collided about once per 3,000 rows), queued `createReminder` is insert-only, the offline-queue append chain recovers after a failed write, and `syncData` replays each queued op in its own transaction, dropping non-connection failures so one bad entry cannot strand the queue, so a queued replay cannot merge two companies without the admin gate): rename/merge a company across `contacts`, `customer_activity`, `reminders`, `notifications` in one transaction (op `renameCompany`). DELETE `{company}`: delete the company and all its rows/activity/reminders/notifications (op `deleteCompany`). The route looks the company up first (`findLeadRefsByKey`: a database-side prefilter that folds ي/ى/ك and escapes `%`/`_`, then the exact `companyKey` match in Node — only the matching rows' id/company/coordinator leave MySQL, and `findCompanyOwnerByCustKey` shares it; this is the exact predicate the mutation uses), so unlike the other routes it returns an error, not a queued op, when the DB is down; scope/merge refusals are `400 VALIDATION` with a message (never `403`, which the client treats as "logged out"). |
| `/api/activity` | POST | requireUser + company visibility (the company key is canonicalized server-side; the company must exist and a non-elevated user must own at least one of its rows; skipped only when the DB is unreachable so offline comments still queue) | Add a comment/changelog entry for a company. A new comment (not a changelog entry) also notifies the company's current coordinator if it isn't the commenter themselves — see `../../lib/CLAUDE.md`. |
| `/api/activity/[id]` | PATCH, DELETE | requireUser + author-or-elevated | Edit (`{text}` only) / delete a **comment**; changelog entries and messenger messages are refused. Only the author (`user.displayName \|\| user.username`, which `POST /api/activity` now stamps server-side on comments so it can't be spoofed) or admin/developer may change one; refusals are `400 VALIDATION`. **Identity is the display-name string** (there is no author-id column): renaming a user locks them out of their own old comments, and two users with the same display name could edit each other's — an `author_user_id` column would be the proper fix. The author lookup hits the DB first, so edit/delete is not queued while the DB is down (the optimistic change rolls back with a toast). `POST /api/activity` refuses an id that already exists (the underlying insert is an upsert, which would otherwise let anyone overwrite another user's comment). |
| `/api/messages` | GET, POST | requireUser | Messenger phase 1 (one public channel, stored as `customer_activity` rows with `type='message'`, `company_key='#public'`). GET `?since=ts` → the latest 200 messages newer than `ts`, ascending. POST `{text}` → stores the message and, in the same transaction (op `addMessage`), one `mention` notification per active user (never the sender) whose `@displayName`/`@username` appears as a whole word (boundary regex — `@ali` does not match `@alireza` or `x@ali.com`; recipients whose key exceeds the 32-char `for_agent` column are skipped). The response carries `message` only when the op was applied (not when it was queued offline). Messages are excluded from `/api/data`'s boot payload — **both** `listActivity` and `loadAllFromDb` filter `type<>'message'` — so they never reach `companyMeta` or `snapshot.json`; `renameCompany`/`deleteCompany` also skip `type='message'` rows so a company literally named `#public` cannot touch the channel. The client polls with a 10 s overlap window and de-duplicates by id (commit order can differ from `ts` order). No rate limit in phase 1. `POST /api/activity` fails closed (no queueing) for ids starting `msg-`. |
| `/api/reminders` | POST | requireUser + `checkReminderScope` | Create a reminder (`forAgent` must be inside the caller's scope; an existing id is refused). |
| `/api/reminders/[id]` | PATCH, DELETE | requireUser + `checkReminderScope` | Update/delete a reminder — only its `forAgent` (or admin/developer, or a manager over their department) may; re-assigning is checked against the new `forAgent` too. |
| `/api/reminders/[id]/done` | POST | requireUser + `checkReminderScope` | Mark a reminder done (same ownership rule). |
| `/api/notifications/[id]/read` | POST | requireUser | Mark one notification read **for its recipient only** (`UPDATE … WHERE id=? AND for_agent=?`, recipient = `Utils.recipientKey(user)`); `id = all` marks all of the caller's own unread. The boot payload (`scopeBootData`) now sends every role only its own notifications, so an admin/manager can no longer clear an agent's. No `GET`/list route: notifications ride along in `/api/data`'s boot payload, same as reminders. |
| `/api/products` | POST | requireUser (open to any authenticated user — the inline "add on the fly" widget relies on this) | Create a product. Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/products/[id]` | PATCH, DELETE | requireElevated | Edit/delete a product. |
| `/api/categories` | POST | requireUser (same inline-create rationale as products) | Create a category. Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/categories/[id]` | PATCH, DELETE | requireElevated | Edit/delete a category (delete blocked by `ON DELETE RESTRICT` if in use). |
| `/api/departments` | GET | requireUser | Distinct department names, for the `UserFormModal` datalist. |
| `/api/users` | GET, POST | requireUser (GET; `?raw=1` variant is requireAdmin), requireElevated (POST) | List users (scoped by department for `manager`) / create a user. |
| `/api/users/[id]` | PATCH, DELETE | requireUser (PATCH, self-edit allowed for some fields — see route body), requireElevated (DELETE) | Edit / delete a user. |
| `/api/users/[id]/active` | PATCH | requireElevated | Toggle a user's active flag. |

If you add a new route, add its row here in the same table — this is meant
to stay the one place to check "what auth does this endpoint need" without
opening the file.
