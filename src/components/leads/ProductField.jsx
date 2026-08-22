'use client';
import { useMemo, useState } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import Modal from '../ui/Modal.jsx';
import { useStore, addProduct } from '../../lib/store';
import { toast } from '../ui/Toast.jsx';
import { PlusIcon, CheckIcon, XCircleIcon } from '../ui/Icon.jsx';

export default function ProductField({ value, onChange, onCategorySelect }) {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const options = useMemo(() => Array.from(new Set(products.map((p) => p.name))).sort((a, b) => a.localeCompare(b)), [products]);
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');

  function handleProductSelect(prodName) {
    onChange(prodName);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || !categoryId) { toast('نام محصول و دسته‌بندی الزامی است'); return; }
    if (products.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) { toast('این محصول قبلاً ثبت شده'); return; }
    addProduct({ id: 'PROD-' + Date.now() + '-' + Math.floor(Math.random() * 10000), name: trimmed, categoryId, isCustom: true, createdAt: Date.now() });
    onChange(trimmed);
    if (onCategorySelect) onCategorySelect(categoryId);
    setName('');
    setCategoryId('');
    setOpen(false);
    toast('محصول جدید ثبت شد');
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      <Dropdown value={value} onChange={handleProductSelect} options={options} placeholder="انتخاب کنید" />
      <button type="button" className="crm-flag-btn" title="افزودن محصول جدید" onClick={() => setOpen(true)}><PlusIcon /></button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="افزودن محصول جدید"
        width="sm"
        actions={<>
          <button type="button" className="crm-btn-primary" onClick={submit}><CheckIcon />ثبت محصول</button>
          <button type="button" className="crm-btn-ghost" onClick={() => setOpen(false)}><XCircleIcon />انصراف</button>
        </>}
      >
        <div className="crm-form-grid">
          <div className="crm-field -span2">
            <label>نام محصول</label>
            <input className="crm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: PET" />
          </div>
          <div className="crm-field -span2">
            <label>دسته‌بندی</label>
            <Dropdown value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="انتخاب کنید" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
