## Why

porterra-lite is a working, deployed CRM with no OpenSpec specs on record — `openspec/specs/` is empty. There is no single source of truth for *current, intended* system behavior beyond reading source code and the sister prototype (`public/panel_mostaqel_moshtarian.html`). This change documents the system as it actually exists today (verified against `src/lib/`, `src/app/api/`, `db/schema.sql`, and the `CLAUDE.md` doc map) so future changes can be proposed as deltas against a real baseline instead of against tribal knowledge.

## What Changes

- No code changes. This change only adds baseline spec files that describe currently-implemented behavior.
- Each capability below captures the requirements actually enforced by the running system (validation rules, state machines, auth/scoping tiers, and known deliberate design decisions such as reversible password encryption and outlier-capped chart bars) as observed in code.

## Capabilities

### New Capabilities
- `authentication`: session-cookie login/logout, reversible AES-256-GCM password storage, per-request DB re-validation.
- `authorization-scoping`: role tiers (admin/developer/manager/agent) and department/own-record data scoping, enforced server-side.
- `leads-contacts`: lead/contact CRUD, filtering, search, manual ordering, duplicate detection, status model.
- `quotes`: the 2-step quote sub-workflow (announce-price / resolve) nested inside a lead record.
- `agents-call-suggestions`: "who to call today" prioritization engine for agents.
- `reminders`: due-date reminders per lead/agent and the notification bell.
- `customer-activity`: merged comment + changelog feed per company.
- `products-catalog`: product CRUD linked to categories.
- `categories`: category lookup table CRUD and its migration from legacy free-text category fields.
- `users-management`: user CRUD, department assignment, role, active/inactive toggle.
- `reporting-analytics`: dashboard KPIs, funnel, trend/agent/category/source charts, company report, report builder.
- `excel-import-export`: `.xlsx` import with column-alias matching, filter-aware export.
- `offline-sync-queue`: append-only mutation queue and unscoped snapshot fallback when MySQL is unreachable.
- `admin-data-reset`: admin-only wipe-to-seed action.
- `ui-preferences`: calendar system (Gregorian/Jalali), font scale, theme, per-user lead view prefs — all display-only.
- `visual-design-system`: cross-cutting RTL visual/design-token contract kept in 1:1 sync with the sister app BMS-CM.

### Modified Capabilities
(none — `openspec/specs/` is currently empty, so every capability above is new)

## Impact

Documentation only: adds `openspec/specs/<capability>/spec.md` for each capability above once this change is archived. No source files, APIs, or dependencies are touched.
