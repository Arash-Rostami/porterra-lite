'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, PlusIcon, XCircleIcon } from '../ui/Icon.jsx';

const empty = { name: '' };

export default function CategoryFormModal({ open, category, onSubmit, onCancel }) {
  const [f, setF] = useState(empty);
  const isEdit = !!category;

  useEffect(() => {
    if (!open) return;
    setF(category ? { name: category.name || '' } : empty);
  }, [open, category]);

  function submit() {
    if (!f.name.trim()) { toast('نام دسته‌بندی را وارد کنید'); return; }
    if (isEdit) {
      onSubmit({ name: f.name.trim() });
    } else {
      onSubmit({
        id: 'CAT-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: f.name.trim(),
        isCustom: true,
        createdAt: Date.now(),
      });
    }
  }

  function close() { onCancel(); }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}
      width="sm"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}>{isEdit ? <CheckIcon /> : <PlusIcon />}{isEdit ? 'ذخیره تغییرات' : 'افزودن دسته‌بندی'}</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field -solo">
          <label>نام دسته‌بندی *</label>
          <input className="crm-input" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="مثلاً: PET" />
        </div>
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
    </Modal>
  );
}