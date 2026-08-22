'use client';
import { useState } from 'react';
import { useStore, addCategory, updateCategory, deleteCategory } from '../../lib/store';
import { confirm } from '../../lib/confirm';
import { toast } from '../../components/ui/Toast.jsx';
import CategoriesPanel from '../../components/categories/CategoriesPanel.jsx';
import CategoryFormModal from '../../components/categories/CategoryFormModal.jsx';

export default function CategoriesPage() {
  const categories = useStore((s) => s.categories);
  const loaded = useStore((s) => s.loaded);
  const currentUser = useStore((s) => s.currentUser);
  const isElevated = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(category) { setEditing(category); setModalOpen(true); }

  function handleSubmit(payload) {
    if (editing) { updateCategory(editing.id, payload); toast('دسته‌بندی به‌روز شد'); }
    else { addCategory(payload); toast('دسته‌بندی جدید ثبت شد'); }
    setModalOpen(false);
  }

  async function handleDelete(category) {
    const ok = await confirm({
      title: 'حذف دسته‌بندی',
      message: `دسته‌بندی «${category.name}» برای همیشه حذف بشه؟`,
      confirmText: 'حذف',
    });
    if (!ok) return;
    deleteCategory(category.id);
  }

  return (
    <div className="crm-tab-panel" id="crmPanelCategories">
      <CategoriesPanel
        categories={categories}
        loaded={loaded}
        isElevated={isElevated}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <CategoryFormModal
        open={modalOpen}
        category={editing}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}