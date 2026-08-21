## Purpose

Provides a strictly admin-only action to wipe all data back to a legacy seed dataset, intended for non-production use.

## ADDED Requirements

### Requirement: Admin-only, stricter than elevated
The system SHALL restrict `POST /api/admin/reset` to `requireAdmin` only, excluding `developer` even though `developer` is otherwise elevated.

#### Scenario: Developer attempts a data reset
- **WHEN** a `developer`-role user calls `POST /api/admin/reset`
- **THEN** the server responds with HTTP 403

### Requirement: Reset target is legacy seed data
The system SHALL reset data to `src/data/seed.js`, a legacy dataset using the old free-text `category` shape, meaning a reset yields leads with `NULL category_id`. This is explicitly acceptable since this path is admin-only and unused on the production database.

#### Scenario: Performing a reset
- **WHEN** an admin performs a data reset
- **THEN** all leads afterward have `category_id: NULL`, reflecting the legacy seed shape
