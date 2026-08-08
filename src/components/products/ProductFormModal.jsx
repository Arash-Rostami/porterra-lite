'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, PlusIcon, XCircleIcon } from '../ui/Icon.jsx';
import { CATEGORY_OPTS } from '../../lib/filters.js';

const empty = { name: '', category: '' };

export default function ProductFormModal({ open, product, onSubmit, onCancel }) {
  const [f, setF] = useState(empty);
  const isEdit = !!product;

  useEffect(() => {
    if (!open) return;
    setF(product ? { name: product.name || '', category: product.category || '' } : empty);
  }, [open, product]);

  function submit() {
    if (!f.name.trim()) { toast('نام محصول الزامی است'); return; }
    if (!f.category) { toast('دسته‌بندی الزامی است'); return; }
    if (isEdit) {
      onSubmit({ name: f.name.trim(), category: f.category });
    } else {
      onSubmit({
        id: 'PROD-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: f.name.trim(),
        category: f.category,
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
      title={isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید'}
      width="sm"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}>{isEdit ? <CheckIcon /> : <PlusIcon />}{isEdit ? 'ذخیره تغییرات' : 'افزودن محصول'}</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field -span2">
          <label>نام محصول *</label>
          <input className="crm-input" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="مثلاً: PET" />
        </div>
        <div className="crm-field -span2">
          <label>دسته‌بندی *</label>
          <Dropdown value={f.category} onChange={(v) => setF((s) => ({ ...s, category: v }))} options={CATEGORY_OPTS} placeholder="انتخاب کنید" />
        </div>
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
    </Modal>
  );
}
