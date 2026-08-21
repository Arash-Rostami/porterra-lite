import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb } from './testSupport/testDb.js';
import { createLead, createProduct, createCategory, createReminder, createActivity, createUser, loadAllFromDb } from './queries.js';

beforeEach(async () => { await resetTestDb(); });

describe('loadAllFromDb', () => {
  it('assembles all 6 boot-payload keys, correctly splitting companyMeta comments vs changeLog', async () => {
    const companyKey = 'acme';

    await createLead({
      id: 'LEAD-1', converted: false, company: 'Acme', coordinator: 'FARNAZ', name: 'Ali',
      phone: '0912', product: 'Widget', categoryId: 'CAT-solar', source: 'اینترنت',
      date: '01.01.2026', price: '1000', result: 'در حال پیگیری', priority: 'بالا', notes: '',
      deactivateReason: null, quotePrice: null, quotePriceType: null, quoteTerms: null,
      quotePriceDate: null, quoteResult: null, quoteResultDate: null, quoteFailReason: null,
    });

    await createProduct({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });

    await createCategory({ id: 'CAT-custom', name: 'Custom Cat', isCustom: true, createdAt: Date.now() });

    await createReminder({
      id: 'REM-1', custKey: companyKey, company: 'Acme', dueDate: '2026-09-01', dueTime: '10:00',
      forAgent: 'FARNAZ', text: 'Follow up', createdAt: Date.now(), done: false,
    });

    await createUser({
      id: 'USR-1', username: 'farnaz', email: 'farnaz@example.com', display_name: 'Farnaz',
      agent_code: 'FARNAZ', department: 'Sales', password_cipher: 'cipher-text', role: 'agent',
      active: 1, last_login: null, created_at: Date.now(),
    });

    await createActivity({ id: 'ACT-1', companyKey, type: 'comment', ts: Date.now(), author: 'Farnaz', text: 'Called them' });
    await createActivity({ id: 'ACT-2', companyKey, type: 'change', ts: Date.now(), author: 'Farnaz', text: 'Status changed' });

    const data = await loadAllFromDb();

    expect(Object.keys(data).sort()).toEqual(
      ['agents', 'categories', 'companyMeta', 'products', 'records', 'reminders'].sort()
    );

    expect(data.records).toHaveLength(1);
    expect(data.records[0]).toMatchObject({ id: 'LEAD-1', company: 'Acme' });

    expect(data.products).toHaveLength(1);
    expect(data.products[0]).toMatchObject({ id: 'PROD-1', name: 'Widget' });

    // 2 seeded categories (CAT-solar, CAT-chempoly) + the one created above.
    expect(data.categories.map((c) => c.id).sort()).toEqual(['CAT-chempoly', 'CAT-custom', 'CAT-solar']);

    expect(data.reminders).toHaveLength(1);
    expect(data.reminders[0]).toMatchObject({ id: 'REM-1', custKey: companyKey });

    expect(data.agents).toHaveLength(1);
    expect(data.agents[0]).toMatchObject({ agentCode: 'FARNAZ', displayName: 'Farnaz', department: 'Sales' });

    expect(data.companyMeta[companyKey].comments).toHaveLength(1);
    expect(data.companyMeta[companyKey].comments[0]).toMatchObject({ id: 'ACT-1', type: 'comment', text: 'Called them' });
    expect(data.companyMeta[companyKey].changeLog).toHaveLength(1);
    expect(data.companyMeta[companyKey].changeLog[0]).toMatchObject({ id: 'ACT-2', type: 'change', text: 'Status changed' });
  });
});
