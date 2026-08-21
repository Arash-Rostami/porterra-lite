## Purpose

Manages per-user, display-only preferences — calendar system, font scale, theme — persisted locally and hydrated in an SSR-safe way.

## ADDED Requirements

### Requirement: Calendar toggle is display-only
The system SHALL store all record dates in Gregorian `dd.mm.yyyy` format regardless of the calendar toggle; switching between Gregorian and Jalali SHALL only change `formatDisplayDate` output, except for chart month-bucketing (see `reporting-analytics`), which is the one place display mode changes actual grouping.

#### Scenario: Toggling calendar display
- **WHEN** a user switches the calendar toggle from Gregorian to Jalali
- **THEN** displayed dates change format but the underlying stored date value is unchanged

### Requirement: Font scale via CSS zoom
The system SHALL apply font scale (default 1.08) as a CSS `zoom` property on `.crm-root`, not via a `rem`-based refactor, deliberately avoiding touching the existing fixed-px CSS.

#### Scenario: User increases font scale
- **WHEN** a user raises the font-scale preference
- **THEN** the entire `.crm-root` subtree visually scales via CSS `zoom`, without any component's CSS units changing

### Requirement: Per-username localStorage persistence
The system SHALL persist calendar mode and font scale in `localStorage`, keyed per-username, using the same convention as `leadPrefs.js`.

#### Scenario: Different users on the same browser
- **WHEN** two different users log into the same browser
- **THEN** each sees their own previously saved calendar mode and font scale, not the other's

### Requirement: SSR-safe hydration
The system SHALL start the `ui` preferences store at server defaults, read `localStorage` lazily only inside `subscribe`, and have `getServerSnapshot` return a frozen default, avoiding hydration mismatches.

#### Scenario: Initial server-rendered page load
- **WHEN** the app is first rendered on the server before any client-side preference read
- **THEN** the rendered output matches the frozen server defaults, with no hydration mismatch warning
