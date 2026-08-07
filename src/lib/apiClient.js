async function req(method, url, body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

const enc = encodeURIComponent;

export async function loadAllData() {
  try {
    return await req('GET', '/api/data');
  } catch (e) {
    if (e.message === 'UNAUTHORIZED') return { data: null, currentUser: null, unauthorized: true };
    throw e;
  }
}

export const getCurrentUser = () => req('GET', '/api/auth/me');
export const login = (email, password) => req('POST', '/api/auth/login', { email, password });
export const logout = () => req('POST', '/api/auth/logout');

export const createContact = (rec) => req('POST', '/api/contacts', { rec });
export const updateContact = (id, patch) => req('PATCH', `/api/contacts/${enc(id)}`, { patch });
export const deleteContact = (payload) =>
  req('DELETE', `/api/contacts/${enc(payload.id)}`, payload.changeLogEntry ? { changeLogEntry: payload.changeLogEntry } : undefined);

export const addChangeLog = (p) => req('POST', '/api/activity', { ...p, type: 'change' });
export const addComment = (p) => req('POST', '/api/activity', { ...p, type: 'comment' });
export const updateActivity = (id, patch) => req('PATCH', `/api/activity/${enc(id)}`, { patch });
export const deleteActivity = (id) => req('DELETE', `/api/activity/${enc(id)}`);

export const addReminder = (r) => req('POST', '/api/reminders', r);
export const markReminderDone = (id) => req('POST', `/api/reminders/${enc(id)}/done`);
export const updateReminder = (id, patch) => req('PATCH', `/api/reminders/${enc(id)}`, { patch });
export const deleteReminder = (id) => req('DELETE', `/api/reminders/${enc(id)}`);

export const importRecords = (records) => req('POST', '/api/contacts/import', { records });
export const syncNow = () => req('POST', '/api/sync');
export const resetToSeed = () => req('POST', '/api/admin/reset');

export const listUsersAction = () => req('GET', '/api/users');
export const listUsersWithPasswords = () => req('GET', '/api/users?raw=1');
export const createUserAction = (input) => req('POST', '/api/users', input);
export const updateUserAction = (id, patch) => req('PATCH', `/api/users/${enc(id)}`, { patch });
export const setUserActiveAction = (id, active) => req('PATCH', `/api/users/${enc(id)}/active`, { active });
export const deleteUserAction = (id) => req('DELETE', `/api/users/${enc(id)}`);