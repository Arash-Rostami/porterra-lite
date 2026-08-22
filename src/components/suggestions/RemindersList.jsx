'use client';
import { useState } from 'react';
import { getDueReminders, custKey } from '../../lib/store';
import { coordLabel } from '../../lib/filters';
import { useUiStore } from '../../lib/uiStore';
import { formatDisplayDate } from '../../lib/calendar';
import Utils from '../../lib/utils';
import { CheckIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

export default function RemindersList({ reminders, records, onMarkDone, onOpenProfile }) {
  const calendar = useUiStore((u) => u.calendar);
  const due = getDueReminders(reminders);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  if (!due.length) return null;

  const { pageItems, totalPages, safePage } = paginate(due, page, perPage);

  function changePerPage(v) {
    setPerPage(v);
    setPage(1);
  }

  return (
    <div className="crm-section -show" id="crmRemindersSection">
      <div className="crm-section-title-row">
        <div className="crm-section-title">یادآوری‌های امروز و عقب‌افتاده</div>
        <div className="crm-result-count">{due.length.toLocaleString('en-US')} مورد</div>
      </div>
      <div className="crm-reminders-list" id="crmRemindersList">
        {pageItems.map((rm) => {
          const rec = records.find((r) => custKey(r.company) === rm.custKey);
          return (
            <div className="crm-reminder-row" key={rm.id} onClick={() => rec && onOpenProfile(rec.id)}>
              <div className="crm-reminder-main">
                <div className="crm-reminder-company">{rm.company}{rm.forAgent ? ' — برای ' + coordLabel(rm.forAgent) : ''}</div>
                {rm.text && <div className="crm-reminder-text">{rm.text}</div>}
              </div>
              <span className="crm-reminder-meta">{formatDisplayDate(Utils.fromISODate(rm.dueDate), calendar)}{rm.dueTime ? ' — ' + rm.dueTime : ''}</span>
              <button type="button" className="crm-reminder-done-btn" onClick={(e) => { e.stopPropagation(); onMarkDone(rm.id); }}><CheckIcon />انجام شد</button>
            </div>
          );
        })}
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} perPage={perPage} onPerPage={changePerPage} />
    </div>
  );
}
