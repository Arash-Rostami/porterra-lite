# src/app/api — REST routes

**Route handlers are intentionally thin — don't put business logic here.**
Every handler follows the same shape: `require*()` (auth) → `parseOrThrow()`
(Zod validation, `../../lib/models.ts`) → `serverOps.ts`/`queries.ts` call →
`NextResponse.json(...)`, wrapped in `apiHandler.ts`'s `handle()` for
error→status mapping (`UNAUTHORIZED`→401, `FORBIDDEN`→403, `VALIDATION`→400,
else 500). **The real logic lives in `../../lib/CLAUDE.md`** — read that file
for what each table/mutation actually does; this file is just the route map
and auth level, so the two docs don't duplicate each other.

Every route handler here is `route.ts` (all 24 converted to TypeScript). Imports
into `../../lib`/`../../types` must be extensionless (no `.js` suffix) — see
`../../lib/CLAUDE.md` for why (Turbopack won't resolve a `.js`-suffixed specifier
to a `.ts` file, even though `tsc --noEmit` accepts it).

`src/proxy.js`'s matcher excludes `/api` on purpose — an unauthenticated API
call returns 401 JSON here (handled by `apiClient.ts`) instead of a redirect,
which is correct for a fetch caller.

## Auth levels

- **`requireUser()`** — any authenticated user (agent/manager/admin/developer).
- **`requireElevated()`** — `role === 'admin' || 'developer'` only.
- **`requireAdmin()`** — `role === 'admin'` only (rarer — used for the raw
  user-list-with-passwords debug view and the full data reset).

Department/own-record scoping on top of these (a `manager` seeing only their
department, an `agent` seeing only their own records) is enforced inside
`serverOps.ts`/`queries.ts`, not visible at the route level — see
`../../lib/CLAUDE.md`'s `auth.ts`/`serverOps.ts` section for `resolveScope`/`scopeBootData`.

## Route table

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | — | Email+password login, sets `crm_session` cookie. |
| `/api/auth/logout` | POST | — | Clears the session cookie. |
| `/api/auth/me` | GET | session (soft) | Current user from the session cookie. |
| `/api/data` | GET | requireUser | Full scoped boot payload (records/reminders/companyMeta/products/categories/agents) — `store.js`'s `loadAll`. |
| `/api/sync` | POST | requireUser | Replay offline queue + refresh boot data — `store.js`'s `syncNow`. |
| `/api/leads` | POST | requireUser | Create a lead (physical table `contacts`). Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/leads/[id]` | PATCH, DELETE | requireUser | Update / delete one lead. |
| `/api/leads/by-company` | GET | requireUser | The single most-recent lead for one company name (`findLatestLeadByCompany`, `queries.ts`) — used by `AddLeadForm` to autofill fields when the company name matches an existing lead. |
| `/api/leads/import` | POST | requireUser | Bulk `.xlsx` import (per-record offline-queueable). |
| `/api/quotes/[id]` | PATCH | requireUser + `checkLeadScope` | Quote lifecycle transitions (`announce-price` / `resolve`) via `action` body field — still just a lead patch under the hood, so it enforces the same department/own-record scope as `/api/leads/[id]` (both call the shared `checkLeadScope` in `serverOps.ts`). |
| `/api/activity` | POST | requireUser | Add a comment/changelog entry for a company. |
| `/api/activity/[id]` | PATCH, DELETE | requireUser | Edit/delete one activity entry. |
| `/api/reminders` | POST | requireUser | Create a reminder. |
| `/api/reminders/[id]` | PATCH, DELETE | requireUser | Update/delete a reminder. |
| `/api/reminders/[id]/done` | POST | requireUser | Mark a reminder done. |
| `/api/products` | POST | requireUser (open to any authenticated user — the inline "add on the fly" widget relies on this) | Create a product. Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/products/[id]` | PATCH, DELETE | requireElevated | Edit/delete a product. |
| `/api/categories` | POST | requireUser (same inline-create rationale as products) | Create a category. Listing happens via `GET /api/data`'s boot payload, not a per-route GET. |
| `/api/categories/[id]` | PATCH, DELETE | requireElevated | Edit/delete a category (delete blocked by `ON DELETE RESTRICT` if in use). |
| `/api/departments` | GET | requireUser | Distinct department names, for the `UserFormModal` datalist. |
| `/api/users` | GET, POST | requireUser (GET; `?raw=1` variant is requireAdmin), requireElevated (POST) | List users (scoped by department for `manager`) / create a user. |
| `/api/users/[id]` | PATCH, DELETE | requireUser (PATCH, self-edit allowed for some fields — see route body), requireElevated (DELETE) | Edit / delete a user. |
| `/api/users/[id]/active` | PATCH | requireElevated | Toggle a user's active flag. |
| `/api/admin/reset` | POST | requireAdmin | Wipe to seed data (`src/data/seed.js` — legacy shape, admin-only, unused in production). |

If you add a new route, add its row here in the same table — this is meant
to stay the one place to check "what auth does this endpoint need" without
opening the file.
