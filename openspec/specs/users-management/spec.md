# users-management Specification

## Purpose
Manages user accounts, roles, departments, and active status — the administrative surface underlying authentication and authorization-scoping.

## Requirements

### Requirement: Role enum and default
The system SHALL restrict `role` to `admin`, `developer`, `manager`, or `agent`, defaulting to `agent`.

#### Scenario: Creating a user without specifying a role
- **WHEN** a new user is created with no `role` specified
- **THEN** the user is assigned role `agent`

### Requirement: User CRUD is elevated-only, with no manager exception
The system SHALL require elevated role for all user CRUD: `POST /api/users`, `PATCH`/`DELETE /api/users/[id]`, and `PATCH /api/users/[id]/active`. There SHALL be no exception for `manager`.

#### Scenario: Manager attempts to deactivate a user
- **WHEN** a `manager`-role user calls `PATCH /api/users/[id]/active`
- **THEN** the server responds with HTTP 403

### Requirement: User listing scoped by department, raw variant admin-only
The system SHALL allow any authenticated user to call `GET /api/users` (`requireUser`), scoped by department for `manager` role. The system SHALL restrict the `?raw=1` variant (including raw password ciphers) to `requireAdmin` only.

#### Scenario: Manager lists users
- **WHEN** a `manager`-role user calls `GET /api/users`
- **THEN** the response is scoped to users in that manager's department

#### Scenario: Non-admin requests raw user data
- **WHEN** a `developer`-role (elevated but not `admin`) user calls `GET /api/users?raw=1`
- **THEN** the server responds with HTTP 403

### Requirement: Free-text agent code, normalized on submit
The system SHALL treat `agentCode` as free text, normalized via `.trim().toUpperCase()` on both create and edit, with no hardcoded dropdown of allowed values — deliberately, to unblock onboarding additional agents without a code change.

#### Scenario: Submitting a lowercase agent code
- **WHEN** a user is created or edited with `agentCode: "far1"`
- **THEN** the stored value is normalized to `"FAR1"`

### Requirement: Free-text department with duplicate prevention
The system SHALL treat `department` as free text with server-side duplicate prevention via normalized (trim+lowercase) comparison (`findDepartmentByNormalizedName`), preventing near-duplicate departments from casing or whitespace typos.

#### Scenario: Creating a department that differs only by case
- **WHEN** a user is assigned `department: "Sales "` while a `"sales"` department already exists
- **THEN** the system treats it as the same existing department rather than creating a near-duplicate

### Requirement: Department listing for datalist UI
The system SHALL expose distinct department names via `GET /api/departments` (`requireUser`), used to populate a UI datalist.

#### Scenario: Loading the department datalist
- **WHEN** an authenticated user opens the user form
- **THEN** the department field's suggestions are populated from `GET /api/departments`
