# customer-activity Specification

## Purpose
Provides a merged, per-company feed of comments and status-change history so users can see a company's full interaction timeline in one place.

## Requirements

### Requirement: Merged comment and change feed
The system SHALL store both comments and change-log entries in one table via an `enum('comment','change')` type, keyed by `company_key`, and merge them into a single feed per company.

#### Scenario: Viewing a company's activity feed
- **WHEN** a user opens a company's activity feed
- **THEN** both comments and status-change entries appear together, ordered as one timeline

### Requirement: Activity CRUD and auth
The system SHALL create activity entries via `POST /api/activity`, and edit or delete a single entry via `PATCH`/`DELETE /api/activity/[id]`. All activity endpoints SHALL require an authenticated user (`requireUser`).

#### Scenario: Unauthenticated activity creation
- **WHEN** an unauthenticated request calls `POST /api/activity`
- **THEN** the server responds with HTTP 401

### Requirement: Author derived from session, not user input
The system SHALL derive the author of a new comment automatically from the logged-in session user; there is no author-selection UI.

#### Scenario: Creating a comment
- **WHEN** a logged-in user submits a new comment
- **THEN** the stored entry's author is that session's user, without the user having selected it from a dropdown
