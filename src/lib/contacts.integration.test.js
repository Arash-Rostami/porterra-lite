import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb } from './testSupport/testDb.js';
import { withTransaction, getPool } from './db.js';
import {
  listLeads, getLeadById, findLeadsByCompany, findLatestLeadByCompany,
  createLead, updateLead, deleteLead, applyOp, reseedLeads,
} from './queries.js';

beforeEach(async () => { await resetTestDb(); });

const baseLead = (overrides = {}) => ({
  id: 'LEAD-1', converted: false, company: 'Acme', coordinator: 'FARNAZ', name: 'Ali',
  phone: '0912', product: 'Widget', categoryId: 'CAT-solar', source: 'اینترنت',
  date: '01.01.2026', price: '1000', result: 'در حال پیگیری', priority: 'بالا', notes: '',
  deactivateReason: null, quotePrice: null, quotePriceType: null, quoteTerms: null,
  quotePriceDate: null, quoteResult: null, quoteResultDate: null, quoteFailReason: null,
  ...overrides,
});

describe('contacts (leads) queries', () => {
  it('creates a lead and fetches it by id', async () => {
    await createLead(baseLead());
    const lead = await getLeadById('LEAD-1');
    expect(lead).toMatchObject({ id: 'LEAD-1', company: 'Acme', coordinator: 'FARNAZ', result: 'در حال پیگیری' });
  });

  it('upserts on a duplicate id via ON DUPLICATE KEY UPDATE', async () => {
    await createLead(baseLead());
    await createLead(baseLead({ company: 'Acme Updated' }));
    const all = await listLeads();
    expect(all).toHaveLength(1);
    expect(all[0].company).toBe('Acme Updated');
  });

  it('finds leads by company case-insensitively and resolves the latest one', async () => {
    await createLead(baseLead({ id: 'LEAD-1', date: '01.01.2026' }));
    await createLead(baseLead({ id: 'LEAD-2', date: '15.01.2026' }));
    const matches = await findLeadsByCompany('acme');
    expect(matches).toHaveLength(2);
    const latest = await findLatestLeadByCompany('Acme');
    expect(latest.id).toBe('LEAD-2');
  });

  it('updates only patched fields, leaving others unchanged', async () => {
    await createLead(baseLead());
    await updateLead('LEAD-1', { result: 'در حال استعلام' });
    const lead = await getLeadById('LEAD-1');
    expect(lead.result).toBe('در حال استعلام');
    expect(lead.company).toBe('Acme');
  });

  it('converts an empty-string patch value to NULL', async () => {
    await createLead(baseLead({ notes: 'something' }));
    await updateLead('LEAD-1', { notes: '' });
    const lead = await getLeadById('LEAD-1');
    expect(lead.notes).toBeNull();
  });

  it('re-syncs the legacy category text when categoryId is patched', async () => {
    await createLead(baseLead({ categoryId: 'CAT-solar' }));
    await updateLead('LEAD-1', { categoryId: 'CAT-chempoly' });
    const [rows] = await getPool().query('SELECT `category` FROM `contacts` WHERE `id`=?', ['LEAD-1']);
    expect(rows[0].category).toBe('Chemical/Polymer');
  });

  it('runs the quote announce-price then resolve lifecycle through updateLead', async () => {
    await createLead(baseLead({ result: 'در حال استعلام' }));
    await updateLead('LEAD-1', { quotePrice: '5000', quotePriceType: 'نقدی', quotePriceDate: '02.01.2026' });
    await updateLead('LEAD-1', { quoteResult: 'موفق', quoteResultDate: '03.01.2026', converted: true });
    const lead = await getLeadById('LEAD-1');
    expect(lead).toMatchObject({ result: 'در حال استعلام', quotePrice: '5000', quoteResult: 'موفق', converted: true });
  });

  it('deletes a lead', async () => {
    await createLead(baseLead());
    await deleteLead('LEAD-1');
    expect(await getLeadById('LEAD-1')).toBeNull();
  });

  it('applyOp replays a queued import inside one transaction', async () => {
    const queue = [
      { op: 'createLead', payload: { rec: baseLead({ id: 'LEAD-1' }) } },
      { op: 'createLead', payload: { rec: baseLead({ id: 'LEAD-2', company: 'Beta' }) } },
    ];
    await withTransaction(async (conn) => {
      for (const entry of queue) await applyOp(entry.op, entry.payload, conn);
    });
    const all = await listLeads();
    expect(all.map((r) => r.id).sort()).toEqual(['LEAD-1', 'LEAD-2']);
  });

  it('rolls back the whole transaction when a later op throws', async () => {
    const run = withTransaction(async (conn) => {
      await applyOp('createLead', { rec: baseLead({ id: 'LEAD-1' }) }, conn);
      await applyOp('unknownOp', {}, conn);
    });
    await expect(run).rejects.toThrow('Unknown op: unknownOp');
    const all = await listLeads();
    expect(all).toHaveLength(0);
  });

  it('applyOp importRecords upserts a batch of leads outside a transaction', async () => {
    await applyOp('importRecords', { records: [baseLead({ id: 'LEAD-A' }), baseLead({ id: 'LEAD-B', company: 'Beta' })] });
    const all = await listLeads();
    expect(all.map((r) => r.id).sort()).toEqual(['LEAD-A', 'LEAD-B']);
  });

  it('reseedLeads replaces all contacts inside one transaction', async () => {
    await createLead(baseLead({ id: 'LEAD-OLD' }));
    await reseedLeads([baseLead({ id: 'LEAD-NEW', categoryId: null })]);
    const all = await listLeads();
    expect(all.map((r) => r.id)).toEqual(['LEAD-NEW']);
  });
});
