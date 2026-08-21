## Purpose

Computes the "who to call today" prioritization list for agents, reducing lead history to one actionable suggestion per customer.

## ADDED Requirements

### Requirement: One suggestion per customer, most recent only
The system SHALL reduce suggestions to one record per customer — the most recent lead by date for that company — ignoring older records for the same company entirely, even if never actioned.

#### Scenario: Company with multiple historical leads
- **WHEN** a company has three lead records with different dates
- **THEN** only the most recent lead for that company is considered for suggestions

### Requirement: Exclusion rules
The system SHALL exclude from suggestions: converted leads, leads with `result === 'غیرفعال'`, leads with `result === 'در حال استعلام'` (handled elsewhere), and any lead whose latest contact date is today or in the future.

#### Scenario: Lead contacted today
- **WHEN** a lead's most recent contact date is today
- **THEN** it does not appear in the call suggestions list

#### Scenario: Deactivated lead
- **WHEN** a lead has `result === 'غیرفعال'`
- **THEN** it is excluded from suggestions regardless of contact date

### Requirement: Priority ranking
The system SHALL rank a lead with no `effectiveResult` (`noStatus`) at priority rank 3 (highest), overriding any stored `priority` value. A lead with `effectiveResult === 'بی‌پاسخ'` (`isNoAnswer`) SHALL always surface regardless of elapsed days. All other statuses SHALL surface only once elapsed days `>= 3` or rank is 3.

#### Scenario: Lead with no status at all
- **WHEN** a lead has no `effectiveResult`
- **THEN** it is ranked at priority 3 regardless of its stored `priority` field

#### Scenario: No-answer lead surfaces immediately
- **WHEN** a lead's `effectiveResult` is `'بی‌پاسخ'` and it was contacted yesterday
- **THEN** it still appears in suggestions, without waiting for the 3-day threshold

### Requirement: Pagination is a display-layer concern
The system SHALL NOT cap or paginate results inside `computeSuggestions`/`filterAgentSuggestions`; pagination SHALL be applied client-side by the suggestions panel component.

#### Scenario: Large suggestion set
- **WHEN** the computed suggestion list exceeds one page of results
- **THEN** the full list is returned by the computation functions, and the UI component paginates it for display
