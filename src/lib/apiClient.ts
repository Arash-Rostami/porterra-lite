async function req<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const opt: RequestInit & { headers: Record<string, string> } = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data as T;
}

const enc = encodeURIComponent;

export async function loadAllData(): Promise<{ data: unknown; currentUser: unknown; unauthorized?: boolean } | Record<string, unknown>> {
  try {
    return await req('GET', '/api/data');
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return { data: null, currentUser: null, unauthorized: true };
    throw e;
  }
}

export const login = (email: string, password: string) => req('POST', '/api/auth/login', { email, password });
export const logout = () => req('POST', '/api/auth/logout');

export const createLead = (rec: unknown) => req('POST', '/api/leads', { rec });
export const updateLead = (id: string, patch: unknown) => req('PATCH', `/api/leads/${enc(id)}`, { patch });
export const deleteLead = (payload: { id: string; changeLogEntry?: unknown }) =>
  req('DELETE', `/api/leads/${enc(payload.id)}`, payload.changeLogEntry ? { changeLogEntry: payload.changeLogEntry } : undefined);
export const findLeadByCompany = (company: string) => req('GET', `/api/leads/by-company?company=${enc(company)}`);

export const addChangeLog = (p: unknown) => req('POST', '/api/activity', { ...(p as object), type: 'change' });
export const addComment = (p: unknown) => req('POST', '/api/activity', { ...(p as object), type: 'comment' });

export const addReminder = (r: unknown) => req('POST', '/api/reminders', r);
export const markReminderDone = (id: string) => req('POST', `/api/reminders/${enc(id)}/done`);
export const updateReminder = (id: string, patch: unknown) => req('PATCH', `/api/reminders/${enc(id)}`, { patch });
export const deleteReminder = (id: string) => req('DELETE', `/api/reminders/${enc(id)}`);

export const createProduct = (product: unknown) => req('POST', '/api/products', { product });
export const updateProductAction = (id: string, patch: unknown) => req('PATCH', `/api/products/${enc(id)}`, { patch });
export const deleteProductAction = (id: string) => req('DELETE', `/api/products/${enc(id)}`);
export const createCategory = (category: unknown) => req('POST', '/api/categories', { category });
export const updateCategoryAction = (id: string, patch: unknown) => req('PATCH', `/api/categories/${enc(id)}`, { patch });
export const deleteCategoryAction = (id: string) => req('DELETE', `/api/categories/${enc(id)}`);
export const announceQuotePrice = (id: string, price: string, priceType: string | null, terms: string | null) =>
  req('PATCH', `/api/quotes/${enc(id)}`, { action: 'announce-price', price, priceType, terms });
export const resolveQuote = (id: string, result: string, failReason: string | null) =>
  req('PATCH', `/api/quotes/${enc(id)}`, { action: 'resolve', result, failReason });

export const importRecords = (records: unknown[]) => req('POST', '/api/leads/import', { records });
export const syncNow = () => req('POST', '/api/sync');
export const resetToSeed = () => req('POST', '/api/admin/reset');

export const listDepartmentsAction = () => req('GET', '/api/departments');

export const listUsersAction = () => req('GET', '/api/users');
export const listUsersWithPasswords = () => req('GET', '/api/users?raw=1');
export const createUserAction = (input: unknown) => req('POST', '/api/users', input);
export const updateUserAction = (id: string, patch: unknown) => req('PATCH', `/api/users/${enc(id)}`, { patch });
export const setUserActiveAction = (id: string, active: boolean) => req('PATCH', `/api/users/${enc(id)}/active`, { active });
export const deleteUserAction = (id: string) => req('DELETE', `/api/users/${enc(id)}`);
