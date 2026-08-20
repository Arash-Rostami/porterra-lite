'use client';
import { useState, useMemo, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import ProductField from './ProductField.jsx';
import Utils from '../../lib/utils.js';
import { findDuplicateCompany, findDuplicatePhone } from '../../lib/duplicates.js';
import { scopedCoordOptions, coordLabel, RESULT_OPTS, PRIORITY_OPTS, sourceSuggestions } from '../../lib/filters.js';
import { findLeadByCompany } from '../../lib/apiClient.js';
import { useStore } from '../../lib/store.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon } from '../ui/Icon.jsx';

const empty = { coordinator: '', company: '', name: '', phone: '', product: '', categoryId: '', source: '', date: '', price: '', result: '', priority: '', notes: '', deactivateReason: '' };

// create and edit share the same <Modal> chrome for UI consistency
export default function AddLeadForm({ open, records, defaultCoordinator, onSubmit, onCancel }) {
  const [f, setF] = useState(empty);
  const currentUser = useStore((s) => s.currentUser);
  const categories = useStore((s) => s.categories);
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const sourceOpts = useMemo(() => sourceSuggestions(records), [records]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const setInput = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (open && defaultCoordinator) setF((s) => (s.coordinator ? s : { ...s, coordinator: defaultCoordinator }));
  }, [open, defaultCoordinator]);

  async function handleCompanyBlur() {
    const company = f.company.trim();
    if (!company) return;
    try {
      const { lead } = await findLeadByCompany(company);
      if (!lead) return;
      setF((s) => ({
        ...s,
        coordinator: s.coordinator || lead.coordinator || '',
        name: s.name || lead.name || '',
        phone: s.phone || lead.phone || '',
        product: s.product || lead.product || '',
        categoryId: s.categoryId || lead.categoryId || '',
        source: s.source || lead.source || '',
      }));
      toast('اطلاعات این شرکت از سابقه قبلی پر شد — قابل ویرایش است');
    } catch {
    }
  }

  const companyDup = useMemo(() => findDuplicateCompany(records, f.company), [records, f.company]);
  const phoneDup = useMemo(() => findDuplicatePhone(records, f.phone), [records, f.phone]);

  function reset() { setF(empty); }

  function submit() {
    if (!f.coordinator || !f.company.trim()) { toast('کارشناس و نام شرکت الزامی است'); return; }
    if (f.result === 'غیرفعال' && !f.deactivateReason.trim()) { toast('برای غیرفعال کردن، دلیل الزامی است'); return; }
    const rec = {
      id: 'NEW-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      converted: false,
      coordinator: f.coordinator,
      company: f.company.trim(),
      name: f.name.trim() || null,
      phone: f.phone.trim() || null,
      product: f.product.trim() || null,
      categoryId: f.categoryId || null,
      source: f.source.trim() || null,
      date: (f.date ? Utils.fromISODate(f.date) : '') || Utils.todayDdMmYyyy(),
      price: f.price.trim() || null,
      result: f.result || null,
      priority: f.priority || null,
      notes: f.notes.trim() || null,
      deactivateReason: f.result === 'غیرفعال' ? f.deactivateReason.trim() : null,
    };
    onSubmit(rec);
    reset();
    toast('سرنخ جدید ثبت شد');
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
      title="ثبت سرنخ جدید"
      description="با ثبت، این رکورد فوراً به پنل، نمودارها و جدول زیر اضافه می‌شود."
      width="4xl"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}><CheckIcon />ثبت سرنخ</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field">
          <label>کارشناس *</label>
          {currentUser?.role === 'agent' ? (
            <input className="crm-input" value={coordLabel(f.coordinator)} disabled title="این فیلد قابل تغییر نیست" />
          ) : (
            <Dropdown value={f.coordinator} onChange={set('coordinator')} options={scopedCoordOptions(currentUser)} placeholder="انتخاب کنید" />
          )}
        </div>
        <div className="crm-field -span2">
          <label>نام شرکت *</label>
          <input className="crm-input" value={f.company} onChange={setInput('company')} onBlur={handleCompanyBlur} required placeholder="مثلاً: شرکت نمونه صنعت" />
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
          <ProductField value={f.product} onChange={set('product')} onCategorySelect={(cid) => setF((s) => (s.categoryId ? s : { ...s, categoryId: cid }))} />
        </div>
        <div className="crm-field">
          <label>دسته محصول</label>
          <Dropdown value={f.categoryId} onChange={set('categoryId')} options={categoryOptions} placeholder="انتخاب کنید" />
        </div>
        <div className="crm-field">
          <label>منبع سرنخ</label>
          <input className="crm-input" list="crm-src-add" value={f.source} onChange={setInput('source')} maxLength={64} placeholder="منبع سرنخ" />
          <datalist id="crm-src-add">{sourceOpts.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="crm-field">
          <label>تاریخ تماس</label>
          <DateField className="crm-input crm-mono" value={f.date} onChange={set('date')} />
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
        {f.result === 'غیرفعال' && (
          <div className="crm-field -span3">
            <label>دلیل غیرفعال شدن *</label>
            <textarea className="crm-textarea" rows={2} value={f.deactivateReason} onChange={setInput('deactivateReason')} placeholder="چرا این سرنخ کنار گذاشته شد؟" />
          </div>
        )}
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
    </Modal>
  );
}