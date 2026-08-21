## Purpose

Authenticates users into the CRM via a server-validated session cookie, with reversible password storage so credentials can be recovered by admins, and no self-service signup path.

## ADDED Requirements

### Requirement: Session-cookie login
The system SHALL authenticate users by email and password only, with no signup page; accounts are provisioned via the `npm run db:create-user` CLI or the elevated-only `/users` admin UI.

#### Scenario: Successful login sets session cookie
- **WHEN** a user submits valid email and password to `POST /api/auth/login`
- **THEN** the server sets an httpOnly `crm_session` cookie identifying the user

#### Scenario: Logout clears session cookie
- **WHEN** a user calls `POST /api/auth/logout`
- **THEN** the server clears the `crm_session` cookie

### Requirement: Reversible password storage
The system SHALL store user passwords AES-256-GCM encrypted (reversible), not one-way hashed, keyed by the `ENCRYPTION_KEY` environment variable, as a deliberate product decision rather than an oversight.

#### Scenario: Password ciphertext is recoverable
- **WHEN** an admin needs to view a stored password via `GET /api/users?raw=1`
- **THEN** the system can decrypt the stored ciphertext back to plaintext using `ENCRYPTION_KEY`

### Requirement: Per-request session re-validation
The system SHALL treat the `crm_session` cookie only as a token carrier and re-validate the encoded user against the database on every server request, memoized per-request; the routing proxy matcher excludes `/api` and is not the security boundary.

#### Scenario: Deactivated user's existing session is rejected
- **WHEN** a user's account is deactivated while they hold a valid `crm_session` cookie
- **THEN** the next server request re-checks the database and treats the user as unauthenticated

#### Scenario: Database unreachable falls back to token payload
- **WHEN** the database is unreachable during session validation
- **THEN** the system trusts the session token's embedded payload, including `department`, so scoping continues to function offline

### Requirement: Unauthenticated request handling by route type
The system SHALL return HTTP 401 JSON for unauthenticated calls to any `/api/*` route, and SHALL redirect unauthenticated requests to `/login` for all other non-`/login` routes.

#### Scenario: Unauthenticated API call
- **WHEN** a request without a valid session hits any `/api/*` route (other than `/api/auth/login`)
- **THEN** the server responds with HTTP 401 and a JSON error body, not a redirect

#### Scenario: Unauthenticated page visit
- **WHEN** a request without a valid session hits a non-API, non-`/login` page route
- **THEN** the server redirects the request to `/login`

### Requirement: Auth failure mapping
The system SHALL throw `UNAUTHORIZED` from `requireUser()` and `FORBIDDEN` from `requireAdmin()`/`requireElevated()`, and the API handler SHALL map these to HTTP 401 and 403 respectively.

#### Scenario: Non-elevated user calls an elevated-only route
- **WHEN** an authenticated `agent`-role user calls a route guarded by `requireElevated()`
- **THEN** the server responds with HTTP 403
