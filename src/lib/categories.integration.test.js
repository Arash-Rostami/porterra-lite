import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb } from './testSupport/testDb.js';
import { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory, createProduct } from './queries.js';
import { getPool } from './db.js';

beforeEach(async () => { await resetTestDb(); });

describe('categories queries', () => {
  it('lists the two seeded base categories ordered by name', async () => {
    const cats = await listCategories();
    expect(cats.map((c) => c.name)).toEqual(['Chemical/Polymer', 'Solar']);
  });

  it('creates and fetches a category by id', async () => {
    await createCategory({ id: 'CAT-wood', name: 'Wood', isCustom: true, createdAt: Date.now() });
    const cat = await getCategoryById('CAT-wood');
    expect(cat).toMatchObject({ id: 'CAT-wood', name: 'Wood', isCustom: true });
  });

  it('rejects a duplicate category name at the database level', async () => {
    await createCategory({ id: 'CAT-dup1', name: 'Dup', isCustom: true, createdAt: Date.now() });
    await expect(
      createCategory({ id: 'CAT-dup2', name: 'Dup', isCustom: true, createdAt: Date.now() })
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('renames a category and re-syncs the legacy category text on referencing products', async () => {
    await createProduct({ id: 'PROD-1', name: 'Panel', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await updateCategory('CAT-solar', { name: 'Solar Power' });
    const cat = await getCategoryById('CAT-solar');
    expect(cat.name).toBe('Solar Power');
    const [rows] = await getPool().query('SELECT `category` FROM `products` WHERE `id`=?', ['PROD-1']);
    expect(rows[0].category).toBe('Solar Power');
  });

  it('blocks deleting a category still referenced by a product', async () => {
    await createProduct({ id: 'PROD-1', name: 'Panel', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await expect(deleteCategory('CAT-solar')).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  });

  it('deletes an unreferenced category', async () => {
    await createCategory({ id: 'CAT-temp', name: 'Temp', isCustom: true, createdAt: Date.now() });
    await deleteCategory('CAT-temp');
    expect(await getCategoryById('CAT-temp')).toBeNull();
  });
});
