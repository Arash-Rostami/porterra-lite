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
