## Purpose

Defines the role tiers and department/own-record data-scoping rules the system enforces server-side, independent of and layered underneath the authentication tiers.

## ADDED Requirements

### Requirement: Role tiers
The system SHALL support exactly four roles: `admin`, `developer`, `manager`, `agent`. `admin` and `developer` are "elevated" and bypass all data scoping. `manager` is department-scoped. `agent` is scoped to their own records only, by `agentCode`.

#### Scenario: Elevated role sees all data
- **WHEN** a user with role `admin` or `developer` requests boot data
- **THEN** the response includes records across all departments and agents, unfiltered

#### Scenario: Manager sees only their department
- **WHEN** a user with role `manager` requests boot data
- **THEN** the response is filtered to only agents belonging to that manager's department

#### Scenario: Agent sees only their own records
- **WHEN** a user with role `agent` requests boot data
- **THEN** the response is filtered to only records where `agentCode` matches that agent's own code

### Requirement: Managers cannot administer users
The system SHALL NOT grant `manager` role create, edit, or delete rights over the `users` resource, even though managers otherwise receive a department-scoped view of other data.

#### Scenario: Manager attempts to create a user
- **WHEN** a `manager`-role user calls `POST /api/users`
- **THEN** the server responds with HTTP 403

### Requirement: Server-side scope enforcement
The system SHALL enforce department/own-record scoping server-side (via `resolveScope`/`scopeBootData`/`checkLeadScope`); any client-side narrowing (e.g. scoped dropdown options) is a UI convenience only, not a security boundary.

#### Scenario: Forced out-of-scope value is rejected
- **WHEN** an `agent`-role user issues a direct API call attempting to modify a record outside their own `agentCode` scope
- **THEN** the server rejects the request regardless of what the client UI would have allowed

### Requirement: Unscoped snapshot writes
The system SHALL always compute and write the on-disk offline snapshot (`snapshot.json`) from the full, unscoped dataset; scoping is applied only as a post-filter on read, never baked into what is persisted to the shared snapshot.

#### Scenario: Snapshot written after a scoped user's session
- **WHEN** an `agent`-scoped session triggers a data load or sync that writes `snapshot.json`
- **THEN** the snapshot contains the full unscoped dataset, not just that agent's records

### Requirement: Which resources are scoped
The system SHALL NOT apply department/agent scoping to `products` or `categories` — these are available identically to all authenticated users. The system SHALL apply department/agent scoping to `records` (leads/contacts), `reminders`, and `companyMeta`.

#### Scenario: Agent requests product catalog
- **WHEN** any authenticated user, regardless of role, requests the product catalog
- **THEN** the full, unscoped product list is returned

### Requirement: Client-side scoped-data narrowing
The system SHALL apply one further client-only narrowing on top of server-scoped data via `useScopedData`: for role `agent`, further filter to `agentCode === self`; for role `manager`, no further narrowing beyond the server-scoped department; `admin`/`developer` are unaffected.

#### Scenario: Manager views their already-scoped department data
- **WHEN** a `manager`-role user's client renders boot data already scoped to their department
- **THEN** the client applies no additional filtering beyond what the server provided
