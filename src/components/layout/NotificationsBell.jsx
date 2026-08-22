'use client';
import { useState, useRef, useEffect } from 'react';
import { getDueReminders, markReminderDone, findLatestComment, custKey, useScopedData } from '../../lib/store';
import { openProfile } from '../../lib/uiStore';
import { coordLabel } from '../../lib/filters';
import { BellIcon, CheckIcon } from '../ui/Icon.jsx';
import { toast } from '../ui/Toast.jsx';
import Utils from '../../lib/utils';
import { useUiStore } from '../../lib/uiStore';
import { formatDisplayDate } from '../../lib/calendar';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 6;

// surfaces due reminders + latest comment on every tab, not just Suggestions
export default function NotificationsBell() {
  const { records, reminders, companyMeta } = useScopedData();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const rootRef = useRef(null);
  const calendar = useUiStore((u) => u.calendar);

  function toggleOpen() {
    setOpen((o) => !o);
    setPage(1);
  }

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const due = getDueReminders(reminders);
  const duePaged = paginate(due, page, PER_PAGE);
  const latestComment = findLatestComment(companyMeta, records);

  function goTo(id) {
    openProfile(id);
    setOpen(false);
  }

  return (
    <div className="crm-notif-wrap" ref={rootRef}>
      <button type="button" className="crm-theme-toggle crm-notif-bell" onClick={toggleOpen} title="اعلان‌ها">
        <BellIcon />
        {due.length > 0 && <span className="crm-notif-badge">{due.length > 9 ? '9+' : due.length}</span>}
      </button>

      {open && (
        <div className="crm-notif-dropdown">
          <div className="crm-notif-dropdown-title">یادآوری‌های سررسیدشده</div>
          {!due.length ? (
            <div className="crm-notif-empty">🎉 پیشنهاد تماسی نیست — همه پیگیری‌ها به‌روزن</div>
          ) : duePaged.pageItems.map((rm) => {
            const rec = records.find((r) => custKey(r.company) === rm.custKey);
            return (
              <div className="crm-notif-item" key={rm.id}>
                <div className="crm-notif-item-main" onClick={() => rec && goTo(rec.id)}>
                  <div className="crm-notif-item-company">{rm.company}{rm.forAgent ? ' — ' + coordLabel(rm.forAgent) : ''}</div>
                  {rm.text && <div className="crm-notif-item-text">{rm.text}</div>}
                  <div className="crm-notif-item-meta">{formatDisplayDate(Utils.fromISODate(rm.dueDate), calendar)}{rm.dueTime ? ' — ' + rm.dueTime : ''}</div>
                </div>
                <button type="button" className="crm-notif-done-btn" title="انجام شد" onClick={(e) => { e.stopPropagation(); markReminderDone(rm.id); toast('یادآوری به‌عنوان انجام‌شده علامت خورد'); }}>
                  <CheckIcon />
                </button>
              </div>
            );
          })}
          <Pagination safePage={duePaged.safePage} totalPages={duePaged.totalPages} onPage={setPage} />

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
