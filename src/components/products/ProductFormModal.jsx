'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, PlusIcon, XCircleIcon } from '../ui/Icon.jsx';
import { useStore, addCategory } from '../../lib/store';

const empty = { name: '', categoryId: '' };

export default function ProductFormModal({ open, product, onSubmit, onCancel }) {
  const categories = useStore((s) => s.categories);
  const [f, setF] = useState(empty);
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const isEdit = !!product;

  useEffect(() => {
    if (!open) return;
    // Must re-run every time the modal reopens (this component stays mounted between opens,
    // per Modal.jsx's conditional-render pattern) to reset the form for a new/different product.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF(product ? { name: product.name || '', categoryId: product.categoryId || '' } : empty);
  }, [open, product]);

  function submit() {
    if (!f.name.trim()) { toast('نام محصول الزامی است'); return; }
    if (!f.categoryId) { toast('دسته‌بندی الزامی است'); return; }
    if (isEdit) {
      onSubmit({ name: f.name.trim(), categoryId: f.categoryId });
    } else {
      onSubmit({
        id: 'PROD-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: f.name.trim(),
        categoryId: f.categoryId,
        isCustom: true,
        createdAt: Date.now(),
      });
    }
  }

  function saveCategory() {
    const trimmed = catName.trim();
    if (!trimmed) { toast('نام دسته‌بندی را وارد کنید'); return; }
    const id = 'CAT-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    addCategory({ id, name: trimmed, isCustom: true, createdAt: Date.now() });
    setF((s) => ({ ...s, categoryId: id }));
    setCatName('');
    setCatOpen(false);
    toast('دسته‌بندی جدید ثبت شد');
  }

  function close() { onCancel(); }

  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید'}
      width="sm"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}>{isEdit ? <CheckIcon /> : <PlusIcon />}{isEdit ? 'ذخیره تغییرات' : 'افزودن محصول'}</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field -solo">
          <label>نام محصول *</label>
          <input className="crm-input" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="مثلاً: PET" />
        </div>
        <div className="crm-field -solo">
          <label>دسته‌بندی *</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <Dropdown value={f.categoryId} onChange={(v) => setF((s) => ({ ...s, categoryId: v }))} options={catOptions} placeholder="انتخاب کنید" />
            <button type="button" className="crm-flag-btn" title="افزودن دسته‌بندی جدید" onClick={() => setCatOpen(true)}><PlusIcon /></button>
          </div>
        </div>
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
      <Modal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title="افزودن دسته‌بندی جدید"
        width="sm"
        actions={<>
          <button type="button" className="crm-btn-primary" onClick={saveCategory}><CheckIcon />ثبت</button>
          <button type="button" className="crm-btn-ghost" onClick={() => setCatOpen(false)}><XCircleIcon />انصراف</button>
        </>}
      >
        <div className="crm-field -span2">
          <label>نام دسته‌بندی *</label>
          <input className="crm-input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="مثلاً: پلاستیک" autoFocus />
        </div>
      </Modal>
    </Modal>
  );
}