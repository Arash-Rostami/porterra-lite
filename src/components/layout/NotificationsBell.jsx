'use client';
import { useState, useRef, useEffect } from 'react';
import { getDueReminders, markReminderDone, findLatestComment, custKey, useScopedData } from '../../lib/store.js';
import { openProfile } from '../../lib/uiStore.js';
import { coordLabel } from '../../lib/filters.js';
import { BellIcon, CheckIcon } from '../ui/Icon.jsx';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';

// surfaces due reminders + latest comment on every tab, not just Suggestions
export default function NotificationsBell() {
  const { records, reminders, customerMeta } = useScopedData();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const calendar = useUiStore((u) => u.calendar);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const due = getDueReminders(reminders);
  const latestComment = findLatestComment(customerMeta, records);

  function goTo(id) {
    openProfile(id);
    setOpen(false);
  }

  return (
    <div className="crm-notif-wrap" ref={rootRef}>
      <button type="button" className="crm-theme-toggle crm-notif-bell" onClick={() => setOpen((o) => !o)} title="اعلان‌ها">
        <BellIcon />
        {due.length > 0 && <span className="crm-notif-badge">{due.length > 9 ? '9+' : due.length}</span>}
      </button>

      {open && (
        <div className="crm-notif-dropdown">
          <div className="crm-notif-dropdown-title">یادآوری‌های سررسیدشده</div>
          {!due.length ? (
            <div className="crm-notif-empty">🎉 پیشنهاد تماسی نیست — همه پیگیری‌ها به‌روزن</div>
          ) : due.map((rm) => {
            const rec = records.find((r) => custKey(r.company) === rm.custKey);
            return (
              <div className="crm-notif-item" key={rm.id}>
                <div className="crm-notif-item-main" onClick={() => rec && goTo(rec.id)}>
                  <div className="crm-notif-item-company">{rm.company}{rm.forAgent ? ' — ' + coordLabel(rm.forAgent) : ''}</div>
                  {rm.text && <div className="crm-notif-item-text">{rm.text}</div>}
                  <div className="crm-notif-item-meta">{rm.dueDate}{rm.dueTime ? ' — ' + rm.dueTime : ''}</div>
                </div>
                <button type="button" className="crm-notif-done-btn" title="انجام شد" onClick={(e) => { e.stopPropagation(); markReminderDone(rm.id); }}>
                  <CheckIcon />
                </button>
              </div>
            );
          })}

          {latestComment && (
            <>
              <div className="crm-notif-dropdown-title">آخرین مکاتبه</div>
              <div className="crm-notif-item">
                <div className="crm-notif-item-main" onClick={() => latestComment.record && goTo(latestComment.record.id)}>
                  <div className="crm-notif-item-company">{latestComment.companyLabel}</div>
                  <div className="crm-notif-item-text">{latestComment.comment.author ? `${latestComment.comment.author}: ` : ''}{latestComment.comment.text}</div>
                  <div className="crm-notif-item-meta">{Utils.formatTs(latestComment.comment.ts, calendar)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
