# offline-sync-queue Specification

## Purpose
Keeps the app usable when MySQL is unreachable by queueing mutations to disk and falling back to a local snapshot for reads, with no data loss guaranteed until a successful sync.

## Requirements

### Requirement: Append-only mutation queue, never cleared on logout
The system SHALL queue a mutation to `/.porterra/queue.json` (append-only) when the database is unreachable, via `tryOp`. The queue SHALL persist across logout and SHALL only be cleared by a successful sync — data must never be lost.

#### Scenario: User logs out while a mutation is queued
- **WHEN** a user logs out while an unsynced mutation remains in the queue
- **THEN** the queued mutation is still present and will sync on the next successful connection

### Requirement: Sync replays queue transactionally
The system SHALL replay the entire queue in one transaction on `POST /api/sync` (via `syncData`), then reload from the database, then rewrite `snapshot.json`.

#### Scenario: Connection restored with queued mutations
- **WHEN** the database becomes reachable again with mutations queued
- **THEN** all queued mutations are applied in one transaction before the snapshot is refreshed

### Requirement: Database is the primary read path, snapshot is emergency fallback
The system SHALL read from MySQL as the primary source in `loadAllData`, falling back to `snapshot.json` only on a connection error.

#### Scenario: Normal operation
- **WHEN** the database is reachable
- **THEN** all reads go directly to MySQL, and the local snapshot file is not consulted

### Requirement: Offline-only sync polling
The system SHALL NOT poll for sync while online; a 20-second `syncNow` timer SHALL run only while `offline === true`, managed by the app shell.

#### Scenario: Application is online
- **WHEN** the app is connected to the database
- **THEN** no periodic sync timer runs

### Requirement: Snapshot written fresh, always unscoped
The system SHALL rewrite `snapshot.json` fresh after every successful load or sync, always containing the full unscoped dataset.

#### Scenario: Snapshot refresh after sync
- **WHEN** a sync completes successfully
- **THEN** `snapshot.json` is overwritten with the complete, unscoped current dataset

### Requirement: Local queue/snapshot files must stay out of version control
The system SHALL keep the `.porterra/` directory gitignored and local-only, since it holds plaintext JSON of all records.

#### Scenario: Committing repository changes
- **WHEN** a developer commits changes to the repository
- **THEN** `.porterra/queue.json` and `.porterra/snapshot.json` are excluded via `.gitignore`
