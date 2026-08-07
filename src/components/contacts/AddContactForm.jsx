'use client';
import { useState, useMemo, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Utils from '../../lib/utils.js';
import { findDuplicateCompany, findDuplicatePhone } from '../../lib/duplicates.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon } from '../ui/Icon.jsx';

const COORD_OPTS = [{ value: 'FARNAZ', label: 'فرناز' }, { value: 'PARDIS', label: 'پردیس' }, { value: 'ZOHREH', label: 'زهره' }];
const CATEGORY_OPTS = ['Solar', 'Polymer', 'Petrochemical', 'Chemical', 'Chemical/Polymer', 'Wood', 'Glass Fiber'];
const RESULT_OPTS = ['در حال پیگیری', 'موفق', 'ناموفق', 'بی‌پاسخ'];
const PRIORITY_OPTS = ['بالا', 'متوسط', 'پایین'];

const empty = { coordinator: '', company: '', name: '', phone: '', product: '', category: '', source: '', date: '', price: '', result: '', priority: '', notes: '' };

// create and edit share the same <Modal> chrome for UI consistency
export default function AddContactForm({ open, records, defaultCoordinator, onSubmit, onCancel }) {
  const [f, setF] = useState(empty);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const setInput = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (open && defaultCoordinator) setF((s) => (s.coordinator ? s : { ...s, coordinator: defaultCoordinator }));
  }, [open, defaultCoordinator]);

  const companyDup = useMemo(() => findDuplicateCompany(records, f.company), [records, f.company]);
  const phoneDup = useMemo(() => findDuplicatePhone(records, f.phone), [records, f.phone]);

  function reset() { setF(empty); }

  function submit() {
    if (!f.coordinator || !f.company.trim()) { toast('کارشناس و نام شرکت الزامی است'); return; }
    const today = new Date();
    const rec = {
      id: 'NEW-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      converted: false,
      coordinator: f.coordinator,
      company: f.company.trim(),
      name: f.name.trim() || null,
      phone: f.phone.trim() || null,
      product: f.product.trim() || null,
      category: f.category || null,
      source: f.source.trim() || null,
      date: (f.date ? Utils.fromISODate(f.date) : '') || (String(today.getDate()).padStart(2, '0') + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + today.getFullYear()),
      price: f.price.trim() || null,
      result: f.result || null,
      priority: f.priority || null,
      notes: f.notes.trim() || null,
    };
    onSubmit(rec);
    reset();
    toast('مخاطب جدید ثبت شد');
  }

  // close clears the draft so the next open is fresh
  function close() {
    reset();
    onCancel();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="ثبت مخاطب جدید"
      description="با ثبت، این رکورد فوراً به پنل، نمودارها و جدول زیر اضافه می‌شود."
      width="4xl"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}><CheckIcon />ثبت مخاطب</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field">
          <label>کارشناس *</label>
          <Dropdown value={f.coordinator} onChange={set('coordinator')} options={COORD_OPTS} placeholder="انتخاب کنید" />
        </div>
        <div className="crm-field -span2">
          <label>نام شرکت *</label>
          <input className="crm-input" value={f.company} onChange={setInput('company')} required placeholder="مثلاً: شرکت نمونه صنعت" />
          {companyDup && <div className="crm-dup-warning -show">{companyDup}</div>}
        </div>
        <div className="crm-field">
          <label>نام مخاطب</label>
          <input className="crm-input" value={f.name} onChange={setInput('name')} placeholder="مثلاً: آقای محمدی" />
        </div>
        <div className="crm-field">
          <label>تلفن</label>
          <input className="crm-input crm-mono" value={f.phone} onChange={setInput('phone')} placeholder="09xxxxxxxxx" />
          {phoneDup && <div className="crm-dup-warning -show">{phoneDup}</div>}
        </div>
        <div className="crm-field">
          <label>محصول</label>
          <input className="crm-input" value={f.product} onChange={setInput('product')} placeholder="مثلاً: PET / پنل خورشیدی" />
        </div>
        <div className="crm-field">
          <label>دسته محصول</label>
          <Dropdown value={f.category} onChange={set('category')} options={CATEGORY_OPTS} placeholder="انتخاب کنید" />
        </div>
        <div className="crm-field">
          <label>منبع سرنخ</label>
          <input className="crm-input" value={f.source} onChange={setInput('source')} placeholder="مثلاً: نمایشگاه، معرفی، ..." />
        </div>
        <div className="crm-field">
          <label>تاریخ تماس</label>
          <input type="date" className="crm-input crm-mono" value={f.date} onChange={setInput('date')} />
        </div>
        <div className="crm-field">
          <label>آخرین قیمت اعلامی</label>
          <input className="crm-input crm-mono" value={f.price} onChange={setInput('price')} placeholder="اختیاری" />
        </div>
        <div className="crm-field">
          <label>نتیجه</label>
          <Dropdown value={f.result} onChange={set('result')} options={RESULT_OPTS} placeholder="انتخاب کنید" />
        </div>
        <div className="crm-field">
          <label>اولویت</label>
          <Dropdown value={f.priority} onChange={set('priority')} options={PRIORITY_OPTS} placeholder="انتخاب کنید" />
        </div>
        <div className="crm-field -span3">
          <label>یادداشت</label>
          <textarea className="crm-textarea" rows={3} value={f.notes} onChange={setInput('notes')} placeholder="خلاصه مکالمه، پیگیری بعدی و ..." />
        </div>
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
    </Modal>
  );
}