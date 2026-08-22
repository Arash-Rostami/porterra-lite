# TypeScript conversion (phase 1: src/lib + API routes) — design

## Why

The upcoming Drizzle ORM migration (see `docs/superpowers/specs/2026-08-21-drizzle-orm-migration-design.md`) touches `src/lib/queries.js`/`mappers.js` across all 6 DB tables — exactly the kind of wide, mechanical refactor where TypeScript's compile-time checking (a renamed field, a missed call site) pays for itself. Doing this conversion first means the Drizzle migration lands typed from day one instead of retrofitting types onto Drizzle's inferred output later. The app is not live yet, which is also the cheapest point to absorb this kind of toolchain change.

## Non-goals

- No React component (`.jsx`) conversion. `src/app/**/page.js` and `src/components/**/*.jsx` stay JS — a separate, later pass.
- No test file (`*.test.js`/`*.integration.test.js`) conversion. Vitest transpiles `.ts` source on the fly; a `.js` test importing a `.ts` module needs no changes.
- No Drizzle work. This is purely a type-annotation pass over already-tested code — no behavior, no stored-format, no API-contract changes.
- No type derivation from `models.js`'s Zod schemas (see Decision below).

## Decision: allowJs, incremental

`tsconfig.json` sets `"allowJs": true`, so `.js` and `.ts` coexist for the duration of this and any future conversion phase. Files convert one at a time (or in tightly-coupled small groups), each independently verified (`tsc --noEmit`, existing tests, lint) and committed — same discipline as the pre-refactor test safety net plan.

## Decision: strict mode from day 1

`"strict": true` in `tsconfig.json` from the first converted file. This is deliberately more upfront friction than a loosen-then-tighten approach, because loosening later means re-auditing files already considered "done" — and strict null/shape checking is exactly what this conversion exists to buy before the Drizzle migration.

## Decision: hand-written domain types, not Zod-derived

`src/lib/models.js`'s Zod schemas (`LeadCreate`, `LeadUpdate`, etc.) validate partial, input-shaped create/update payloads — they don't match the full row shape `mappers.js`'s `rowToLead`/`rowToProduct`/etc. return (always-present `id`, fields that are required-but-nullable on read rather than optional-on-write). Rather than force one schema to serve two different shapes (or duplicate Zod schemas for read-shapes too), domain types are hand-written TypeScript interfaces in a new `src/types/` directory, one file per entity:

- `src/types/lead.ts`
- `src/types/product.ts`
- `src/types/category.ts`
- `src/types/user.ts`
- `src/types/reminder.ts`
- `src/types/activity.ts`

Each interface is written to match exactly what its corresponding `rowToX` function in `mappers.js` (soon `mappers.ts`) returns — this is the contract already exercised by the existing unit and integration tests, so the types describe *verified* current behavior, not aspiration.

## Scope: which files convert in this phase

**`src/lib/` (15 files), pure/no-DB layer first (lowest risk, already unit-tested), in this order:**

1. `utils.js` → `utils.ts`
2. `calendar.js` → `calendar.ts`
3. `filters.js` → `filters.ts`
4. `duplicates.js` → `duplicates.ts`
5. `analytics.js` → `analytics.ts`
6. `suggestions.js` → `suggestions.ts`
7. `models.js` → `models.ts`
8. `mappers.js` → `mappers.ts` (also the point at which `src/types/*.ts` files are created, since this file is what they describe)

**Then DB/infra layer (has integration test coverage), in this order:**

9. `db.js` → `db.ts`
10. `queries.js` → `queries.ts`
11. `serverOps.js` → `serverOps.ts`
12. `auth.js` → `auth.ts`
13. `crypto.js` → `crypto.ts`
14. `apiHandler.js` → `apiHandler.ts`
15. `apiClient.js` → `apiClient.ts`

**Not touched by this phase (client-only React state, no test coverage change needed, but excluded — see Non-goals for why):** `store.js`, `uiStore.js`, `theme.js`, `useCountUp.js`, `confirm.js`, `leadPrefs.js`, `excel.js` — these either import React (`useSyncExternalStore`) or are tightly coupled to component consumers; converting them without also touching components risks incomplete typing at the boundary. Deferred to the future component-conversion phase.

**Then `src/app/api/**/route.js` (24 files) → `.ts`**, same file-by-file discipline, after all of `src/lib`'s converted files they depend on are done.

## Tooling changes

- Remove `jsconfig.json`; add `tsconfig.json` preserving the `@/*` → `./src/*` path alias, plus Next.js's standard generated options (Next.js auto-populates required fields — `include`, `plugins`, etc. — the first time it detects a `.ts` file with no existing `tsconfig.json`; this conversion creates the file manually up front instead, to control `strict: true` from the start rather than letting Next.js's defaults land first).
- Add devDependencies: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`.
- Add npm script: `"typecheck": "tsc --noEmit"`.
- No ESLint config change needed — `eslint-config-next` already ships TypeScript-aware rules; `eslint.config.mjs`'s `nextVitals` preset picks up `.ts` files automatically once TypeScript is present.

## Verification per file

For each converted file:
1. `tsc --noEmit` passes with no errors introduced by this file.
2. That file's existing unit and/or integration tests pass unchanged — no test file edits.
3. `npm run lint` clean.
4. Commit.

## Out of scope / explicitly deferred

- Component (`.jsx`→`.tsx`) conversion — future phase, after this one settles.
- `store.js`/`uiStore.js`/etc. (client-state files coupled to components) — deferred alongside components.
- Any Drizzle ORM work — sequenced strictly after this phase completes (see the Drizzle migration design doc's own sequencing).
