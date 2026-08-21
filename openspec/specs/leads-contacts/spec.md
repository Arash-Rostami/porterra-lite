# leads-contacts Specification

## Purpose
Manages the lead/contact record — the core entity of the CRM — covering its status model, validation, filtering/search/sort, duplicate detection, and import/export, backed by the physical `contacts` table.

## Requirements

### Requirement: Status enum
The system SHALL restrict the `result` field to exactly four non-null values: `'در حال پیگیری'`, `'در حال استعلام'`, `'بی‌پاسخ'`, `'غیرفعال'`. `'موفق'` and `'ناموفق'` SHALL NOT be valid values for `result` (they exist only on `quoteResult`).

#### Scenario: Invalid result value rejected
- **WHEN** a create/update request sets `result` to `'موفق'` or any value outside the four-value enum
- **THEN** the server rejects the request as invalid

### Requirement: Deactivation reason required
The system SHALL require `deactivateReason` whenever `result` is set to `'غیرفعال'`, enforced server-side via Zod `.superRefine` on both create and update.

#### Scenario: Deactivating without a reason
- **WHEN** a lead update sets `result: 'غیرفعال'` with no `deactivateReason`
- **THEN** the server rejects the update with a validation error

### Requirement: Effective result derivation
The system SHALL derive the effective status of a lead via `effectiveResult(r)`: if `r.result` is set, use it; otherwise scan `r.notes` against `FAIL_NOTE_PATTERNS` and infer `'بی‌پاسخ'` if matched; otherwise `null`. All statistics and derived views SHALL use `effectiveResult`, never read `r.result` directly.

#### Scenario: No explicit result but notes indicate no answer
- **WHEN** a lead has `result: null` and `notes` matching a no-answer pattern
- **THEN** `effectiveResult` returns `'بی‌پاسخ'` and the lead is counted as such in all statistics

### Requirement: Duplicate detection is a soft warning
The system SHALL detect likely-duplicate leads by exact company-name match (after `normSpace().toLowerCase()`) or phone match (last 8 digits after normalizing Persian/Arabic digits to Latin), and SHALL warn the user without blocking the save.

#### Scenario: Saving a duplicate company
- **WHEN** a user saves a new lead whose company name matches an existing lead after normalization
- **THEN** the system surfaces a duplicate warning but still allows the save to complete

### Requirement: Fixed filter pipeline order
The system SHALL apply filtering in `getFiltered(records, filters, chartFilter, sort)` in this fixed order: dropdown filters, then date range, then chart drill-down, then smart search, then sort.

#### Scenario: Chart drill-down combined with search
- **WHEN** a chart drill-down filter and a smart-search term are both active
- **THEN** the chart drill-down is applied before the smart search, and both narrow the same result set (not ANDed as independent stale filters)

### Requirement: Smart search is fuzzy, not strict AND
The system SHALL score smart-search matches OR-across-fields and return any record scoring `>= 1`, not require every search token to match every field.

#### Scenario: Partial term match
- **WHEN** a smart-search term matches only one of several searchable fields on a record
- **THEN** the record is still included in the results if its score is `>= 1`

### Requirement: Default sort and exceptions
The system SHALL default every lead table to `{key:'date', dir:-1}` (newest-first). List-feeds (company report history, changelog) SHALL be fixed newest-first with no toggle. `RemindersList` (oldest-due-first) and suggestions' `'days'` mode (oldest-contact-first) are the only deliberate exceptions.

#### Scenario: Company report history ordering
- **WHEN** a company's activity history is rendered in the company report
- **THEN** entries appear newest-first with no user-facing sort toggle

### Requirement: Manual ordering is a display-layer concern
The system SHALL apply any user-defined manual row ordering (stored in `localStorage`, per-username, via `leadPrefs.js`) strictly after `getFiltered` inside the table component, never inside the shared filter function; records absent from the stored order SHALL sort after ranked ones.

#### Scenario: New lead not yet in manual order
- **WHEN** a lead created after the user's manual ordering was last saved is displayed in the table
- **THEN** it appears after all leads that are present in the stored manual order

### Requirement: Deactivated leads remain visible under "all statuses"
The system SHALL show leads with `result === 'غیرفعال'` under the "all statuses" filter like any other record, not hidden by default.

#### Scenario: Viewing all leads including deactivated
- **WHEN** a user views the lead table with no status filter applied
- **THEN** deactivated leads appear alongside active ones

### Requirement: Lead create/upsert
The system SHALL create or update a lead via `POST /api/leads`, which upserts into the physical `contacts` table using `INSERT ... ON DUPLICATE KEY UPDATE` keyed on the record's VARCHAR primary key. There SHALL be no dedicated list-GET route; listing occurs only via the `GET /api/data` boot payload.

#### Scenario: Re-submitting the same lead ID
- **WHEN** `POST /api/leads` is called with an ID that already exists
- **THEN** the existing row is updated rather than a duplicate row being created

### Requirement: Autofill from most recent company lead
The system SHALL provide `GET /api/leads/by-company` returning the single most-recent lead for a given company name, used to autofill the add-lead form when the entered company name matches an existing one.

#### Scenario: Entering a known company name
- **WHEN** a user types a company name into the add-lead form that matches an existing lead
- **THEN** the form autofills fields from that company's most recent lead record

### Requirement: Bulk import behavior
The system SHALL support per-record offline-queueable bulk import via `POST /api/leads/import`. `parseImportFile` SHALL skip rows with no company name and match columns via Persian/English header aliases; category resolution to `categoryId` SHALL happen as a separate step after parsing.

#### Scenario: Import row missing company name
- **WHEN** an imported spreadsheet row has no company name value
- **THEN** that row is skipped and not created as a lead

### Requirement: Export respects active filters
The system SHALL export the currently active filtered-and-chart-drilled-down lead set (not the raw scoped set) when a user triggers export from the leads page.

#### Scenario: Exporting with a status filter applied
- **WHEN** a user has a status filter active and clicks export
- **THEN** the exported file contains only the leads matching that filter
