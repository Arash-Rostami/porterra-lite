'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, PlusIcon, XCircleIcon } from '../ui/Icon.jsx';
import { coordLabel } from '../../lib/filters.js';

const ROLE_OPTS = [{ value: 'admin', label: 'مدیر' }, { value: 'developer', label: 'توسعه‌دهنده' }, { value: 'manager', label: 'سرپرست بخش' }, { value: 'agent', label: 'کارشناس' }];

const empty = { username: '', displayName: '', email: '', agentCode: '', department: '', role: 'agent', password: '', active: true };

// create and edit share the same <Modal> chrome for UI consistency (same pattern as AddLeadForm)
export default function UserFormModal({ open, user, currentUserId, isElevated, departments = [], onSubmit, onCancel }) {
  const [f, setF] = useState(empty);
  const isEdit = !!user;
  const isSelf = isEdit && user?.id === currentUserId;
  // non-elevated users (agent) can only touch email/password on their own account — everything else is locked
  const fieldsLocked = isEdit && !isElevated;

  useEffect(() => {
    if (!open) return;
    // Must re-run every time the modal reopens (this component stays mounted between opens,
    // per Modal.jsx's conditional-render pattern) to reset the form for a new/different user.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF(user
      ? {
        username: user.username || '',
        displayName: user.displayName || '',
        email: user.email || '',
        agentCode: user.agentCode || '',
        department: user.department || '',
        role: user.role || 'agent',
        password: '',
        active: user.active !== false,
      }
      : empty);
  }, [open, user]);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const setInput = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  function submit() {
    if (!f.username.trim()) { toast('نام کاربری الزامی است'); return; }
    if (!isEdit && !f.password) { toast('گذرواژه الزامی است'); return; }
    if (isEdit) {
      const patch = fieldsLocked
        ? { email: f.email.trim() }
        : {
          displayName: f.displayName.trim(),
          email: f.email.trim(),
          agentCode: f.agentCode.trim().toUpperCase(),
          department: f.department.trim(),
          ...(isSelf ? {} : { role: f.role, active: f.active }),
        };
      if (f.password) patch.password = f.password;
      onSubmit(patch);
    } else {
      onSubmit({
        id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        username: f.username.trim(),
        email: f.email.trim(),
        displayName: f.displayName.trim(),
        agentCode: f.agentCode.trim().toUpperCase(),
        department: f.department.trim(),
        role: f.role,
        password: f.password,
        active: f.active,
      });
    }
  }

  function close() { onCancel(); }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
      description={isEdit ? 'گذرواژه را خالی بگذارید تا تغییر نکند.' : 'کاربر جدید با ایمیل و گذرواژه می‌تواند وارد شود.'}
      width="3xl"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={submit}>{isEdit ? <CheckIcon /> : <PlusIcon />}{isEdit ? 'ذخیره تغییرات' : 'افزودن کاربر'}</button>
        <button type="button" className="crm-btn-ghost" onClick={close}><XCircleIcon />انصراف</button>
      </>}
    >
      <div className="crm-form-grid">
        <div className="crm-field">
          <label>نام کاربری *</label>
          <input className="crm-input" value={f.username} onChange={setInput('username')} disabled={isEdit} placeholder="مثلاً: arash" />
        </div>
        <div className="crm-field">
          <label>نام نمایشی</label>
          <input className="crm-input" value={f.displayName} onChange={setInput('displayName')} disabled={fieldsLocked} placeholder="مثلاً: آرش رستمی" />
        </div>
        <div className="crm-field">
          <label>ایمیل</label>
          <input type="email" className="crm-input" value={f.email} onChange={setInput('email')} dir="ltr" placeholder="user@example.com" />
        </div>
        <div className="crm-field">
          <label>کارشناس</label>
          {fieldsLocked ? (
            <input className="crm-input" value={f.agentCode ? coordLabel(f.agentCode) : 'بدون کارشناس'} disabled title="این فیلد قابل تغییر نیست" />
          ) : (
            <input className="crm-input" value={f.agentCode} onChange={setInput('agentCode')} placeholder="مثلاً ALI" />
          )}
        </div>
        <div className="crm-field">
          <label>بخش</label>
          {fieldsLocked ? (
            <input className="crm-input" value={f.department || 'بدون بخش'} disabled title="این فیلد قابل تغییر نیست" />
          ) : (
            <>
              <input className="crm-input" list="crm-dept-form" value={f.department} onChange={setInput('department')} maxLength={150} placeholder="مثلاً: فروش" />
              <datalist id="crm-dept-form">{departments.map((d) => <option key={d} value={d} />)}</datalist>
            </>
          )}
        </div>
        <div className="crm-field">
          <label>نقش *</label>
          {isSelf ? (
            <input className="crm-input" value={ROLE_OPTS.find((o) => o.value === f.role)?.label || f.role} disabled title="نقش حساب خودتان قابل تغییر نیست" />
          ) : (
            <Dropdown value={f.role} onChange={set('role')} options={ROLE_OPTS} placeholder="انتخاب کنید" />
          )}
        </div>
        <div className="crm-field">
          <label>گذرواژه{isEdit ? '' : ' *'}</label>
          <input type="password" className="crm-input" value={f.password} onChange={setInput('password')} dir="ltr" placeholder={isEdit ? 'خالی = بدون تغییر' : 'گذرواژه اولیه'} />
        </div>
        <div className="crm-field -span2">
          <label className="crm-check-row">
            <input type="checkbox" checked={f.active} disabled={isSelf} onChange={(e) => setF((s) => ({ ...s, active: e.target.checked }))} />
            <span>حساب فعال است</span>
          </label>
        </div>
      </div>
      <div className="crm-required-note">فیلدهای ستاره‌دار الزامی هستند.</div>
    </Modal>
  );
}