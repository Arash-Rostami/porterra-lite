'use client';
import { useState } from 'react';
import { useStore, addProduct, updateProduct, deleteProduct } from '../../lib/store.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../../components/ui/Toast.jsx';
import ProductsPanel from '../../components/products/ProductsPanel.jsx';
import ProductFormModal from '../../components/products/ProductFormModal.jsx';

export default function ProductsPage() {
  const products = useStore((s) => s.products);
  const loaded = useStore((s) => s.loaded);
  const currentUser = useStore((s) => s.currentUser);
  const isElevated = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(product) { setEditing(product); setModalOpen(true); }

  function handleSubmit(payload) {
    if (editing) { updateProduct(editing.id, payload); toast('محصول به‌روز شد'); }
    else { addProduct(payload); toast('محصول جدید ثبت شد'); }
    setModalOpen(false);
  }

  async function handleDelete(product) {
    const ok = await confirm({
      title: 'حذف محصول',
      message: `محصول «${product.name}» برای همیشه حذف بشه؟`,
      confirmText: 'حذف',
    });
    if (!ok) return;
    deleteProduct(product.id);
    toast('محصول حذف شد');
  }

  return (
    <div className="crm-tab-panel" id="crmPanelProducts">
      <ProductsPanel
        products={products}
        loaded={loaded}
        isElevated={isElevated}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <ProductFormModal
        open={modalOpen}
        product={editing}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
