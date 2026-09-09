# src/components — organization and shared-component rules

## Folder-per-feature, mirrors the route it belongs to

Each folder under `src/components/` corresponds to one route/feature in
`../app/CLAUDE.md`'s route map (`leads/` ↔ `/leads`+`/customers`, `products/`
↔ `/products`, `agents/` ↔ `/agents`, etc). When adding a component for an
existing feature, put it in that feature's folder — don't create a new
top-level folder unless it's genuinely a new feature with its own route.
`ui/` and `layout/` are the two exceptions (see below).

- **`ui/`** — generic, feature-agnostic building blocks used across multiple
  features: `Modal.jsx`, `Dropdown.jsx`, `DateField.jsx`, `Icon.jsx`,
  `Pagination.jsx`, `ConfirmDialog.jsx`, `Toast.jsx`, `PhoneLink.jsx`,
  `RingChart.jsx`, `CompanySuggest.jsx`. A component belongs here only if it
  has no knowledge of a specific feature's data shape.
- **`layout/`** — the app chrome, mounted once regardless of route:
  `AppShell.jsx` (auth-gate + shell), `Sidebar.jsx`, `Header.jsx`,
  `Footer.jsx`, `UserMenu.jsx`, `ThemeToggle.jsx`, `SyncButton.jsx`,
  `NotificationsBell.jsx`, `BootLoader.jsx`, `DateTime.jsx`,
  `LastUpdatedLabel.jsx`.

No business logic lives in any component — components call plain functions
from `../lib/*.js` and render the result (`../lib/CLAUDE.md`'s rule: "None of
these functions should touch the DOM or React"). If you find yourself
computing a stat or filtering a list inline in a component, that logic
almost certainly belongs in `src/lib/` instead, likely already exists there.

## Shared components you must reuse, not hand-roll

- **`ui/CompanySuggest.jsx`** — accepts an optional `onBlur` prop that composes with (doesn't
  replace) its own internal blur handler (the 150ms delayed dropdown-close). Pass a real
  handler here, never via the spread `...inputProps` — `CompanySuggest` sets its own `onBlur`
  on the underlying `<input>` *after* spreading `inputProps`, so an `onBlur` slipped in through
  `inputProps` would be silently shadowed and never fire. `AddLeadForm.jsx` is the reference
  usage: `onSelect` (a suggestion was clicked) and `onBlur` (the user typed a full company name
  and tabbed away without clicking a suggestion) both end up calling the same
  `autofillFromCompany`, so either path fills the rest of the form the same way.
- **`ui/Dropdown.jsx`** — pass `multiple` to turn it into a checkbox-style multi-select
  (value becomes an array; clicking an item toggles it and keeps the menu open instead of
  closing; the label shows the single selection, `"N انتخاب شده"` for 2+, or the placeholder
  for none). It also accepts a plain non-array value while `multiple` is set (coerced to a
  1-item array) so a chart drill-down's `applyCategoryFilter`-style single-value set doesn't
  need to know which filter UI is currently rendering it. Use `multiple` only on a *filter*
  dropdown (a list is being narrowed) — never on a dropdown that sets one field of one record
  being created/edited (coordinator/category/result/priority pickers in `AddLeadForm`/
  `LeadProfileModal`/`ProductFormModal`/etc. stay single-select on purpose, see
  `../lib/CLAUDE.md`'s `matchesFilter` note for the filter-side half of this).
- **`ui/Modal.jsx`** — the only way to build a modal (overlay, header,
  body, `actions` footer slot, named `width` scale). Every create/edit
  surface in the app renders through it. See `../app/CLAUDE.md`'s "Modals"
  section for the full contract (width scale, the `!important` mobile
  override gotcha).
- **`ui/Icon.jsx`** — the one icon set (Heroicons-style outline). See
  `../app/CLAUDE.md`'s "Button icons" section for the verb→icon map before
  adding a new labeled action button.
- **`ui/ConfirmDialog.jsx`** (backed by `../lib/confirm.js`) — the only
  confirm pattern; never use the native `confirm()`.

## Visual conventions live one directory up

Card tiers, border-radius, color tokens, button/icon rules, and every other
CSS/visual convention are documented in `../app/CLAUDE.md` (folded in from
the former `stylesPattern.md`) — not duplicated here. Read that before
writing any `className` or inline style.
