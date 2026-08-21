import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDb, closeTestDb } from './testSupport/testDb.js';
import { listActivity, getActivityById, createActivity, updateActivity, deleteActivity } from './queries.js';

beforeEach(async () => { await resetTestDb(); });
afterAll(async () => { await closeTestDb(); });

describe('customer_activity queries', () => {
  it('creates a comment and a change entry under the same company key', async () => {
    await createActivity({ id: 'ACT-1', companyKey: 'acme', type: 'comment', ts: Date.now(), author: 'Farnaz', text: 'Called them' });
    await createActivity({ id: 'ACT-2', companyKey: 'acme', type: 'change', ts: Date.now(), author: 'Farnaz', text: 'Status changed' });
    const all = await listActivity();
    expect(all.map((a) => a.type).sort()).toEqual(['change', 'comment']);
  });

  it('updates an activity entry text', async () => {
    await createActivity({ id: 'ACT-1', companyKey: 'acme', type: 'comment', ts: Date.now(), author: 'Farnaz', text: 'Original' });
    await updateActivity('ACT-1', { text: 'Edited' });
    const a = await getActivityById('ACT-1');
    expect(a.text).toBe('Edited');
  });

  it('deletes an activity entry', async () => {
    await createActivity({ id: 'ACT-1', companyKey: 'acme', type: 'comment', ts: Date.now(), author: 'Farnaz', text: 'x' });
    await deleteActivity('ACT-1');
    expect(await getActivityById('ACT-1')).toBeNull();
  });
});
