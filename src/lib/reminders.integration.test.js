import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb } from './testSupport/testDb.js';
import { listReminders, getReminderById, createReminder, updateReminder, deleteReminder } from './queries.js';

beforeEach(async () => { await resetTestDb(); });

const baseReminder = (overrides = {}) => ({
  id: 'REM-1', custKey: 'acme', company: 'Acme', dueDate: '2026-09-01', dueTime: '10:00',
  forAgent: 'FARNAZ', text: 'Follow up', createdAt: Date.now(), done: false, ...overrides,
});

describe('reminders queries', () => {
  it('creates and fetches a reminder', async () => {
    await createReminder(baseReminder());
    const r = await getReminderById('REM-1');
    expect(r).toMatchObject({ id: 'REM-1', company: 'Acme', dueDate: '2026-09-01', dueTime: '10:00', forAgent: 'FARNAZ', done: false });
  });

  it('marks a reminder done via a partial update', async () => {
    await createReminder(baseReminder());
    await updateReminder('REM-1', { done: true });
    const r = await getReminderById('REM-1');
    expect(r.done).toBe(true);
  });

  it('lists all reminders', async () => {
    await createReminder(baseReminder({ id: 'REM-1' }));
    await createReminder(baseReminder({ id: 'REM-2', company: 'Beta', forAgent: 'PARDIS' }));
    const list = await listReminders();
    expect(list.map((r) => r.id).sort()).toEqual(['REM-1', 'REM-2']);
  });

  it('deletes a reminder', async () => {
    await createReminder(baseReminder());
    await deleteReminder('REM-1');
    expect(await getReminderById('REM-1')).toBeNull();
  });
});
