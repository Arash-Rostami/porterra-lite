# quotes Specification

## Purpose
Governs the 2-step price-quote sub-workflow nested inside a lead record: announcing a price, then resolving the quote as won or lost, with server-enforced state transitions.

## Requirements

### Requirement: Single route, action-dispatched
The system SHALL handle both quote stage transitions through one route, `PATCH /api/quotes/[id]`, dispatched by an `action` body field (`announce-price` or `resolve`), reusing the same lead update path (`updateLead`/`applyOp('updateLead', ...)`) rather than a separate quotes table.

#### Scenario: Announcing a price
- **WHEN** a client calls `PATCH /api/quotes/[id]` with `action: 'announce-price'`
- **THEN** the underlying lead record is updated via the standard lead-update path

### Requirement: Announce-price preconditions
The system SHALL only allow `announce-price` when the lead's `result` is `'در حال استعلام'`.

#### Scenario: Announcing a price on a non-inquiry lead
- **WHEN** `action: 'announce-price'` is submitted for a lead whose `result` is not `'در حال استعلام'`
- **THEN** the server rejects the request

### Requirement: Resolve preconditions and idempotency
The system SHALL only allow `action: 'resolve'` when `quotePrice` is already set and `quoteResult` is not already set, preventing a quote from being re-resolved and silently overwriting `quoteResult`/`converted` with no audit trail.

#### Scenario: Resolving an already-resolved quote
- **WHEN** `action: 'resolve'` is submitted for a lead whose `quoteResult` is already set
- **THEN** the server rejects the request

#### Scenario: Resolving before a price was announced
- **WHEN** `action: 'resolve'` is submitted for a lead with no `quotePrice` set
- **THEN** the server rejects the request

### Requirement: Result does not leave the inquiry state during a quote
The system SHALL keep `result` at `'در حال استعلام'` throughout the quote sub-workflow; it never transitions away from `'در حال استعلام'` once a quote is opened, regardless of `quoteResult`.

#### Scenario: Quote resolved as lost
- **WHEN** a quote is resolved with `result: 'ناموفق'` outcome
- **THEN** the lead's `result` field remains `'در حال استعلام'` while `quoteResult` records the outcome

### Requirement: Server-authoritative date stamping
The system SHALL recompute `quotePriceDate`/`quoteResultDate` authoritatively on the server (via `Utils.todayDdMmYyyy()`) on each transition; any client-side optimistic stamp is corrected on refresh.

#### Scenario: Client and server clocks disagree
- **WHEN** a client's local clock differs from the server's at the moment of a quote transition
- **THEN** after the next data refresh, the displayed date reflects the server's authoritative stamp

### Requirement: Fail reason required on lost outcome
The system SHALL require `failReason` when a quote is resolved with `result: 'ناموفق'`, enforced server-side via a Zod `.refine`.

#### Scenario: Resolving as lost without a reason
- **WHEN** `action: 'resolve'` is submitted with `result: 'ناموفق'` and no `failReason`
- **THEN** the server rejects the request with a validation error

### Requirement: Quote actions respect lead scoping
The system SHALL apply the same `checkLeadScope` department/own-record scoping to quote transitions as to `PATCH /api/leads/[id]`.

#### Scenario: Out-of-scope agent attempts a quote transition
- **WHEN** an `agent`-role user attempts a quote transition on a lead outside their own `agentCode`
- **THEN** the server rejects the request

### Requirement: Open-quote derivation
The system SHALL derive whether a quote is open via `isQuoteOpen(r) = r.result === 'در حال استعلام' && !r.quoteResult`.

#### Scenario: Checking if a quote is still open
- **WHEN** a lead has `result: 'در حال استعلام'` and no `quoteResult` set
- **THEN** `isQuoteOpen` returns true for that lead
