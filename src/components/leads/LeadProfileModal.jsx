'use client';
import { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import ProductField from './ProductField.jsx';
import CompanyActivityTabs, { COMPANY_ACTIVITY_TABS } from '../customer/CompanyActivityTabs.jsx';
import Utils from '../../lib/utils.js';
import { coordLabel, coordClass, statusBadgeInfo, scopedCoordOptions, RESULT_OPTS, TEMP_OPTS, SOURCE_OPTS, sourceSuggestions } from '../../lib/filters.js';
import { companies, isCall } from '../../lib/companies.js';
import { useStore, custKey, updateRecord, setCompanyTemperature, deleteRecordWithLog, addRecords, addChangeLogEntry, addReminder, getUnifiedFeed, deleteCompany, renameCompany, addRecord } from '../../lib/store.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon, PlusIcon, TrashIcon } from '../ui/Icon.jsx';
import { useUiStore } from '../../lib/uiStore.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const FIELD_LABELS = { coordinator: 'کارشناس', company: 'شرکت', name: 'مخاطب', phone: 'تلفن', product: 'محصول', categoryId: 'دسته محصول', source: 'منبع سرنخ', date: 'تاریخ تماس', result: 'نتیجه', notes: 'یادداشت', converted: 'سرنخ تبدیل‌شده', deactivateReason: 'دلیل غیرفعال شدن' };

function formFromRecord(rec) {
  return {
    coordinator: rec.coordinator || '', company: rec.company || '', name: rec.name || '', phone: rec.phone || '',
    product: rec.product || '', categoryId: rec.categoryId || '', source: rec.source || '', date: Utils.toISODate(rec.date),
    result: rec.result || '', notes: rec.notes || '', converted: !!rec.converted,
    deactivateReason: rec.deactivateReason || '',
  };
}
const tempText = (v) => (TEMP_OPTS.find((t) => t.value === v) || {}).label || '-';
const emptyReminder = { date: '', time: '', for: '', text: '' };
const emptyQuickCall = { coordinator: '', name: '', phone: '', product: '', categoryId: '', source: '', date: '', result: '', notes: '', deactivateReason: '' };
const TAB_PAGE_SIZE = 6;
const pageOf = (items, page) => paginate(items, page, TAB_PAGE_SIZE);

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

export default function LeadProfileModal({ recordId, records, companyMeta, reminders, onMarkReminderDone, onClose, onOpenRecord }) {
  const calendar = useUiStore((u) => u.calendar);
  const profileTab = useUiStore((u) => u.profileTab);
  const categories = useStore((s) => s.categories);
  const currentUser = useStore((s) => s.currentUser);
  const currentUserName = currentUser?.displayName || currentUser?.username || null;
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const sourceOpts = useMemo(() => sourceSuggestions(records), [records]);
  const isElevatedUser = !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer');
  const rec = records.find((r) => r.id === recordId);
  const [form, setForm] = useState(() => (rec ? formFromRecord(rec) : null));
  const [errors, setErrors] = useState({});
  const [reminder, setReminder] = useState(emptyReminder);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState(() => (rec ? {
    ...emptyQuickCall,
    coordinator: rec.coordinator || '', name: rec.name || '', phone: rec.phone || '',
    product: rec.product || '', categoryId: rec.categoryId || '', source: isElevatedUser || SOURCE_OPTS.includes(Utils.normSpace(rec.source)) ? (rec.source || '') : '',
    date: Utils.toISODate(Utils.todayDdMmYyyy()),
  } : emptyQuickCall));
  const [quickReminder, setQuickReminder] = useState(emptyReminder);
  const [mainTab, setMainTab] = useState(profileTab);
  const [historyPage, setHistoryPage] = useState(1);

  const key = rec ? custKey(rec.company) : null;
  const company = useMemo(() => (key ? companies(records).find((c) => c.key === key) : null), [records, key]);
  const history = useMemo(() => {
    if (!key) return [];
    return records.filter((r) => custKey(r.company) === key).sort((a, b) => {
      const da = Utils.parseDate(a.date), db = Utils.parseDate(b.date);
      return (db || new Date(0)) - (da || new Date(0));
    });
  }, [records, key]);

  const feed = key ? getUnifiedFeed(key) : [];
  const activityCounts = {
    changelog: feed.filter((i) => i.type === 'change').length,
    correspondence: feed.filter((i) => i.type === 'comment').length,
    reminders: (reminders || []).filter((rm) => rm.custKey === key && !rm.done).length,
  };
  const historyPaged = pageOf(history, historyPage);

  if (!rec || !form) return null;
  const set = (k) => (v) => { setForm((s) => ({ ...s, [k]: v })); setErrors((s) => (s[k] ? { ...s, [k]: null } : s)); };
  const setInput = (k) => (e) => { const v = e.target.value; setForm((s) => ({ ...s, [k]: v })); setErrors((s) => (s[k] ? { ...s, [k]: null } : s)); };

  function validateForm(f) {
    const errs = {};
    if (!f.company.trim()) errs.company = 'نام شرکت الزامی است';
    if (f.result === 'غیرفعال' && !f.deactivateReason.trim()) errs.deactivateReason = 'برای غیرفعال کردن، دلیل الزامی است';
    return errs;
  }

  async function handleSave() {
    try {
      const errs = validateForm(form);
      if (Object.keys(errs).some((k) => errs[k])) {
        setErrors(errs);
        setMainTab('form');
        toast('لطفاً خطاهای فرم را برطرف کنید');
        return;
      }
      setErrors({});
      const before = { ...rec };
      const next = {
        coordinator: form.coordinator || null, company: form.company.trim() || null, name: form.name.trim() || null,
        phone: form.phone.trim() || null, product: form.product.trim() || null, categoryId: form.categoryId || null,
        source: form.source.trim() || null, date: Utils.fromISODate(form.date) || null,
        result: form.result || null, notes: form.notes.trim() || null, converted: form.converted,
        deactivateReason: form.result === 'غیرفعال' ? form.deactivateReason.trim() : null,
      };
      const newName = Utils.normName(next.company || '');
      const renamed = !!newName && newName !== Utils.normName(before.company || '');
      const companyName = renamed ? newName : before.company;
      if (renamed) {
        const merging = custKey(newName) !== key && records.some((r) => custKey(r.company) === custKey(newName));
        if (merging) {
          if (!(currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer'))) {
            toast('این نام برای شرکت دیگری ثبت شده؛ ادغام فقط توسط مدیر انجام می‌شود');
            return;
          }
          const ok = await confirm({
            title: 'ادغام شرکت‌ها',
            message: `«${newName}» از قبل وجود دارد. با تأیید، همه تماس‌ها، یادداشت‌ها و یادآوری‌های «${before.company}» به آن منتقل می‌شود. این کار قابل بازگشت نیست.`,
            confirmText: 'ادغام',
            cancelText: 'انصراف',
          });
          if (!ok) return;
        }
        if (!(await renameCompany(before.company, newName, currentUserName))) return;
      }
      delete next.company;
      if (!(await updateRecord(rec.id, next))) return;

      const changes = [];
      const catName = (id) => (id ? (categories.find((c) => c.id === id)?.name || id) : '');
      for (const f in FIELD_LABELS) {
        if (f === 'company') continue;
        let oldV = before[f], newV = next[f];
        if (f === 'categoryId') { oldV = catName(before.categoryId); newV = catName(next.categoryId); }
        if (String(oldV || '') !== String(newV || '')) changes.push(`${FIELD_LABELS[f]}: «${oldV || '-'}» → «${newV || '-'}»`);
      }
      const k = custKey(companyName);
      if (changes.length) addChangeLogEntry(k, changes.join(' | '), currentUserName);

      let reminderCreated = false;
      if (next.result === 'در حال پیگیری' && reminder.date) {
        addReminder({
          id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          custKey: k, company: companyName, dueDate: reminder.date, dueTime: reminder.time || null,
          forAgent: reminder.for || next.coordinator || null, text: reminder.text.trim() || null, createdAt: Date.now(), done: false,
        });
        addChangeLogEntry(k, `یادآوری برای ${reminder.date}${reminder.time ? ' ساعت ' + reminder.time : ''} ثبت شد`, currentUserName);
        reminderCreated = true;
      }
      toast(changes.length || reminderCreated ? 'تغییرات ذخیره شد' + (reminderCreated ? ' — یادآوری ثبت شد' : '') : 'چیزی تغییر نکرده بود');
      onClose();
    } catch (err) {
      console.error('[handleSave] threw:', err);
      toast('خطا در ذخیره: ' + (err && err.message ? err.message : 'خطای غیرمنتظره'));
    }
  }

  async function handleDelete(id) {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    const k = custKey(target.company);
    const remaining = records.find((r) => r.id !== id && isCall(r) && custKey(r.company) === k);
    const ok = await confirm({
      title: 'حذف تماس',
      message: remaining
        ? `این تماس با «${target.company || '-'}» (تاریخ ${target.date || '-'}) برای همیشه حذف بشه؟`
        : `این آخرین تماس «${target.company || '-'}» است — با تأیید، خود شرکت و یادآوری‌ها و اعلان‌هایش هم حذف می‌شود. ادامه بدید؟`,
      confirmText: 'حذف',
      cancelText: 'انصراف',
    });
    if (!ok) return;
    if (remaining) {
      const wasCurrent = id === recordId;
      deleteRecordWithLog(target);
      toast('تماس حذف شد');
      if (wasCurrent) onOpenRecord(remaining.id);
    } else {
      if (await deleteCompany(target.company)) {
        toast(`«${target.company || '-'}» با آخرین تماسش حذف شد`);
        onClose();
      }
    }
  }

  async function submitQuickCall() {
    const coordinatorSel = quick.coordinator || rec.coordinator;
    if (!coordinatorSel) { toast('کارشناس رو انتخاب کن'); return; }
    if (quick.result === 'غیرفعال' && !quick.deactivateReason.trim()) { toast('برای غیرفعال کردن، دلیل الزامی است'); return; }
    if (!quick.product.trim() || !quick.categoryId) { toast('محصول و دسته محصول الزامی است'); return; }
    if (!Utils.isPhoneOk(quick.phone)) { toast('شماره تلفن کامل نیست (حداقل ۱۰ رقم)'); return; }
    const newRec = {
      id: 'CALL-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      converted: rec.converted, coordinator: coordinatorSel, company: rec.company,
      name: quick.name.trim() || null, phone: quick.phone.trim() || null, product: quick.product.trim() || null,
      categoryId: quick.categoryId || null, source: quick.source.trim() || null,
      date: (quick.date ? Utils.fromISODate(quick.date) : '') || Utils.todayDdMmYyyy(),
      result: quick.result || null, notes: quick.notes.trim() || null,
      deactivateReason: quick.result === 'غیرفعال' ? quick.deactivateReason.trim() : null,
    };
    const k = custKey(rec.company);
    if (!(await addRecord(newRec))) return;
    addChangeLogEntry(k, `تماس جدید ثبت شد — تاریخ: ${newRec.date}${newRec.notes ? '، یادداشت: ' + newRec.notes : ''}`, coordLabel(coordinatorSel));

    let reminderCreated = false;
    if (newRec.result === 'در حال پیگیری' && quickReminder.date) {
      addReminder({
        id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        custKey: k, company: newRec.company, dueDate: quickReminder.date, dueTime: quickReminder.time || null,
        forAgent: quickReminder.for || coordinatorSel, text: quickReminder.text.trim() || null, createdAt: Date.now(), done: false,
      });
      addChangeLogEntry(k, `یادآوری برای ${quickReminder.date}${quickReminder.time ? ' ساعت ' + quickReminder.time : ''} ثبت شد`, coordLabel(coordinatorSel));
      reminderCreated = true;
    }
    onOpenRecord(newRec.id);
    setQuickOpen(false);
    toast('تماس جدید ثبت شد' + (reminderCreated ? ' — یادآوری ثبت شد' : ''));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="پروفایل سرنخ"
      width="4xl"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={handleSave}><CheckIcon />ذخیره تغییرات</button>
        <button type="button" className="crm-btn-ghost" onClick={onClose}><XCircleIcon />انصراف</button>
      </>}
    >
          <div className="crm-modal-tabs">
            <button type="button" className={`crm-modal-tab${mainTab === 'form' ? ' -active' : ''}`} onClick={() => setMainTab('form')}>فرم</button>
            <button type="button" className={`crm-modal-tab${mainTab === 'history' ? ' -active' : ''}`} onClick={() => setMainTab('history')}>تاریخچه تماس‌ها <span>({history.length.toLocaleString('en-US')})</span></button>
            {COMPANY_ACTIVITY_TABS.map((t) => (
              <button key={t.key} type="button" className={`crm-modal-tab${mainTab === t.key ? ' -active' : ''}`} onClick={() => setMainTab(t.key)}>{t.label} <span>({activityCounts[t.key].toLocaleString('en-US')})</span></button>
            ))}
          </div>

          <div className="crm-profile-tab-content">
          {mainTab === 'form' && (
          <div className="crm-form-grid">
            <div className="crm-field"><label>کارشناس</label><Dropdown value={form.coordinator} onChange={set('coordinator')} options={scopedCoordOptions(currentUser)} placeholder="انتخاب کنید" /></div>
            <div className="crm-field -span2"><label>نام شرکت</label><input className="crm-input" value={form.company} onChange={setInput('company')} maxLength={255} />{errors.company && <span className="crm-field-error">{errors.company}</span>}</div>
            <div className="crm-field"><label>نام مخاطب</label><input className="crm-input" value={form.name} onChange={setInput('name')} maxLength={255} /></div>
            <div className="crm-field"><label>تلفن</label><input className="crm-input crm-mono" value={form.phone} onChange={setInput('phone')} maxLength={128} /></div>
            <div className="crm-field"><label>محصول</label><ProductField value={form.product} onChange={set('product')} onCategorySelect={(cid) => setForm((s) => (s.categoryId ? s : { ...s, categoryId: cid }))} /></div>
            <div className="crm-field"><label>دسته محصول</label><Dropdown value={form.categoryId} onChange={set('categoryId')} options={categoryOptions} placeholder="انتخاب کنید" /></div>
            <div className="crm-field"><label>منبع سرنخ</label>{isElevatedUser ? <><input className="crm-input" list="crm-src-edit" value={form.source} onChange={setInput('source')} maxLength={64} placeholder="منبع سرنخ" /><datalist id="crm-src-edit">{sourceOpts.map((s) => <option key={s} value={s} />)}</datalist></> : <Dropdown value={form.source} onChange={set('source')} options={SOURCE_OPTS} placeholder="انتخاب کنید" />}</div>
            <div className="crm-field"><label>تاریخ تماس</label><DateField className="crm-input crm-mono" value={form.date} onChange={set('date')} /></div>
            <div className="crm-field"><label>نتیجه</label><Dropdown value={form.result} onChange={set('result')} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field"><label>دمای سرنخ</label><Dropdown value={company ? company.tempManual || 'auto' : 'auto'} onChange={async (v) => { if (await setCompanyTemperature(rec.company, v === 'auto' ? null : v)) toast('دمای سرنخ ذخیره شد'); }} options={[{ value: 'auto', label: `خودکار (${tempText(company && company.temp)})` }, ...TEMP_OPTS]} placeholder="انتخاب کنید" /></div>
            <div className="crm-field -span3"><label>یادداشت</label><textarea className="crm-textarea" rows={3} value={form.notes} onChange={setInput('notes')} maxLength={10000} /></div>
            {form.result === 'غیرفعال' && (
              <div className="crm-field -span3"><label>دلیل غیرفعال شدن *</label><textarea className="crm-textarea" rows={2} value={form.deactivateReason} onChange={setInput('deactivateReason')} maxLength={500} placeholder="چرا این سرنخ کنار گذاشته شد؟" />{errors.deactivateReason && <span className="crm-field-error">{errors.deactivateReason}</span>}</div>
            )}
            <div className="crm-field -span3">
              <label className="crm-toggle-label">
                <input type="checkbox" checked={form.converted} onChange={(e) => setForm((s) => ({ ...s, converted: e.target.checked }))} />
                <span>این سرنخ تبدیل شده</span>
              </label>
            </div>
            {form.result === 'در حال پیگیری' && (
              <div className="crm-field -span3 crm-reminder-block -visible">
                <label>ایجاد یادآوری برای این پیگیری (اختیاری)</label>
                <div className="crm-reminder-fields">
                  <DateField className="crm-input crm-mono" value={reminder.date} onChange={(v) => setReminder({ ...reminder, date: v })} />
                  <input type="time" className="crm-input crm-mono" value={reminder.time} onChange={(e) => setReminder({ ...reminder, time: e.target.value })} />
                  <Dropdown value={reminder.for} onChange={(v) => setReminder({ ...reminder, for: v })} options={scopedCoordOptions(currentUser)} placeholder="برای چه کسی" />
                  <textarea className="crm-textarea crm-reminder-note" rows={2} value={reminder.text} onChange={(e) => setReminder({ ...reminder, text: e.target.value })} placeholder="متن یادآوری (اختیاری)" />
                </div>
              </div>
            )}
          </div>
          )}

          {mainTab === 'history' && (
          <div className="crm-profile-block -notop">
            <div className="crm-profile-block-head">
              <button type="button" className="crm-btn-primary" onClick={() => setQuickOpen((o) => !o)}><PlusIcon />ثبت تماس جدید با این سرنخ</button>
            </div>
            {quickOpen && (
              <div className="crm-quickcall-form -open">
                <div className="crm-form-grid">
                  <div className="crm-field"><label>کارشناس</label><Dropdown value={quick.coordinator} onChange={(v) => setQuick({ ...quick, coordinator: v })} options={scopedCoordOptions(currentUser)} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>نام مخاطب</label><input className="crm-input" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /></div>
                  <div className="crm-field"><label>تلفن</label><input className="crm-input crm-mono" value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} /></div>
                  <div className="crm-field"><label>محصول</label><ProductField value={quick.product} onChange={(v) => setQuick({ ...quick, product: v })} onCategorySelect={(cid) => setQuick((s) => (s.categoryId ? s : { ...s, categoryId: cid }))} /></div>
                  <div className="crm-field"><label>دسته محصول</label><Dropdown value={quick.categoryId} onChange={(v) => setQuick({ ...quick, categoryId: v })} options={categoryOptions} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>منبع سرنخ</label>{isElevatedUser ? <><input className="crm-input" list="crm-src-quick" value={quick.source} onChange={(e) => setQuick({ ...quick, source: e.target.value })} maxLength={64} placeholder="منبع سرنخ" /><datalist id="crm-src-quick">{sourceOpts.map((s) => <option key={s} value={s} />)}</datalist></> : <Dropdown value={quick.source} onChange={(v) => setQuick({ ...quick, source: v })} options={SOURCE_OPTS} placeholder="انتخاب کنید" />}</div>
                  <div className="crm-field"><label>تاریخ تماس</label><DateField className="crm-input crm-mono" value={quick.date} onChange={(v) => setQuick({ ...quick, date: v })} /></div>
                  <div className="crm-field"><label>نتیجه</label><Dropdown value={quick.result} onChange={(v) => setQuick({ ...quick, result: v })} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field -span3"><label>یادداشت</label><textarea className="crm-textarea" rows={2} value={quick.notes} onChange={(e) => setQuick({ ...quick, notes: e.target.value })} /></div>
                  {quick.result === 'غیرفعال' && (
                    <div className="crm-field -span3"><label>دلیل غیرفعال شدن *</label><textarea className="crm-textarea" rows={2} value={quick.deactivateReason} onChange={(e) => setQuick({ ...quick, deactivateReason: e.target.value })} placeholder="چرا این سرنخ کنار گذاشته شد؟" /></div>
                  )}
                  {quick.result === 'در حال پیگیری' && (
                    <div className="crm-field -span3 crm-reminder-block -visible">
                      <label>ایجاد یادآوری برای این پیگیری (اختیاری)</label>
                      <div className="crm-reminder-fields">
                        <DateField className="crm-input crm-mono" value={quickReminder.date} onChange={(v) => setQuickReminder({ ...quickReminder, date: v })} />
                        <input type="time" className="crm-input crm-mono" value={quickReminder.time} onChange={(e) => setQuickReminder({ ...quickReminder, time: e.target.value })} />
                        <Dropdown value={quickReminder.for} onChange={(v) => setQuickReminder({ ...quickReminder, for: v })} options={scopedCoordOptions(currentUser)} placeholder="برای چه کسی" />
                        <textarea className="crm-textarea crm-reminder-note" rows={2} value={quickReminder.text} onChange={(e) => setQuickReminder({ ...quickReminder, text: e.target.value })} placeholder="متن یادآوری (اختیاری)" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="crm-quickcall-actions">
                  <button type="button" className="crm-btn-primary" onClick={submitQuickCall}><CheckIcon />ثبت تماس</button>
                  <button type="button" className="crm-btn-ghost" onClick={() => setQuickOpen(false)}><XCircleIcon />انصراف</button>
                </div>
              </div>
            )}
            <div className="crm-history-list">
              {!history.length ? <div className="crm-empty">تماسی ثبت نشده</div> : historyPaged.pageItems.map((r) => (
                <div className={`crm-history-item${r.id === recordId ? ' -current' : ''}`} key={r.id} onClick={() => onOpenRecord(r.id)}>
                  <div className="crm-history-item-top">
                    <span><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{r.coordinator ? coordLabel(r.coordinator) : '-'}</span> <b>{formatDisplayDate(r.date, calendar) || '-'}</b>{r.name && <> — {r.name}</>}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge r={r} />
                      <button type="button" className="crm-delete-btn crm-history-delete" title="حذف این تماس" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}><TrashIcon />حذف</button>
                    </span>
                  </div>
                  <div className="crm-history-item-notes">{r.notes || 'بدون یادداشت'}</div>
                </div>
              ))}
            </div>
            <Pagination safePage={historyPaged.safePage} totalPages={historyPaged.totalPages} onPage={setHistoryPage} />
          </div>
          )}

          {(mainTab === 'changelog' || mainTab === 'correspondence' || mainTab === 'reminders') && (
            <CompanyActivityTabs
              tab={mainTab}
              custKey={key}
              company={rec.company}
              reminders={reminders}
              onMarkReminderDone={onMarkReminderDone}
              currentUser={currentUser}
              currentUserName={currentUserName}
            />
          )}
          </div>
    </Modal>
  );
}
