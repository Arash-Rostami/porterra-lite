import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDb, closeTestDb } from './testSupport/testDb.js';
import {
  listUsers, listUsersRaw, getUserById, findUserByUsername, findUserByEmail,
  createUser, updateUser, updateUserLastLogin, setUserActive, deleteUser,
  listDepartmentNames, findDepartmentByNormalizedName, listAgentCodesByDepartment, listActiveAgents,
} from './queries.js';

beforeEach(async () => { await resetTestDb(); });
afterAll(async () => { await closeTestDb(); });

const baseUser = (overrides = {}) => ({
  id: 'USR-1', username: 'farnaz', email: 'farnaz@example.com', display_name: 'Farnaz',
  agent_code: 'FARNAZ', department: 'Sales', password_cipher: 'cipher-text', role: 'agent',
  active: 1, last_login: null, created_at: Date.now(), ...overrides,
});

describe('users queries', () => {
  it('creates a user and finds it by username and email', async () => {
    await createUser(baseUser());
    expect((await findUserByUsername('farnaz')).id).toBe('USR-1');
    expect((await findUserByEmail('farnaz@example.com')).id).toBe('USR-1');
  });

  it('exposes the password cipher only via listUsersRaw, not listUsers', async () => {
    await createUser(baseUser());
    const safe = await listUsers();
    expect(safe[0].passwordCipher).toBeUndefined();
    const raw = await listUsersRaw();
    expect(raw[0].password_cipher).toBe('cipher-text');
  });

  it('updates last login and active flag independently', async () => {
    await createUser(baseUser());
    await updateUserLastLogin('USR-1', 123456);
    await setUserActive('USR-1', false);
    const row = await getUserById('USR-1');
    expect(Number(row.last_login)).toBe(123456);
    expect(Boolean(row.active)).toBe(false);
  });

  it('updates only patched fields via updateUser', async () => {
    await createUser(baseUser());
    await updateUser('USR-1', { displayName: 'Farnaz K.' });
    const row = await getUserById('USR-1');
    expect(row.display_name).toBe('Farnaz K.');
    expect(row.department).toBe('Sales');
  });

  it('resolves distinct department names and agent codes by department', async () => {
    await createUser(baseUser());
    await createUser(baseUser({ id: 'USR-2', username: 'pardis', email: 'pardis@example.com', agent_code: 'PARDIS' }));
    expect(await listDepartmentNames()).toEqual(['Sales']);
    expect((await listAgentCodesByDepartment('Sales')).sort()).toEqual(['FARNAZ', 'PARDIS']);
  });

  it('finds a department by normalized (trim+lowercase) name', async () => {
    await createUser(baseUser());
    expect(await findDepartmentByNormalizedName(' sales ')).toBe('Sales');
    expect(await findDepartmentByNormalizedName('marketing')).toBeNull();
  });

  it('lists only active agents with a non-null agent code', async () => {
    await createUser(baseUser());
    await createUser(baseUser({ id: 'USR-2', username: 'inactive', email: 'inactive@example.com', agent_code: 'INACTIVE', active: 0 }));
    const agents = await listActiveAgents();
    expect(agents.map((a) => a.agentCode)).toEqual(['FARNAZ']);
  });

  it('deletes a user', async () => {
    await createUser(baseUser());
    await deleteUser('USR-1');
    expect(await getUserById('USR-1')).toBeNull();
  });
});
