'use client';
import { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Utils from '../../lib/utils.js';
import { coordLabel, coordClass, statusBadgeInfo } from '../../lib/filters.js';
import { custKey, updateRecord, deleteRecordWithLog, addRecords, addChangeLogEntry, addComment, addReminder, getUnifiedFeed } from '../../lib/store.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon, PlusIcon, TrashIcon } from '../ui/Icon.jsx';
import { useUiStore } from '../../lib/uiStore.js';
import { formatDisplayDate } from '../../lib/calendar.js';

const COORD_OPTS = [{ value: 'FARNAZ', label: 'فرناز' }, { value: 'PARDIS', label: 'پردیس' }, { value: 'ZOHREH', label: 'زهره' }];
const CATEGORY_OPTS = ['Solar', 'Polymer', 'Petrochemical', 'Chemical', 'Chemical/Polymer', 'Wood', 'Glass Fiber'];
const RESULT_OPTS = ['در حال پیگیری', 'موفق', 'ناموفق', 'بی‌پاسخ'];
const PRIORITY_OPTS = ['بالا', 'متوسط', 'پایین'];
const COMMENT_AUTHORS = ['فرناز', 'پردیس', 'زهره'];
const FIELD_LABELS = { coordinator: 'کارشناس', company: 'شرکت', name: 'مخاطب', phone: 'تلفن', product: 'محصول', category: 'دسته محصول', source: 'منبع سرنخ', date: 'تاریخ تماس', price: 'قیمت', result: 'نتیجه', priority: 'اولویت', notes: 'یادداشت', converted: 'تبدیل به مشتری' };

function formFromRecord(rec) {
  return {
    coordinator: rec.coordinator || '', company: rec.company || '', name: rec.name || '', phone: rec.phone || '',
    product: rec.product || '', category: rec.category || '', source: rec.source || '', date: Utils.toISODate(rec.date),
    price: rec.price || '', result: rec.result || '', priority: rec.priority || '', notes: rec.notes || '', converted: !!rec.converted,
  };
}
const emptyReminder = { date: '', time: '', for: '', text: '' };
const emptyQuickCall = { coordinator: '', name: '', phone: '', product: '', category: '', source: '', date: '', price: '', result: '', priority: '', notes: '' };

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

export default function CustomerProfileModal({ recordId, records, customerMeta, onClose, onOpenRecord }) {
  const calendar = useUiStore((u) => u.calendar);
  const rec = records.find((r) => r.id === recordId);
  const [form, setForm] = useState(() => (rec ? formFromRecord(rec) : null));
  const [editor, setEditor] = useState('');
  const [reminder, setReminder] = useState(emptyReminder);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState(() => ({ ...emptyQuickCall, coordinator: rec?.coordinator || '' }));
  const [quickReminder, setQuickReminder] = useState(emptyReminder);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  const key = rec ? custKey(rec.company) : null;
  const history = useMemo(() => {
    if (!key) return [];
    return records.filter((r) => custKey(r.company) === key).sort((a, b) => {
      const da = Utils.parseDate(a.date), db = Utils.parseDate(b.date);
      return (db || new Date(0)) - (da || new Date(0));
    });
  }, [records, key]);

  const feed = key ? getUnifiedFeed(key) : [];

  if (!rec || !form) return null;
  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  const setInput = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  function handleSave() {
    const before = { ...rec };
    const next = {
      coordinator: form.coordinator || null, company: form.company.trim() || null, name: form.name.trim() || null,
      phone: form.phone.trim() || null, product: form.product.trim() || null, category: form.category || null,
      source: form.source.trim() || null, date: Utils.fromISODate(form.date) || null, price: form.price.trim() || null,
      result: form.result || null, priority: form.priority || null, notes: form.notes.trim() || null, converted: form.converted,
    };
    updateRecord(rec.id, next);

    const changes = [];
    for (const f in FIELD_LABELS) {
      const oldV = before[f], newV = next[f];
      if (String(oldV || '') !== String(newV || '')) changes.push(`${FIELD_LABELS[f]}: «${oldV || '-'}» → «${newV || '-'}»`);
    }
    const k = custKey(next.company || before.company);
    if (changes.length) addChangeLogEntry(k, changes.join(' | '), editor || null);

    let reminderCreated = false;
    if (next.result === 'در حال پیگیری' && reminder.date) {
      addReminder({
        id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        custKey: k, company: next.company, dueDate: reminder.date, dueTime: reminder.time || null,
        forAgent: reminder.for || next.coordinator || null, text: reminder.text.trim() || null, createdAt: Date.now(), done: false,
      });
      addChangeLogEntry(k, `یادآوری برای ${reminder.date}${reminder.time ? ' ساعت ' + reminder.time : ''} ثبت شد`, editor || null);
      reminderCreated = true;
    }
    toast(changes.length || reminderCreated ? 'تغییرات ذخیره شد' + (reminderCreated ? ' — یادآوری ثبت شد' : '') : 'چیزی تغییر نکرده بود');
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
    const today = new Date();
    const newRec = {
      id: 'CALL-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      converted: rec.converted, coordinator: coordinatorSel, company: rec.company,
      name: quick.name.trim() || null, phone: quick.phone.trim() || null, product: quick.product.trim() || null,
      category: quick.category || null, source: quick.source.trim() || null,
      date: (quick.date ? Utils.fromISODate(quick.date) : '') || (String(today.getDate()).padStart(2, '0') + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + today.getFullYear()),
      price: quick.price.trim() || null, result: quick.result || null, priority: quick.priority || null, notes: quick.notes.trim() || null,
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
    if (!commentAuthor) { toast('اول انتخاب کن این نظر از طرف کیه'); return; }
    if (!commentText.trim()) { toast('متن نظر خالیه'); return; }
    addComment(key, commentText.trim(), commentAuthor);
    setCommentText('');
    setCommentAuthor('');
    toast('نظر ثبت شد');
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="پروفایل مشتری"
      width="4xl"
      actions={<>
        <button type="button" className="crm-btn-primary" onClick={handleSave}><CheckIcon />ذخیره تغییرات</button>
        <button type="button" className="crm-btn-ghost" onClick={onClose}><XCircleIcon />انصراف</button>
      </>}
    >
          <div className="crm-form-grid">
            <div className="crm-field"><label>کارشناس</label><Dropdown value={form.coordinator} onChange={set('coordinator')} options={COORD_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field -span2"><label>نام شرکت</label><input className="crm-input" value={form.company} onChange={setInput('company')} /></div>
            <div className="crm-field"><label>نام مخاطب</label><input className="crm-input" value={form.name} onChange={setInput('name')} /></div>
            <div className="crm-field"><label>تلفن</label><input className="crm-input crm-mono" value={form.phone} onChange={setInput('phone')} /></div>
            <div className="crm-field"><label>محصول</label><input className="crm-input" value={form.product} onChange={setInput('product')} /></div>
            <div className="crm-field"><label>دسته محصول</label><Dropdown value={form.category} onChange={set('category')} options={CATEGORY_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field"><label>منبع سرنخ</label><input className="crm-input" value={form.source} onChange={setInput('source')} /></div>
            <div className="crm-field"><label>تاریخ تماس</label><input type="date" className="crm-input crm-mono" value={form.date} onChange={setInput('date')} /></div>
            <div className="crm-field"><label>آخرین قیمت اعلامی</label><input className="crm-input crm-mono" value={form.price} onChange={setInput('price')} /></div>
            <div className="crm-field"><label>نتیجه</label><Dropdown value={form.result} onChange={set('result')} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field"><label>اولویت</label><Dropdown value={form.priority} onChange={set('priority')} options={PRIORITY_OPTS} placeholder="انتخاب کنید" /></div>
            <div className="crm-field -span3"><label>یادداشت</label><textarea className="crm-textarea" rows={3} value={form.notes} onChange={setInput('notes')} /></div>
            <div className="crm-field -span3">
              <label className="crm-toggle-label">
                <input type="checkbox" checked={form.converted} onChange={(e) => setForm((s) => ({ ...s, converted: e.target.checked }))} />
                <span>این سرنخ به مشتری تبدیل شده</span>
              </label>
            </div>
            <div className="crm-field -span2"><label>تغییر توسط</label><Dropdown value={editor} onChange={setEditor} options={COMMENT_AUTHORS} placeholder="انتخاب کنید" /></div>
            {form.result === 'در حال پیگیری' && (
              <div className="crm-field -span3 crm-reminder-block -visible">
                <label>ایجاد یادآوری برای این پیگیری (اختیاری)</label>
                <div className="crm-reminder-fields">
                  <input type="date" className="crm-input crm-mono" value={reminder.date} onChange={(e) => setReminder({ ...reminder, date: e.target.value })} />
                  <input type="time" className="crm-input crm-mono" value={reminder.time} onChange={(e) => setReminder({ ...reminder, time: e.target.value })} />
                  <Dropdown value={reminder.for} onChange={(v) => setReminder({ ...reminder, for: v })} options={COORD_OPTS} placeholder="برای چه کسی" />
                  <input className="crm-input" value={reminder.text} onChange={(e) => setReminder({ ...reminder, text: e.target.value })} placeholder="متن یادآوری (اختیاری)" />
                </div>
              </div>
            )}
          </div>

          <div className="crm-profile-block">
            <div className="crm-profile-block-head">
              <div className="crm-profile-block-title">تاریخچه تماس‌ها <span>({history.length.toLocaleString('en-US')} تماس)</span></div>
              <button type="button" className="crm-btn-primary" onClick={() => setQuickOpen((o) => !o)}><PlusIcon />ثبت تماس جدید با این مشتری</button>
            </div>
            {quickOpen && (
              <div className="crm-quickcall-form -open">
                <div className="crm-form-grid">
                  <div className="crm-field"><label>کارشناس</label><Dropdown value={quick.coordinator} onChange={(v) => setQuick({ ...quick, coordinator: v })} options={COORD_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>نام مخاطب</label><input className="crm-input" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /></div>
                  <div className="crm-field"><label>تلفن</label><input className="crm-input crm-mono" value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} /></div>
                  <div className="crm-field"><label>محصول</label><input className="crm-input" value={quick.product} onChange={(e) => setQuick({ ...quick, product: e.target.value })} /></div>
                  <div className="crm-field"><label>دسته محصول</label><Dropdown value={quick.category} onChange={(v) => setQuick({ ...quick, category: v })} options={CATEGORY_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>منبع سرنخ</label><input className="crm-input" value={quick.source} onChange={(e) => setQuick({ ...quick, source: e.target.value })} /></div>
                  <div className="crm-field"><label>تاریخ تماس</label><input type="date" className="crm-input crm-mono" value={quick.date} onChange={(e) => setQuick({ ...quick, date: e.target.value })} /></div>
                  <div className="crm-field"><label>آخرین قیمت اعلامی</label><input className="crm-input crm-mono" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} /></div>
                  <div className="crm-field"><label>نتیجه</label><Dropdown value={quick.result} onChange={(v) => setQuick({ ...quick, result: v })} options={RESULT_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field"><label>اولویت</label><Dropdown value={quick.priority} onChange={(v) => setQuick({ ...quick, priority: v })} options={PRIORITY_OPTS} placeholder="انتخاب کنید" /></div>
                  <div className="crm-field -span3"><label>یادداشت</label><textarea className="crm-textarea" rows={2} value={quick.notes} onChange={(e) => setQuick({ ...quick, notes: e.target.value })} /></div>
                  {quick.result === 'در حال پیگیری' && (
                    <div className="crm-field -span3 crm-reminder-block -visible">
                      <label>ایجاد یادآوری برای این پیگیری (اختیاری)</label>
                      <div className="crm-reminder-fields">
                        <input type="date" className="crm-input crm-mono" value={quickReminder.date} onChange={(e) => setQuickReminder({ ...quickReminder, date: e.target.value })} />
                        <input type="time" className="crm-input crm-mono" value={quickReminder.time} onChange={(e) => setQuickReminder({ ...quickReminder, time: e.target.value })} />
                        <Dropdown value={quickReminder.for} onChange={(v) => setQuickReminder({ ...quickReminder, for: v })} options={COORD_OPTS} placeholder="برای چه کسی" />
                        <input className="crm-input" value={quickReminder.text} onChange={(e) => setQuickReminder({ ...quickReminder, text: e.target.value })} placeholder="متن یادآوری (اختیاری)" />
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
              {history.map((r) => (
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
          </div>

          <div className="crm-profile-block">
            <div className="crm-profile-block-title">مکاتبات</div>
            <div className="crm-feed-list">
              {!feed.length ? <div className="crm-feed-empty">هنوز مکاتبه‌ای برای این مشتری ثبت نشده</div> : feed.map((item) => (
                <div className={`crm-feed-item ${item.type === 'comment' ? '-comment' : '-change'}`} key={item.id}>
                  <div className="crm-feed-item-head"><b>{item.type === 'comment' ? item.author : (item.author || 'سیستم')}</b><span>{Utils.formatTs(item.ts, calendar)}</span></div>
                  <div>{item.text}</div>
                </div>
              ))}
            </div>
            <div className="crm-comment-form">
              <Dropdown value={commentAuthor} onChange={setCommentAuthor} options={COMMENT_AUTHORS} placeholder="از طرف" />
              <textarea className="crm-textarea" rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="نظر یا یادداشت خودتو بنویس..." />
              <button type="button" className="crm-btn-primary" onClick={submitComment}><CheckIcon />ثبت نظر</button>
            </div>
          </div>
    </Modal>
  );
}
