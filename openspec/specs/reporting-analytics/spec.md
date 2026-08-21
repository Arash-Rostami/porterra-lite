# reporting-analytics Specification

## Purpose
Computes dashboard KPIs, funnel metrics, and chart data (trend, agent, category, source) plus the company report and report builder, all derived consistently from lead/quote status.

## Requirements

### Requirement: Fixed KPI set
The system SHALL compute exactly six dashboard KPI cards: total records, converted count, open-quote count, `'غیرفعال'` count, `'در حال پیگیری'` count, and `effectiveResult === 'بی‌پاسخ'` count.

#### Scenario: Rendering the dashboard
- **WHEN** a user opens the dashboard
- **THEN** exactly these six KPI cards are shown, each reflecting current filtered data

### Requirement: Three-stage funnel
The system SHALL compute the funnel as exactly three stages — total leads, open+resolved quotes, converted — plus `leadConversionRate` and `quoteToSaleRate`, replacing an older four-stage "price-field-truthy" model.

#### Scenario: Funnel with no quotes yet
- **WHEN** no leads have entered the quote sub-workflow
- **THEN** the "quotes" funnel stage is zero and `quoteToSaleRate` reflects zero-of-zero without erroring

### Requirement: All tallying goes through effectiveResult/quoteResult
The system SHALL branch all reporting tallies through `effectiveResult`/`quoteResult`, never compare `effectiveResult` directly against `'موفق'`/`'ناموفق'` (values that do not exist on `result`).

#### Scenario: Counting converted leads
- **WHEN** computing the converted-count KPI
- **THEN** the computation checks `quoteResult`/the `converted` flag, not `effectiveResult === 'موفق'`

### Requirement: Outlier-capped chart bars with true value in tooltip
The system SHALL cap bar height in `computeDailyAgentData` at `cap = max(15, min(40, p75*3))` while showing the true value in the tooltip via `rawData`. This capping is an intentional display choice, not a defect.

#### Scenario: One agent has a very high daily count
- **WHEN** one agent's daily count is far above the 75th-percentile-derived cap
- **THEN** that agent's bar is visually capped, but hovering it shows the true uncapped number

### Requirement: Calendar mode affects bucketing, not storage
The system SHALL always store dates in Gregorian format; the calendar toggle (Gregorian/Jalali) SHALL only change month-bucketing and display in the trend chart and daily-agent chart, never the stored value.

#### Scenario: Switching calendar mode
- **WHEN** a user switches the calendar toggle from Gregorian to Jalali
- **THEN** chart month buckets re-group by Jalali months while underlying stored dates are unchanged

### Requirement: Independent filter dimensions
The system SHALL treat chart drill-down (`chartFilter`) as a filter dimension independent from `filters.category`/`filters.source`; each `applyXFilter` function SHALL own exactly one filter dimension and reset unrelated fields, preventing stale filters from ANDing together to zero rows.

#### Scenario: Applying a category filter after a chart drill-down
- **WHEN** a user has an active chart drill-down and then applies a category filter
- **THEN** only the category filter's own dimension is set, without leaving stale, conflicting drill-down state that zeroes the result set

### Requirement: Deterministic agent coloring
The system SHALL assign hardcoded brand colors for agents FARNAZ/PARDIS/ZOHREH via `agentColor()`, and a deterministic HSL hash-based color for any other agent, consistent with the same pattern used by `coordClass`.

#### Scenario: Chart includes an agent outside the three named ones
- **WHEN** a chart renders data for an agent not in {FARNAZ, PARDIS, ZOHREH}
- **THEN** that agent is assigned a consistent color derived deterministically from their identifier, stable across renders
