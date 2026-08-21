import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDb, closeTestDb } from './testSupport/testDb.js';
import { listProducts, getProductById, createProduct, updateProduct, deleteProduct } from './queries.js';

beforeEach(async () => { await resetTestDb(); });
afterAll(async () => { await closeTestDb(); });

describe('products queries', () => {
  it('creates a product linked to a category', async () => {
    await createProduct({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    const p = await getProductById('PROD-1');
    expect(p).toMatchObject({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true });
  });

  it('lists all products', async () => {
    await createProduct({ id: 'PROD-1', name: 'A', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await createProduct({ id: 'PROD-2', name: 'B', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    const products = await listProducts();
    expect(products.map((p) => p.id).sort()).toEqual(['PROD-1', 'PROD-2']);
  });

  it('rejects a duplicate product name at the database level', async () => {
    await createProduct({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await expect(
      createProduct({ id: 'PROD-2', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() })
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('updates only the patched fields, leaving others unchanged', async () => {
    await createProduct({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await updateProduct('PROD-1', { name: 'Widget v2' });
    const p = await getProductById('PROD-1');
    expect(p).toMatchObject({ name: 'Widget v2', categoryId: 'CAT-solar' });
  });

  it('deletes a product', async () => {
    await createProduct({ id: 'PROD-1', name: 'Widget', categoryId: 'CAT-solar', isCustom: true, createdAt: Date.now() });
    await deleteProduct('PROD-1');
    expect(await getProductById('PROD-1')).toBeNull();
  });
});
