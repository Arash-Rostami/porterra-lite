## Purpose

Tracks due-date reminders per lead/agent and surfaces overdue ones via a shared notification mechanism used by both the reminders list and the notification bell.

## ADDED Requirements

### Requirement: Reminder fields and completion toggle
The system SHALL store reminders with free-text `due_date`/`due_time` fields (from native date/time inputs) and a `done` boolean, toggled via `POST /api/reminders/[id]/done`.

#### Scenario: Marking a reminder done
- **WHEN** a user calls `POST /api/reminders/[id]/done`
- **THEN** the reminder's `done` field is set to true

### Requirement: Reminders list ordering
The system SHALL order the reminders list oldest-due-first, never toggled, deliberately differing from the newest-first default used elsewhere in the app, since the purpose is surfacing overdue items first.

#### Scenario: Viewing the reminders list
- **WHEN** a user opens the reminders list
- **THEN** the reminder with the earliest due date appears first

### Requirement: Shared notification data functions
The system SHALL have the notification bell reuse the exact same data functions (`getDueReminders`, `markReminderDone`, `findLatestComment`) as the reminder banner and comment banner, so all three surfaces must be updated together, not independently.

#### Scenario: Reminder marked done from any surface
- **WHEN** a reminder is marked done via the notification bell
- **THEN** the reminder banner and reminders list both reflect it as done without separate logic

### Requirement: Badge count and no seen/unseen tracking
The system SHALL compute the notification badge count as `due.length` only. The system SHALL NOT track seen/unseen state for the latest-comment line; no last-viewed timestamp exists.

#### Scenario: Viewing notifications does not change the badge
- **WHEN** a user opens the notification bell and views the latest comment
- **THEN** the badge count is unaffected, since it reflects only the count of due reminders
