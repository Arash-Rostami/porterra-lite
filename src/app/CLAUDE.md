# src/app — routes and UI/UX design pattern

Two things live in this one file on purpose: the route map (so an agent
knows which page owns which feature) and the full visual-design-system
contract (so an agent doesn't invent a new color, radius, or shadow instead
of reusing a token). Previously split across a page-map that didn't exist
and a separately-named `stylesPattern.md` — folded into this one `CLAUDE.md`
so a directory has exactly one orientation doc, matching `src/lib/CLAUDE.md`'s
convention.

## Route map

All routes except `/login` require a session (`src/proxy.js` redirects
unauthenticated requests there; it only checks *presence* of a valid session
cookie — role/department scoping is enforced server-side per-route, see
`../lib/CLAUDE.md`'s `auth.js`/`serverOps.js`/`queries.js` sections, not here).

| Route | Renders | Notes |
|---|---|---|
| `/` | — | Redirects to `/dashboard`. |
| `/login` | login form | No `Sidebar`/`Header` — `AppShell.jsx` early-returns for this path. |
| `/dashboard` | `KpiCards`, `FunnelChart`, `TrendChart`, `DailyAgentChart`, … | KPI/analytics home; data via `computeKpis`/`computeFunnelStages`/etc. (`../lib/analytics.js`). |
| `/leads` | `AddLeadForm`, `LeadFilters`, `LeadTable` | The main contacts/leads table — filters, search, manual order, import/export. |
| `/customers` | `AddLeadForm`, `LeadFilters`, `LeadTable` | Same components as `/leads` — an in-progress rename of the "leads" concept to "customers" terminology; if you're asked to change one, check whether the other needs the same change before assuming it's dead. |
| `/company-report` | company/customer profile report | Smart search + full stats + timeline + monthly chart, keyed by normalized company name (`custKey`, `../lib/store.js`). |
| `/agents` | `AgentsPanel`, `AgentReport` | Per-agent chips + profile modal (`AgentProfileModal`) with full stat breakdown; `AgentReport` adds per-agent summary cards. |
| `/inquiries` | `QuotesPanel` | Open-quotes workflow — the 3-stage quote lifecycle (`../lib/CLAUDE.md`'s `filters.js`/`store.js` sections document it in full). |
| `/suggestions` | `ReminderBanner`, `CommentBanner`, `SuggestionsPanel`, `RemindersList` | "Who to call today" engine (`../lib/suggestions.js`) + reminders. |
| `/report-builder` | `ReportBuilder` | Column-picker + filter + Excel export, custom report. |
| `/products` | `ProductsPanel`, `ProductFormModal` | Product CRUD (admin/developer only for edit/delete — see `requireElevated` in `../lib/CLAUDE.md`). |
| `/categories` | `CategoriesPanel`, `CategoryFormModal` | 1:1 structural clone of `/products` — same CRUD + card/table pattern. |
| `/users` | `UsersPanel`, `UserFormModal` | User CRUD, `requireElevated`-gated (manager has no create/edit/delete rights over users). |

`src/app/api/*` is documented separately in `src/app/api/CLAUDE.md` — route
handlers there are thin; the actual server logic lives in `../lib/CLAUDE.md`.

---

## UI/UX Design Pattern

**Read this fully before touching any CSS, any `className`, or any layout/branding code.**
This app's entire visual system is a deliberate 1:1 sync with **BMS-CM**
(`D:\DEV-ENV\BMS-CM`, the Laravel/Filament sister app — same product, same brand,
literal app name `PORTERRA`). Every token, shadow, gradient, and card tier here is
copied from BMS-CM's real source (`resources/css/fi-custom.css`,
`resources/css/landing-page.css`, `resources/css/stylesPattern.md`), not invented.
If you're about to pick a color, a radius, or a shadow "that looks about right,"
stop — go read the corresponding rule in BMS-CM first. Mismatched values here read
as a different, disconnected product, which is the one thing this sync must not do.

### The token bridge (`globals.css` `.crm-root { ... }`)

Same three-layer palette as BMS-CM, ported verbatim:
- `--custom-first/second/third/fourth/neutral` + `-mid` (0.7 alpha) / `-light` (0.4 alpha) variants
- `--google-first/second/third/fourth` × `-light`/`-dark` (these suffixes are **absolute**,
  not theme-relative — `--google-first-light` is always `#FFFFFF` in both themes)
- `--filament-dark` / `--filament-dark-mid`
- 15 named `--gradient-*` (all `linear-gradient(135deg, A, B)`)
- `--md-motion` / `--md-motion-exit` (Material standard/exit easing)
- `--md-elevation-1/2/3` — **two-layer** shadows, redefined inside `.crm-root.-dark` to the
  exact darker-opacity values BMS uses (`0.5`/`0.3` alpha vs `0.3`/`0.15` light)
- `--accent` / `--label-accent` resolve to **`--google-fourth`** — the BMS-CM brand
  accent, which is genuinely theme-aware (different hue per theme, not just lightness):
  `--google-fourth-light: #5C6AC4` (light) / `--google-fourth-dark: #6750A4` (dark), both
  from `fi-custom.css`. This is **not** BMS's registered Filament panel `primary`
  (`Color::Slate`, `DashboardPanelProvider.php`) — that was a misattribution that made the
  accent grey-slate and identical-hued across themes. The app's primary is the google-fourth
  brand color; every primary button (`.crm-btn-primary`, `.crm-import-btn`, `.crm-auth-btn`,
  active agent chip) reads `var(--accent)`, so it flips blue↔purple with the theme. The old
  `--primary-*` Slate tokens and the unused `--accent-bg`/`--accent-line` were removed.
- `--good/-bg/-line`, `--rust/-bg/-line`, `--info/-bg/-line`, `--warn/-bg/-line` — the
  literal `tb-success/tb-danger/tb-info/tb-warning` RGB triples from
  `fi-custom.css`. **These do not change between light/dark** (confirmed: BMS has no
  `.dark .tb-*` override) — don't add one here either.

Semantic aliases (`--ink`, `--paper`, `--surface`, `--surface-card`,
`--surface-card-hover`, `--accent`, `--accent-soft`, `--line`, `--muted`) resolve to
different primitives per theme inside `.crm-root.-dark`. **Never hardcode a hex that
already has a token** — this is BMS's own #1 rule (`stylesPattern.md` "Absolute
Anti-Patterns") and applies here identically.

**A token that silently dropped once — check for this class of bug first if colors
look flat/wrong:** a custom-property block can be deleted by an editing pass and nothing
errors — CSS custom properties fail silent, `var(--accent)` just computes to nothing and
buttons render with a fully transparent background. If a color looks unexpectedly absent
(not wrong-colored, *absent*), open devtools → computed style → check the custom property
actually has a value on `.crm-root`, don't assume the consuming rule is the bug.

### Card tiers — `.crm-section` is NOT a plain div

Three depth tiers, matching BMS's `lp-surface → lp-panel → lp-well` nesting exactly
(see BMS `resources/css/landing-page.css` + its own `viewsPattern.md` §"sync mechanism"):

| Tier | Class / pattern here | BMS equivalent | Background |
|---|---|---|---|
| Surface (outer card) | `.crm-section`, `.crm-kpi`, `.crm-toolbar`'s parent | `.lp-surface` / `.fi-section` | `var(--surface-card)` — translucent `--custom-third-light` light / opaque `--filament-dark-mid` dark, **no border**, `--md-elevation-1` |
| Panel (nested, one step in) | `.crm-suggest-card`, `.crm-agent-report-card`, `.crm-toolbar`, `.crm-form-card`, `.crm-company-report-*` | `.lp-panel` | `--custom-third-mid` light / `--google-second-dark` dark, **no shadow** — the parent surface keeps the elevation |
| Well (nested, two steps in — list rows) | `.crm-history-item`, `.crm-reminder-row`, `.crm-feed-item`, `.crm-quickcall-form` | `.lp-well` | `--custom-neutral-light` light / `--google-first-dark` dark, thin `--custom-third-light` border |
| Floating/opaque (popovers, modals, dropdown menus) | `.crm-modal`, `.crm-dd-menu`, `.crm-suggest-dropdown` | `.lp-float` / `.fi-modal-window` | `--custom-neutral` light / `--filament-dark-mid` dark, **opaque** (never translucent — a floating element over page content must not let it bleed through) |
| Form controls (inputs, buttons, dropdown trigger) | `.crm-input`, `.crm-dd-btn`, `.crm-btn-ghost` | Filament's own form inputs | `var(--surface)` (opaque, theme-flipped white/dark-gray) + `var(--line)` border — controls stay bordered/opaque, unlike cards |

**When adding a new card-like element**: decide which tier it is (is it the outer
container on the page, or something nested inside one?) and use that tier's exact
background token — don't reach for `var(--surface)` for a card, that's reserved for
form controls and floating opaque elements.

### Border radius — one value for every rectangular surface

Every rectangular surface and control in the app uses `border-radius: 8px` — cards,
tables, KPI/stat widgets, the modal, inputs, dropdowns, all buttons (primary, ghost,
row edit/delete, quickcall, pagination), feed/history items, progress/funnel bars,
scrollbar track/thumb. This is the button radius; it was chosen as the app-wide
standard because anything larger reads as too rounded for the dense RTL data UI.
`8px` is the only value to reach for when adding any new rectangular element.

The only exceptions, which are a *different shape language* and must stay round:
`100px` / `9999px` pills (count badges, status/priority pills, notification dots,
segmented toggles, avatars) and `50%` circles (small status dots). And `0` for the
mobile full-bleed root. Don't unify these down to `8px` — a pill that loses its
rounding stops reading as a pill.

Multi-corner radii follow the same `8px` (e.g. table thead `8px 0 0 0` /
`0 8px 0 0`, pagination `0 0 8px 8px`, mobile sheet `8px 8px 0 0`).

### Status badges (`.crm-status-badge`)

Maps directly to BMS's `.tb-badge` family: `-success`→`--good*` (emerald),
`-fail`→`--rust*` (rose), `-progress`→`--info*` (blue, chosen for "in-flight/neutral"
per Filament convention), `-none`→`var(--muted)`. `border-radius:8px` (the app's single
rectangular radius — see "Border radius" below), pale solid bg +
saturated text + alpha border — never a plain colored pill.

### Phone display

Read-only phone numbers render via `PhoneLink` (`<a href="tel:…" dir="ltr">` with
`crm-mono`), not plain text; phone edit inputs remain plain `<input>`.

### Fonts — self-hosted, never a CDN

`public/fonts/` holds the actual font files copied from
`BMS-CM/resources/fonts/` (Roboto, Iranyekan, Baloo2-ExtraBold). `@font-face` blocks
live at the top of `globals.css`. **`--font-brand` (Baloo 2, weight 800 only) is for
the literal Latin wordmark "PorterrA-lite" only** — it has no Persian glyphs, same as
BMS's own `--font-brand` usage for `config('app.name')`. Never apply it to Persian
text. If you ever need a different weight of Baloo 2 for the wordmark, know that the
font file is embedded at exactly weight 800 — requesting another weight triggers
synthetic (fake) bolding, the exact gotcha BMS's own `stylesPattern.md` flags for its
`.fi-login-brand`.

### Sidebar (`Sidebar.jsx` + `.crm-sidebar*`)

- Background is **transparent** (`background: transparent`), matching Filament's own
  `.fi-sidebar` (BMS has no sidebar background override at all — it inherits the page's
  ambient gradient). Only a `border-left` separates it.
- Desktop collapse toggle: lives in the brand row when expanded (`margin-inline-start:
  auto` pushes it to the far end), but **escapes to float outside the sidebar's edge**
  when collapsed (`position:absolute; right: calc(68px - 14px)`) — mirrors BMS's real
  `.fi-topbar-close/open-collapse-sidebar-btn`, which is genuinely a topbar-level
  floating button, not a sidebar-internal one. Two render paths for the *same* button
  JSX (`collapseBtn` const), one inside the brand row, one as a sibling of `<aside>` —
  don't try to solve this with pure CSS positioning of a single instance, the
  `.crm-sidebar` element clips absolutely-positioned overflow (implicit `overflow-x:
  auto` from the `overflow-y:auto` pairing rule) so a child can't visually escape it.
- Mobile (`≤900px`): sidebar becomes a horizontal top bar. The brand row order is
  **hamburger first in DOM** (renders rightmost in RTL) → logo → title — this reversed
  order is intentional, matches the "hamburger right, brand left" requirement. Nav
  links hide behind the hamburger toggle (`.crm-sidebar.-mobile-open .crm-sidebar-nav`).
  Only the **logo** shows on mobile, never the "PorterrA-lite" title text (mirrors the
  desktop collapsed state — icon-only is the shared "compact" identity across both).
- **The `collapsed` boolean is a desktop-only concept but is shared JS state.** Never
  gate label/title visibility on `{!collapsed && ...}` in JSX — that also hides them on
  mobile if a stale desktop preference happens to be `true`. Always render labels
  unconditionally in JSX; hide them via CSS scoped to `@media (min-width:901px)
  .crm-sidebar.-collapsed`. This bit twice already — don't reintroduce it.

### Global controls added beyond BMS's own feature set

These don't exist in BMS-CM (it has no CRM date data or font-scaling need) but follow
its architectural conventions — plain functions in `src/lib/`, shared via a module-level
store + `useSyncExternalStore` (the `uiStore.js` pattern; `theme.js` was converted to this
too once the login page needed to toggle theme, so AppShell + /login + /dashboard share one
`dark` state instead of each holding a separate `useState`).

- **Calendar toggle** (`../lib/calendar.js`, `uiStore.js`'s `calendar`/`toggleCalendar`)
  — Gregorian ⇄ Jalali *display only*. Records are always stored `dd.mm.yyyy`
  (Gregorian) — `formatDisplayDate(date, calendar)` is the only thing that changes.
  Chart month-bucket grouping (trend chart, company report monthly breakdown)
  deliberately stays Gregorian even when the toggle is on — re-bucketing by Jalali
  month would change what's actually grouped together, not just how it's labeled, and
  that's a data-correctness question, not a display-preference one.
- **Font scale** (`uiStore.js`'s `fontScale`/`increaseFontScale`/`decreaseFontScale`,
  default `1.08`) — applied as `zoom` on `.crm-root`'s inline style. `zoom` was chosen
  over a `rem` refactor because ~900 lines of this file use fixed `px` sizes; `zoom`
  scales everything (fonts, padding, borders, icons) uniformly without touching a
  single existing rule. Don't refactor to `rem` casually — that's a real, large,
  deliberate migration, not a quick fix, and `zoom` already delivers the same result.

### Auth & header identity (added with login + multi-user)

These are new surfaces with no BMS-CM ancestor; they follow the same token/tier rules above.

- **Login page** (`src/app/login/page.js` + `.crm-auth-*`): a full-viewport glassmorphism card
  (`.crm-auth-card`, `backdrop-filter: blur`) frosted over the app's normal ambient background
  — no Sidebar/Header (see `AppShell.jsx`'s `/login` early return). Inputs are `dir=ltr`
  (email + password), form driven by a controlled `onSubmit` → the `login` REST route
  (`../lib/apiClient.js`). The logo is the **same theme-aware pair as the sidebar**
  (`logo-light.png`/`logo-dark.png`), the
  submit button uses `var(--accent)` (so it's #5C6AC4 light / #6750A4 dark like every other
  primary button, not a fixed gradient), and a `ThemeToggle` is floated in the top-start
  corner (`.crm-auth-theme-toggle`, absolute) — it works because `theme.js` is a shared store
  (see below), so toggling on login flips `.crm-root.-dark` app-wide. Reuses the shared
  `ThemeToggle.jsx`, not a hand-rolled button. (An earlier animated-balls background was
  removed by request; the card now frosts the page's ambient gradient.)
- **Header greeting chip** (`.crm-header-greeting`): a brand-gradient pill showing
  «سلام، {displayName} 👋» at the start of the subtitle row, left of the records-count chip.
  Brand gradient only — no card tier (it's inline text, not a surface).
- **Header divider** (`.crm-header-divider`): a 1px vertical `--line` rule that separates the
  logout button from the rest of the header action cluster. Only exists because logout is
  icon-only (see below) and would otherwise read as just another control.
- **User form `agentCode` field** (`UserFormModal.jsx`): a free-text code input (uppercased +
  trimmed on save, both create and edit), not a dropdown — an admin types any unique code to
  onboard a new expert (کارشناس).
- **Lead `source` (منبع سرنخ) field** (`AddLeadForm`/`LeadProfileModal`): a free-text
  `crm-input` with a native `<datalist>` suggestion list (not a `Dropdown`); suggestions =
  existing sources from records ∪ the 8 `SOURCE_OPTS` defaults.
- **Icon-only logout** (`.crm-logout-btn`): reuses `.crm-theme-toggle` chrome with a
  `LogoutIcon`, `title="خروج"` — same icon-only pattern as the calendar/font-scale/theme
  buttons. Never add a text label to it; the divider + title is the whole affordance.
- **Date/time display** (`src/components/layout/DateTime.jsx` + `.crm-header-datetime`): a
  **display-only** chip (no `onClick`, no cursor) that reflects the calendar toggle — Jalali
  or Gregorian date + live time, updating every second, flipping when the calendar toggle is
  touched. **Desktop-only** (`.crm-header-datetime` is `display:none` below 640px) and sits in
  its own row *below* the header action buttons, not inline with them. Deliberately borderless
  (no card/shadow) — just `--ink-soft` text — so it reads as a quiet live caption, not a
  control. SSR-safe via `now=null` initial state set in `useEffect`.

### Leads table — flagged rows & manual order

Two per-user view affordances (no business data, not a BMS port — but following its
conventions). State lives in `../lib/leadPrefs.js` (`localStorage` keyed per username),
wired into the table in `LeadTable.jsx`.

- **Flagged-important row** (`tr.crm-row-flagged`): background `var(--accent-soft)` on the
  `td`s — the canonical mild accent tint (same token as soft-accent surfaces; pale blue light /
  subtle dark slate dark), applied to `td` to match the existing `tr:hover td` pattern. A
  `:hover` variant keeps the tint (hover doesn't wipe it). The flag toggle is a `FlagIcon`
  icon-only button (`.crm-flag-btn`) sitting in the existing actions cell next to edit/delete —
  **no new column**, so the mobile `nth-child` column-hiding rule (`globals.css`) is untouched.
  `.-on` reads in `--accent` (border + tinted bg via `color-mix`), inactive in `--muted`.
- **Manual order** is a sort mode, toggled by an icon-only `crm-manual-toggle` button (just the
  `ArrowsUpDownIcon`; its «ترتیب دستی» / «پایان ترتیب دستی» label lives in the `title`
  tooltip) sitting beside the import/export buttons in the table-actions cluster (square
  secondary-surface chrome like the export button; `.-on` in `--accent`). While active,
  `table.crm-table.-manual` disables column-sort (`th { cursor: default }`) and makes rows
  **whole-row draggable** (`draggable` on the `<tr>`, `cursor: grab`) — native HTML5 drag-drop, no
  library, and again **no new column** (avoids shifting the mobile `nth-child` rule). The dragged
  row gets `crm-row-dragging` (`opacity: 0.5`); the drop target gets `crm-row-dragover` plus
  `-drop-before`/`-drop-after`, drawn as a 2px inset `--accent` `box-shadow` on the row's top or
  bottom edge (a line indicator, not a filled surface). A `.crm-manual-hint` line shows under the
  title row. No new card tier is introduced — these are row-level states, not surfaces.

### Modals — one shared component, never hand-rolled

`src/components/ui/Modal.jsx` is the *only* way a modal should be built. It owns the
overlay, header (title + optional description + close button), body slot, and an
optional footer `actions` slot — mirrors BMS's own `<x-modal open="...">` Blade
component (`resources/views/components/modal.blade.php`) down to the same named
width scale (`xs` 20rem → `7xl` 80rem, same values as Filament's `fi-width-*`,
default `3xl`/768px). Every create/edit surface renders through it now —
`LeadProfileModal.jsx` (edit) and `AgentProfileModal.jsx` (view) plus
`AddLeadForm.jsx` (create) which uses the same shell, body grid, and `actions`
footer as the profile modal so create and edit share one chrome. If you add a new
create/edit modal anywhere in the app, do the same:

```jsx
<Modal open onClose={onClose} title="..." width="4xl" actions={<>...buttons...</>}>
  ...body content...
</Modal>
```

Pick `width` by how much the body actually needs — the customer/agent profile modals
use `4xl` (896px) because they hold a 3-column form grid + history + feed; a simple
confirm-style modal should stay at the `3xl` default. **Never hardcode a modal's
`max-width` in a component's own CSS** — that's exactly the bug that made every modal
"too thin" before this component existed (`.crm-modal` had a bare `max-width:640px`,
ignoring the content it needed to hold).

**Gotcha already hit once:** `Modal` sets `max-width` via **inline style** (so each
call site can pick its own width without a new CSS class). The mobile full-width
override in `globals.css` (`@media (max-width:640px) { .crm-modal { max-width:100%
!important; } }`) *must* keep its `!important` — a plain class rule cannot win against
an inline style, `!important` is the only way the mobile override still applies.
Don't remove it thinking it's redundant.

### Header notifications bell

`src/components/layout/NotificationsBell.jsx` — an app-wide "needs attention" surface,
mounted once in `Header.jsx` so it's visible on every tab. It deliberately reuses the
*exact* data functions `ReminderBanner`/`CommentBanner`/`RemindersList`
(`src/components/suggestions/`) already call — `getDueReminders`, `markReminderDone`,
`findLatestComment` from `store.js` — rather than recomputing anything. If the
suggestions/reminders data model ever changes, both the Suggestions-page banners and
this bell need updating together; they're two views over the same source, not two
separate features. The badge count is `due.length` only — there's no "seen/unseen"
state for the latest-comment line (no timestamp of last view exists anywhere in this
app), so don't add it to the badge count without first adding that tracking.

### Boot loader (`.loader-overlay` + `BootLoader.jsx`)

A full-screen boot animation ported **verbatim** from BMS-CM's landing-page loader
(`resources/views/filament/landing-page/loader.blade.php` + `landing-page.css`
§"Loader Overlay"). It runs once per browser session, right after login —
`BootLoader.jsx` is mounted in `AppShell.jsx`'s authenticated branch only (the `/login`
early-return skips it), and is gated by `sessionStorage['porterra_loaded']`: first load
this session → overlay for 2900ms then a 700ms opacity fade (`.-leaving`), then the flag
is set; repeat visits render `null`. This matches BMS's `bms_loaded`/`appReady` boot
sequence exactly, including the once-per-session reset (new tab / incognito / clearing
the flag replays it). The overlay is `position:fixed; z-index:9999` and fully opaque, so
the Sidebar/Header mounting behind it are hidden without needing an `appReady` gate.

**Markup is the same 1:1 port as `lp-*`**: `.loader-overlay` + `.ldr-grid`/`ldr-scan`/
`ldr-glow`/4×`.ldr-c` corner brackets, `.ldr-body` (eyebrow → logo mark → letter
wordmark → divider → progress track + "Loading Resources" status). Class names are kept
verbatim from BMS for auditability — don't rename them to `crm-`. The only translation
is the theme selector: BMS keys off `.light`/`.dark`, this app keys off
`.crm-root`/`.crm-root.-dark`, so every `.light .ldr-x` became `.crm-root .ldr-x` and
every `.dark .ldr-x` became `.crm-root.-dark .ldr-x`. The shared rules
(`.ldr-body`, `.ldr-progress`, all `@keyframes l*`, the `prefers-reduced-motion` guard)
are theme-agnostic and stay as-is.

**Accents read `--accent`, not BMS's slate `--primary-*`.** BMS's loader keys every
accent off `--primary-600`/`--primary-400` (Tailwind Slate, its registered Filament
`primary`). This app deliberately dropped `--primary-*` — slate was a misattribution
(see "The token bridge" above: the brand accent is `--google-fourth`, not Slate). So the
port swaps every `var(--primary-600)`/`var(--primary-400)` → `var(--accent)`, which is
already theme-aware (`--google-fourth-light` #5C6AC4 / `--google-fourth-dark` #6750A4).
BMS's per-theme opacity tuning (dark bumps opacity ~5–10 pts for contrast) is preserved
verbatim, only the hue changes slate→brand-purple — keeping the loader in the same
product as the rest of the app instead of reading as a disconnected slate surface. The
wordmark color is `var(--ink)` in both themes (near-black in light, near-white in dark),
covering BMS's `--primary-900`/`--primary-50` with one semantic token. **Do not** restore
slate `--primary-*` here to "match BMS exactly" — that re-introduces the disconnect this
file's #1 anti-pattern warns against.

**The wordmark is `PorterrA-lite`, split into per-letter `<span class="ldr-letter"
style="--i:N">`** so each letter animates in with a staggered delay
(`calc(.28s + var(--i) * .07s)`). `--font-brand` (Baloo 2, weight 800) is the correct
font — the wordmark is Latin, exactly the one place `--font-brand` is meant for (same
rule as the sidebar title). The overlay is `dir="ltr"` even though the app is RTL, so the
Latin letters and the eyebrow lay out left-to-right. The logo mark reuses the **same
theme-aware pair as the sidebar** (`/img/logos/logo-light.png`/`logo-dark.png`) toggled
via CSS (`.ldr-mark-light`/`.ldr-mark-dark` `display:none`), not a JS toggle — matches
BMS and avoids a flash on theme change.

The eyebrow `Trade hard smart` and `Loading Resources` status are carried over verbatim
from BMS as part of the "same loader" port; both are Latin/`dir=ltr` so they fit the
brand-moment language. If a Persian tagline is ever wanted, change only the text in
`BootLoader.jsx` — the `.ldr-slogan-hard` (red strike-through) / `.ldr-slogan-smart`
(amber) spans are the styled parts.

### In-modal horizontal tabs

`AgentProfileModal` splits its two long lists (suggestions + call history) across
Filament-style underline tabs — `.crm-modal-tabs` (a `role="tablist"` row with a
`border-bottom` rule) + `.crm-modal-tab` buttons. The active tab gets
`color: var(--accent)` + a 2px `border-bottom` in `--accent` (pulled down with
`margin-bottom: -1px` to sit on the row's border); inactive tabs are `var(--muted)`,
hover `var(--ink)`. No border-radius — these are underline tabs, not filled controls
(the 8px rule covers filled rectangular surfaces, not tab-strip markers). Each tab owns
its own `page`/`perPage` state so the two paginations stay independent; switching agent
or date filter resets both lists to page 1.

### Button icons

Every labeled action button carries one Heroicons-style outline icon from `src/components/ui/Icon.jsx`, placed immediately before its label with no whitespace (`<CheckIcon />ثبت`) — the button's `gap` does the spacing (8px on primary/ghost/danger/import/add/quickcall, 5px on the row edit/delete/done buttons). All those button classes are `display: inline-flex; align-items: center` so a text-only instance stays centered.

Icon → action map (one icon per verb; reuse, don't invent):

- `PlusIcon` — create / add / new («افزودن …», «ثبت … جدید»); the quickcall «ثبت تماس جدید» button uses it in place of a `+` text glyph.
- `CheckIcon` — confirm / save / submit / done («ثبت», «ذخیره تغییرات», «ثبت نظر», «انجام شد», default «تأیید»).
- `XCircleIcon` — cancel («انصراف»).
- `XIcon` — dismiss a surface (modal & banner close buttons; replaced the old `✕` text glyph).
- `TrashIcon` — delete / remove («حذف»), the destructive-confirm case («حذف» / «تأیید» when `tone === 'danger'`), and clear-filter. Every clear-filter control uses the bin so the action reads the same everywhere: icon-only `crm-suggest-clear-mini` instances carry `title="پاک کردن"`, and the labeled «کل بازه» (AgentProfileModal) carries it with `title="پاک کردن فیلتر بازه"`.
- `PencilIcon` — edit («ویرایش»).
- `UploadIcon` — import («وارد کردن از اکسل»).
- `DownloadIcon` — export / template («خروجی اکسل», «دانلود قالب اکسل»).
- `ArrowPathIcon` — reset / restore («بازگشت به داده اولیه», the footer reset button).
- `ArrowsRightLeftIcon` — sync (the header sync button). Deliberately NOT `ArrowPath` — that icon belongs to reset, so the two don't read as the same action. Still carries `crm-icon-spin` while syncing.
- `ArrowsUpDownIcon` — manual order / reorder (the contacts «ترتیب دستی» / «پایان ترتیب دستی» toggle, icon-only with the label in `title`, beside the import/export buttons). Deliberately NOT `ArrowsRightLeftIcon` — that's horizontal sync; vertical up/down is the reorder verb.
- `FlagIcon` — flag as important (the contacts row flag toggle, icon-only in the actions cell).
- `PowerIcon` — toggle a user's active state («غیرفعال‌کردن»/«فعال‌کردن», the UsersPanel row button). The icon stays constant even though the label flips with `u.active`.
- `SearchIcon` — run / show a report or search-submit («نمایش گزارش», the company-report search button).
- `FilterIcon` — apply a filter («اعمال فیلتر», the agent-profile date-range filter).
- `LogoutIcon` — logout; `BellIcon` — notifications; `CalendarIcon` — Jalali/Gregorian toggle; `MinusIcon`/`PlusIcon` — font-scale −/+.

Two buttons pick their icon from the same condition that picks their label/class, so the icon and text never disagree:

- `ConfirmDialog` confirm → `{s.tone === 'danger' ? <TrashIcon /> : <CheckIcon />}{s.confirmText}` (mirrors its `crm-btn-danger`/`crm-btn-primary` class).
- `UserFormModal` submit → `{isEdit ? <CheckIcon /> : <PlusIcon />}{isEdit ? 'ذخیره تغییرات' : 'افزودن کاربر'}` (mirrors the label).

Intentionally icon-less (labels/toggles, not verbs — don't add an icon "for completeness"): modal tabs, pagination «قبلی/بعدی», chart drill-down chips, the scope toggle «اطلاعات من/همه», the login submit «ورود», and the agent-chip «👤 پروفایل». Icon-only controls (theme/sync/calendar/font-scale/notifications/logout, sidebar collapse/hamburger, dropdown trigger, password show/hide) are a separate pattern and keep their own inline SVG or named icon.

When you add a new labeled action button, give it the icon for its verb from this list; if the verb is new, add the icon to `Icon.jsx` first and add a line here. Don't reach for an emoji or a raw text glyph.

### Table/section widget action rows

A widget's actions (export, import, create/add) live inside that widget's own
`.crm-section-title-row` — never in a bar floating above or below the `.crm-section`.
Leads used to break this (import/create sat in their own bar above the table,
export sat in the filter toolbar); it was fixed to match Users/AgentReport/Suggestions,
which already did this correctly. `.crm-table-actions` is the wrapper for a widget with
more than one action button — `display:flex; gap:10px; margin-inline-start:auto` groups
them at the row's far end. For a single button, put `margin-inline-start:auto` directly
on it instead (UsersPanel's «افزودن کاربر» does this).

When a widget mixes rarely-used utility actions (template download, import) with
primary ones (export, create), don't give every button equal label weight — group the
utilities as icon-only `.crm-theme-toggle` buttons (`title` tooltip, no label), separate
them from the labeled buttons with a `.crm-header-divider`, then the labeled secondary
action (`.crm-export-btn`), then the primary action last (`.crm-add-btn`/
`.crm-btn-primary`) — quiet-to-prominent, DOM order left-to-right (so primary lands at
the visual end in RTL). `LeadTable.jsx`'s action row is the reference implementation.

**Same rule applies one level in, inside modals.** A nested block within a modal (e.g.
`LeadProfileModal`'s `.crm-profile-block` / `.crm-profile-block-head` /
`.crm-profile-block-title`) is the modal-scoped equivalent of `.crm-section` /
`.crm-section-title-row` / `.crm-section-title` — its action button belongs in the head
row, and if it's the block's sole create action it must use the same primary-CTA look as
`.crm-add-btn`/`.crm-btn-primary`, not a bespoke neutral style. (`.crm-quickcall-btn` used
to be a one-off neutral/bordered button for «ثبت تماس جدید» — it's now just
`.crm-btn-primary`, matching every other single-action widget header in the app.)

### /categories tab — mirrors /products

The `/categories` admin tab (sidebar "مدیریت" group) is a 1:1 structural clone of `/products`:
same CRUD panel + form-modal pattern, same card/table/badge conventions. Its سفارشی/پایه
(custom/base) type badge uses `crm-status-badge` (`-success` for سفارشی, `-none` for پایه)
rather than `badgeClass` (`../lib/filters.js`) — `badgeClass` is category-**name**-specific color
logic, meaningless for the custom/base flag. The form modal is the shared `Modal.jsx` shell
with an inline create-category shortcut (Plus → modal → `addCategory` → auto-select) in
`ProductField`/`ProductFormModal`, same inline-create pattern as the product add-on-the-fly
widget.

### Absolute anti-patterns (same spirit as BMS's own list, `stylesPattern.md`)

- ❌ Hardcode a hex/shadow/gradient that already has a token.
- ❌ Give a card a border AND a shadow at the surface tier, or a shadow at the
  panel/well tier — tiers are shadow-once (outermost), background-differentiated
  the rest of the way down.
- ❌ Use `var(--surface)` for a card background — that token is for form controls and
  opaque floating elements only.
- ❌ Gate any text/label's *existence* on desktop-only state without a CSS media guard.
- ❌ Add a scale/rotate/spring hover flourish — this app follows BMS's post-2026-07-18
  "flat enterprise" redesign philosophy: 150–300ms color/shadow transitions only.
- ❌ Load a font from Google Fonts or any CDN — every font here is self-hosted from
  `public/fonts/`, copied from BMS-CM's own files, on purpose.

### Before you change anything

1. Open `D:\DEV-ENV\BMS-CM\resources\css\fi-custom.css` and
   `D:\DEV-ENV\BMS-CM\resources\css\landing-page.css` and actually read the rule you're
   about to port or modify — don't approximate from memory of this file.
2. Check `../lib/CLAUDE.md` (per-file logic, and `public/panel_mostaqel_moshtarian.html`
   for the original prototype behavior it ports) for the business-logic side of this app —
   don't let a UI change quietly break a business rule documented there.
3. If you add a new reusable visual pattern, add it to this file in the same table/list
   style — this document is meant to stay authoritative, not go stale the moment you
   ship something new.
