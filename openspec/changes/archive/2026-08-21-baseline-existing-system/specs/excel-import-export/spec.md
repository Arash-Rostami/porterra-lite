## Purpose

Provides `.xlsx` bulk import with tolerant column matching and filter-aware export, decoupled from persistence so callers control merge/save behavior.

## ADDED Requirements

### Requirement: Alias-based column matching
The system SHALL match imported spreadsheet columns via `IMPORT_ALIASES`, supporting both Persian and English headers, case-insensitively.

#### Scenario: Importing a spreadsheet with English headers
- **WHEN** a spreadsheet uses English column headers that match a known alias
- **THEN** the corresponding fields are correctly parsed into lead records

### Requirement: Import skips rows with no company name
The system SHALL skip any import row that has no company name value.

#### Scenario: Row with all fields but company name
- **WHEN** an import row has other data but an empty company-name cell
- **THEN** that row is skipped and not turned into a lead

### Requirement: Parsing is a pure read with no side effects
The system SHALL have `parseImportFile` return parsed data only, performing no merge, persist, or toast side effects; the caller decides whether and how to merge/persist/notify.

#### Scenario: Previewing an import before committing
- **WHEN** a user selects a file to import
- **THEN** `parseImportFile` returns the parsed rows for preview without writing anything to the data store

### Requirement: Category resolution as a separate post-parse step
The system SHALL resolve category text to `categoryId` via `resolveImportCategoryIds` as a separate step after parsing (since parsing has no access to the live categories list), applying alias mapping (`Polymer`/`Petrochemical`/`Chemical` → `Chemical/Polymer`).

#### Scenario: Imported category text is an alias
- **WHEN** an imported row's category text is `"Petrochemical"`
- **THEN** it resolves to the `Chemical/Polymer` category ID

### Requirement: Export always reflects active filter and drill-down
The system SHALL export the currently filtered and chart-drilled-down record set (via the same `getFiltered(records, filters, chartFilter)` used for display), never the raw unfiltered scoped set.

#### Scenario: Exporting after applying filters
- **WHEN** a user has active filters and/or a chart drill-down applied and triggers export
- **THEN** the exported file contains exactly the currently visible filtered set
