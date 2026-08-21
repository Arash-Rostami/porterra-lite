## Purpose

Provides the category lookup table that replaces legacy free-text category fields on leads and products, with referential-integrity protection against accidental deletion.

## ADDED Requirements

### Requirement: Asymmetric create vs. edit/delete permissions
The system SHALL allow any authenticated user (`requireUser`) to create a category via `POST /api/categories`, for the same inline-create rationale as products. The system SHALL require elevated role (`requireElevated`) for `PATCH`/`DELETE /api/categories/[id]`.

#### Scenario: Non-elevated user creates a category inline
- **WHEN** any authenticated user creates a new category from an inline add-category widget
- **THEN** the creation succeeds without requiring elevated role

### Requirement: Unique category name
The system SHALL enforce a unique `name` per category.

#### Scenario: Creating a duplicate category name
- **WHEN** a category is created with a `name` that already exists
- **THEN** the server rejects the request

### Requirement: Deletion protected by referential integrity
The system SHALL block deletion of a category still referenced by any product or contact, enforced at the database level via `ON DELETE RESTRICT` foreign keys on `products.category_id` and `contacts.category_id`, surfaced to the user as a validation error rather than a server error.

#### Scenario: Deleting a category in use
- **WHEN** an elevated user attempts to delete a category still referenced by at least one product or lead
- **THEN** the deletion fails with a user-facing validation error, not an HTTP 500

### Requirement: Seed categories
The system SHALL ship exactly two base categories at initial seed: `Chemical/Polymer` (`CAT-chempoly`) and `Solar` (`CAT-solar`), both with `is_custom = 0`.

#### Scenario: Fresh database seed
- **WHEN** the database is seeded from its initial state
- **THEN** exactly the `Chemical/Polymer` and `Solar` categories exist, marked as non-custom

### Requirement: Rename re-hydrates cached display names
The system SHALL, on category rename (`updateCategory`), re-hydrate every cached record's and product's display `category` name in one pass via `hydrateAllCategoryNames()`.

#### Scenario: Renaming a category
- **WHEN** an elevated user renames an existing category
- **THEN** all leads and products referencing that category via `category_id` show the new name without individually being re-saved
