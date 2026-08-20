'use client';
import { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import ProductField from './ProductField.jsx';
import Utils from '../../lib/utils.js';
import { coordLabel, coordClass, statusBadgeInfo, scopedCoordOptions, RESULT_OPTS, PRIORITY_OPTS, sourceSuggestions } from '../../lib/filters.js';
import { useStore, custKey, updateRecord, deleteRecordWithLog, addRecords, addChangeLogEntry, addComment, addReminder, getUnifiedFeed } from '../../lib/store.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon, PlusIcon, TrashIcon } from '../ui/Icon.jsx';
import { useUiStore } from '../../lib/uiStore.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const FIELD_LABELS = { coordinator: 'کارشناس', company: 'شرکت', name: 'مخاطب', phone: 'تلفن', product: 'محصول', categoryId: 'دسته محصول', source: 'منبع سرنخ', date: 'تاریخ تماس', price: 'قیمت', result: 'نتیجه', priority: 'اولویت', notes: 'یادداشت', converted: 'سرنخ تبدیل‌شده', deactivateReason: 'دلیل غیرفعال شدن' };

function formFromRecord(rec) {
  return {
    coordinator: rec.coordinator || '', company: rec.company || '', name: rec.name || '', phone: rec.phone || '',
    product: rec.product || '', categoryId: rec.categoryId || '', source: rec.source || '', date: Utils.toISODate(rec.date),
    price: rec.price || '', result: rec.result || '', priority: rec.priority || '', notes: rec.notes || '', converted: !!rec.converted,
    deactivateReason: rec.deactivateReason || '',
  };
}
const emptyReminder = { date: '', time: '', for: '', text: '' };
const emptyQuickCall = { coordinator: '', name: '', phone: '', product: '', categoryId: '', source: '', date: '', price: '', result: '', priority: '', notes: '', deactivateReason: '' };
const TAB_PAGE_SIZE = 6;
const pageOf = (items, page) => paginate(items, page, TAB_PAGE_SIZE);

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

export default function LeadProfileModal({ recordId, records, companyMeta, onClose, onOpenRecord }) {
  const calendar = useUiStore((u) => u.calendar);
  const categories = useStore((s) => s.categories);
  const currentUser = useStore((s) => s.currentUser);
  const currentUserName = currentUser?.displayName || currentUser?.username || null;
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const sourceOpts = useMemo(() => sourceSuggestions(records), [records]);
  const rec = records.find((r) => r.id === recordId);
  const [form, setForm] = useState(() => (rec ? formFromRecord(rec) : null));
  const [errors, setErrors] = useState({});
  const [reminder, setReminder] = useState(emptyReminder);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState(() => ({ ...emptyQuickCall, coordinator: rec?.coordinator || '' }));
  const [quickReminder, setQuickReminder] = useState(emptyReminder);
  const [commentText, setCommentText] = useState('');
  const [mainTab, setMainTab] = useState('form');
  const [historyPage, setHistoryPage] = useState(1);
  const [changelogPage, setChangelogPage] = useState(1);
  const [correspondencePage, setCorrespondencePage] = useState(1);

  const key = rec ? custKey(rec.company) : null;
  const history = useMemo(() => {
    if (!key) return [];
    return records.filter((r) => custKey(r.company) === key).sort((a, b) => {
      const da = Utils.parseDate(a.date), db = Utils.parseDate(b.date);
      return (db || new Date(0)) - (da || new Date(0));
    });
  }, [records, key]);

  const feed = key ? getUnifiedFeed(key) : [];
  const changelogItems = feed.filter((i) => i.type === 'change');
  const correspondenceItems = feed.filter((i) => i.type === 'comment');
  const historyPaged = pageOf(history, historyPage);
  const changelogPaged = pageOf(changelogItems, changelogPage);
  const correspondencePaged = pageOf(correspondenceItems, correspondencePage);

  if (!rec || !form) return null;
  const set = (k) => (v) => { setForm((s) => ({ ...s, [k]: v })); setErrors((s) => (s[k] ? { ...s, [k]: null } : s)); };
  const setInput = (k) => (e) => { const v = e.target.value; setForm((s) => ({ ...s, [k]: v })); setErrors((s) => (s[k] ? { ...s, [k]: null } : s)); };

  function validateForm(f) {
    const errs = {};
    if (!f.company.trim()) errs.company = 'نام شرکت الزامی است';
    if (f.result === 'غیرفعال' && !f.deactivateReason.trim()) errs.deactivateReason = 'برای غیرفعال کردن، دلیل الزامی است';
    return errs;
  }

  function handleSave() {
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
        source: form.source.trim() || null, date: Utils.fromISODate(form.date) || null, price: form.price.trim() || null,
        result: form.result || null, priority: form.priority || null, notes: form.notes.trim() || null, converted: form.converted,
        deactivateReason: form.result === 'غیرفعال' ? form.deactivateReason.trim() : null,
      };
      updateRecord(rec.id, next);

      const changes = [];
      const catName = (id) => (id ? (categories.find((c) => c.id === id)?.name || id) : '');
      for (const f in FIELD_LABELS) {
        let oldV = before[f], newV = next[f];
        if (f === 'categoryId') { oldV = catName(before.categoryId); newV = catName(next.categoryId); }
        if (String(oldV || '') !== String(newV || '')) changes.push(`${FIELD_LABELS[f]}: «${oldV || '-'}» → «${newV || '-'}»`);
      }
      const k = custKey(next.company || before.company);
      if (changes.length) addChangeLogEntry(k, changes.join(' | '), currentUserName);

      let reminderCreated = false;
      if (next.result === 'در حال پیگیری' && reminder.date) {
        addReminder({
          id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          custKey: k, company: next.company, dueDate: reminder.date, dueTime: reminder.time || null,
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
    const ok = await confirm({
      title: 'حذف تماس',
      message: `این تماس با «${target.company || '-'}» (تاریخ ${target.date || '-'}) برای همیشه حذف بشه؟`,
      confirmText: 'حذف',
      cancelText: 'انصراف',
    });
    if (!ok) return;
    const k = custKey(target.company);
    const wasCurrent = id === recordId;
    deleteRecordWithLog(target);
    toast('تماس حذف شد');
    if (wasCurrent) {
      const remaining = records.find((r) => r.id !== id && custKey(r.company) === k);
      if (remaining) onOpenRecord(remaining.id); else onClose();
    }
  }

  function submitQuickCall() {
    const coordinatorSel = quick.coordinator || rec.coordinator;
    if (!coordinatorSel) { toast('کارشناس رو انتخاب کن'); return; }
    if (quick.result === 'غیرفعال' && !quick.deactivateReason.trim()) { toast('برای غیرفعال کردن، دلیل الزامی است'); return; }
    const newRec = {
      id: 'CALL-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      converted: rec.converted, coordinator: coordinatorSel, company: rec.company,
      name: quick.name.trim() || null, phone: quick.phone.trim() || null, product: quick.product.trim() || null,
      categoryId: quick.categoryId || null, source: quick.source.trim() || null,
      date: (quick.date ? Utils.fromISODate(quick.date) : '') || Utils.todayDdMmYyyy(),
      price: quick.price.trim() || null, result: quick.result || null, priority: quick.priority || null, notes: quick.notes.trim() || null,
      deactivateReason: quick.result === 'غیرفعال' ? quick.deactivateReason.trim() : null,
    };
    const k = custKey(rec.company);
    addRecords([newRec]);
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

  function submitComment() {
    if (!commentText.trim()) { toast('متن نظر خالیه'); return; }
    addComment(key, commentText.trim(), currentUserName);
    setCommentText('');
    toast('نظر ثبت شد');
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
            <button type="button" className={`crm-modal-tab${mainTab === 'changelog' ? ' -active' : ''}`} onClick={() => setMainTab('changelog')}>تاریخچه تغییرات <span>({feed.filter((i) => i.type === 'change').length.toLocaleString('en-US')})</span></button>
            <button type="button" className={`crm-modal-tab${mainTab === 'correspondence' ? ' -active' : ''}`} onClick={() => setMainTab('correspondence')}>مکاتبات <span>({feed.filter((i) => i.type === 'comment').length.toLocaleString('en-US')})</span></button>
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
            <div className="crm-field"><label>منبع سرنخ</label><input className="crm-input" list="crm-src-edit" value={form.source} onChange={setInput('source')} maxLength={64} placeholder="منبع سرنخ" /><datalist id="crm-src-edit">{sourceOpts.map((s) => <option key={s} value={s} />)}</datalist></div>
            <div className="crm-field"><label>تاریخ تماس</label><DateField className="crm-input crm-mono" value={form.date} onChange={set('date')} /></div>
            <div className="crm-field"><label>آخرین قیمت اعلامی</label><input className="crm-input crm-mono" value={form.price} onChange={setInput('price')} maxLength={64} /></div>
            <div className="crm-field"><label>نتیجه</label><Dropdown value={form.result} onChange={set('result')} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field"><label>اولویت</label><Dropdown value={form.priority} onChange={set('priority')} options={PRIORITY_OPTS} placeholder="انتخاب کنید" /></div>
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
                  <div className="crm-field"><label>منبع سرنخ</label><input className="crm-input" list="crm-src-quick" value={quick.source} onChange={(e) => setQuick({ ...quick, source: e.target.value })} maxLength={64} placeholder="منبع سرنخ" /><datalist id="crm-src-quick">{sourceOpts.map((s) => <option key={s} value={s} />)}</datalist></div>
                  <div className="crm-field"><label>تاریخ تماس</label><DateField className="crm-input crm-mono" value={quick.date} onChange={(v) => setQuick({ ...quick, date: v })} /></div>
                  <div className="crm-field"><label>آخرین قیمت اعلامی</label><input className="crm-input crm-mono" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} /></div>
                  <div className="crm-field"><label>نتیجه</label><Dropdown value={quick.result} onChange={(v) => setQuick({ ...quick, result: v })} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>اولویت</label><Dropdown value={quick.priority} onChange={(v) => setQuick({ ...quick, priority: v })} options={PRIORITY_OPTS} placeholder="انتخاب کنید" /></div>
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
                    <span><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{r.coordinator ? coordLabel(r.coordinator) : '-'}</span> <b>{formatDisplayDate(r.date, calendar) || '-'}</b></span>
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

          {mainTab === 'changelog' && (
          <div className="crm-profile-block -notop">
            <div className="crm-feed-list">
              {!changelogItems.length ? <div className="crm-feed-empty">هنوز تغییری برای این سرنخ ثبت نشده</div> : changelogPaged.pageItems.map((item) => (
                <div className="crm-feed-item -change" key={item.id}>
                  <div className="crm-feed-item-head"><b>{item.author || 'سیستم'}</b><span>{Utils.formatTs(item.ts, calendar)}</span></div>
                  <div>{item.text}</div>
                </div>
              ))}
            </div>
            <Pagination safePage={changelogPaged.safePage} totalPages={changelogPaged.totalPages} onPage={setChangelogPage} />
          </div>
          )}

          {mainTab === 'correspondence' && (
          <div className="crm-profile-block -notop">
            <div className="crm-comment-form">
              <textarea className="crm-textarea" rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="نظر یا یادداشت خودتو بنویس..." />
              <button type="button" className="crm-btn-primary" onClick={submitComment}><CheckIcon />ثبت نظر</button>
            </div>
            <div className="crm-feed-list">
              {!correspondenceItems.length ? <div className="crm-feed-empty">هنوز نظری برای این سرنخ ثبت نشده</div> : correspondencePaged.pageItems.map((item) => (
                <div className="crm-feed-item -comment" key={item.id}>
                  <div className="crm-feed-item-head"><b>{item.author}</b><span>{Utils.formatTs(item.ts, calendar)}</span></div>
                  <div>{item.text}</div>
                </div>
              ))}
            </div>
            <Pagination safePage={correspondencePaged.safePage} totalPages={correspondencePaged.totalPages} onPage={setCorrespondencePage} />
          </div>
          )}
          </div>
    </Modal>
  );
}
