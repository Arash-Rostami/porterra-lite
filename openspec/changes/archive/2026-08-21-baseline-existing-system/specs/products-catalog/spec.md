## Purpose

Manages the product catalog referenced by leads and quotes, linked to the categories lookup table, with intentionally asymmetric create-vs-edit permissions.

## ADDED Requirements

### Requirement: Unique product name
The system SHALL enforce a unique `name` per product; a duplicate create SHALL fail with a translated HTTP 400, not a raw database error.

#### Scenario: Creating a duplicate product name
- **WHEN** `POST /api/products` or `PATCH /api/products/[id]` is submitted with a `name` that already exists
- **THEN** the server responds with HTTP 400, translating the underlying `ER_DUP_ENTRY` error

### Requirement: Asymmetric create vs. edit/delete permissions
The system SHALL allow any authenticated user (`requireUser`) to create a product via `POST /api/products`, to support inline "add on the fly" creation from the product field widget. The system SHALL require elevated role (`requireElevated`) for `PATCH`/`DELETE /api/products/[id]`.

#### Scenario: Non-elevated user creates a product inline
- **WHEN** any authenticated user creates a new product from the inline add-product widget
- **THEN** the creation succeeds without requiring elevated role

#### Scenario: Non-elevated user attempts to delete a product
- **WHEN** a non-elevated authenticated user calls `DELETE /api/products/[id]`
- **THEN** the server responds with HTTP 403

### Requirement: Loaded at boot
The system SHALL load the product catalog once at application boot alongside contacts, activity, and reminders, rather than being independently fetched (unlike `/users`).

#### Scenario: Application boot
- **WHEN** the client loads the app's initial boot data
- **THEN** the response includes the full product catalog without a separate request

### Requirement: Legacy category field write-sync
The system SHALL keep the legacy free-text `category` column on `products` write-synced from `category_id` on every save (for external/legacy consumers), while the application itself reads `category_id` exclusively and never reads `category`.

#### Scenario: Saving a product with a category assigned
- **WHEN** a product is saved with `category_id` set
- **THEN** the legacy `category` text column is updated to match the category's name, even though the app does not read it back
