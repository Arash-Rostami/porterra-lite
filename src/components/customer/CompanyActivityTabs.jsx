'use client';
import { useState } from 'react';
import Utils from '../../lib/utils.js';
import { getUnifiedFeed, addComment, updateComment, deleteComment, addReminder, addChangeLogEntry } from '../../lib/store.js';
import { coordLabel, scopedCoordOptions } from '../../lib/filters.js';
import { useUiStore } from '../../lib/uiStore.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XCircleIcon } from '../ui/Icon.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const emptyNewReminder = { date: '', time: '', for: '', text: '' };

const PAGE_SIZE = 6;

export const COMPANY_ACTIVITY_TABS = [
  { key: 'changelog', label: 'تاریخچه تغییرات' },
  { key: 'correspondence', label: 'مکاتبات' },
  { key: 'reminders', label: 'یادآوری‌ها' },
];

export default function CompanyActivityTabs({ custKey, company, tab, reminders, onMarkReminderDone, onOpenRecord, currentUser, currentUserName }) {
  const calendar = useUiStore((u) => u.calendar);
  const [commentText, setCommentText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [changelogPage, setChangelogPage] = useState(1);
  const [correspondencePage, setCorrespondencePage] = useState(1);
  const [reminderPage, setReminderPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newReminder, setNewReminder] = useState(emptyNewReminder);

  const feed = custKey ? getUnifiedFeed(custKey) : [];
  const changelogItems = feed.filter((i) => i.type === 'change');
  const correspondenceItems = feed.filter((i) => i.type === 'comment');
  const companyReminders = (reminders || [])
    .filter((rm) => rm.custKey === custKey && !rm.done)
    .sort((a, b) => (Utils.parseDate(Utils.fromISODate(a.dueDate)) || 0) - (Utils.parseDate(Utils.fromISODate(b.dueDate)) || 0));

  const changelogPaged = paginate(changelogItems, changelogPage, PAGE_SIZE);
  const correspondencePaged = paginate(correspondenceItems, correspondencePage, PAGE_SIZE);
  const reminderPaged = paginate(companyReminders, reminderPage, PAGE_SIZE);

  function submitComment() {
    if (!commentText.trim()) { toast('متن نظر خالیه'); return; }
    addComment(custKey, commentText.trim(), currentUserName);
    setCommentText('');
    toast('نظر ثبت شد');
  }

  const canEditComment = (item) => !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer' || item.author === currentUserName);

  function saveEdit() {
    if (!editText.trim()) { toast('متن نظر خالیه'); return; }
    updateComment(custKey, editId, editText.trim());
    setEditId(null);
  }

  async function removeComment(id) {
    const ok = await confirm({ title: 'حذف نظر', message: 'این نظر برای همیشه حذف شود؟', tone: 'danger', confirmText: 'حذف', cancelText: 'انصراف' });
    if (ok) deleteComment(custKey, id);
  }

  function submitNewReminder() {
    if (!newReminder.date) { toast('تاریخ یادآوری الزامی است'); return; }
    const forAgent = newReminder.for || currentUser?.agentCode || null;
    addReminder({
      id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      custKey, company: company || null, dueDate: newReminder.date, dueTime: newReminder.time || null,
      forAgent, text: newReminder.text.trim() || null, createdAt: Date.now(), done: false,
    });
    addChangeLogEntry(custKey, `یادآوری برای ${newReminder.date}${newReminder.time ? ' ساعت ' + newReminder.time : ''} ثبت شد`, currentUserName);
    setNewReminder(emptyNewReminder);
    setAddOpen(false);
    toast('یادآوری ثبت شد');
  }

  if (tab === 'changelog') {
    return (
      <div className="crm-profile-block -notop">
        <div className="crm-feed-list">
          {!changelogItems.length ? <div className="crm-feed-empty">هنوز تغییری برای این شرکت ثبت نشده</div> : changelogPaged.pageItems.map((item) => (
            <div className="crm-feed-item -change" key={item.id}>
              <div className="crm-feed-item-head"><b>{item.author || 'سیستم'}</b><span>{Utils.formatTs(item.ts, calendar)}</span></div>
              <div>{item.text}</div>
            </div>
          ))}
        </div>
        <Pagination safePage={changelogPaged.safePage} totalPages={changelogPaged.totalPages} onPage={setChangelogPage} />
      </div>
    );
  }

  if (tab === 'correspondence') {
    return (
      <div className="crm-profile-block -notop">
        <div className="crm-comment-form">
          <textarea className="crm-textarea" rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="نظر یا یادداشت خودتو بنویس..." />
          <button type="button" className="crm-btn-primary" onClick={submitComment}><CheckIcon />ثبت نظر</button>
        </div>
        <div className="crm-feed-list">
          {!correspondenceItems.length ? <div className="crm-feed-empty">هنوز نظری برای این شرکت ثبت نشده</div> : correspondencePaged.pageItems.map((item) => (
            <div className="crm-feed-item -comment" key={item.id}>
              <div className="crm-feed-item-head"><b>{item.author}</b><span>{Utils.formatTs(item.ts, calendar)}</span></div>
              {editId === item.id ? (
                <>
                  <textarea className="crm-textarea" rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="crm-quickcall-actions">
                    <button type="button" className="crm-btn-primary" onClick={saveEdit}><CheckIcon />ذخیره</button>
                    <button type="button" className="crm-btn-ghost" onClick={() => setEditId(null)}><XCircleIcon />انصراف</button>
                  </div>
                </>
              ) : <div>{item.text}</div>}
              {editId !== item.id && canEditComment(item) && (
                <div className="crm-quickcall-actions">
                  <button type="button" className="crm-edit-btn" onClick={() => { setEditId(item.id); setEditText(item.text); }}><PencilIcon />ویرایش</button>
                  <button type="button" className="crm-delete-btn" onClick={() => removeComment(item.id)}><TrashIcon />حذف</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <Pagination safePage={correspondencePaged.safePage} totalPages={correspondencePaged.totalPages} onPage={setCorrespondencePage} />
      </div>
    );
  }

  return (
    <div className="crm-profile-block -notop">
      <div className="crm-profile-block-head">
        <button type="button" className="crm-btn-primary" onClick={() => setAddOpen((o) => !o)}><PlusIcon />افزودن یادآوری</button>
      </div>
      {addOpen && (
        <div className="crm-reminder-block -visible">
          <label>یادآوری جدید برای این شرکت</label>
          <div className="crm-reminder-fields">
            <DateField className="crm-input crm-mono" value={newReminder.date} onChange={(v) => setNewReminder({ ...newReminder, date: v })} />
            <input type="time" className="crm-input crm-mono" value={newReminder.time} onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })} />
            <Dropdown value={newReminder.for} onChange={(v) => setNewReminder({ ...newReminder, for: v })} options={scopedCoordOptions(currentUser)} placeholder="برای چه کسی" />
            <textarea className="crm-textarea crm-reminder-note" rows={2} value={newReminder.text} onChange={(e) => setNewReminder({ ...newReminder, text: e.target.value })} placeholder="متن یادآوری (اختیاری)" />
          </div>
          <div className="crm-quickcall-actions">
            <button type="button" className="crm-btn-primary" onClick={submitNewReminder}><CheckIcon />ثبت یادآوری</button>
            <button type="button" className="crm-btn-ghost" onClick={() => { setAddOpen(false); setNewReminder(emptyNewReminder); }}><XCircleIcon />انصراف</button>
          </div>
        </div>
      )}
      <div className="crm-reminders-list">
        {!companyReminders.length ? <div className="crm-feed-empty">یادآوری فعالی برای این شرکت نیست</div> : reminderPaged.pageItems.map((rm) => (
          <div className="crm-reminder-row" style={{ cursor: onOpenRecord ? 'pointer' : 'default' }} key={rm.id} onClick={() => onOpenRecord && onOpenRecord(rm)}>
            <div className="crm-reminder-main">
              {rm.text && <div className="crm-reminder-text">{rm.text}</div>}
            </div>
            <span className="crm-reminder-meta">
              {formatDisplayDate(Utils.fromISODate(rm.dueDate), calendar)}{rm.dueTime ? ' — ' + rm.dueTime : ''}
              {rm.forAgent ? ' — ' + coordLabel(rm.forAgent) : ''}
            </span>
            <button type="button" className="crm-reminder-done-btn" onClick={(e) => { e.stopPropagation(); onMarkReminderDone(rm.id); }}><CheckIcon />انجام شد</button>
          </div>
        ))}
      </div>
      <Pagination safePage={reminderPaged.safePage} totalPages={reminderPaged.totalPages} onPage={setReminderPage} />
    </div>
  );
}
