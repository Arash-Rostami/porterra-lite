'use client';
import { getDueReminders, custKey } from '../../lib/store.js';
import { coordLabel } from '../../lib/filters.js';
import { CheckIcon } from '../ui/Icon.jsx';

export default function RemindersList({ reminders, records, onMarkDone, onOpenProfile }) {
  const due = getDueReminders(reminders);
  if (!due.length) return null;

  return (
    <div className="crm-section -show" id="crmRemindersSection">
      <div className="crm-section-title">یادآوری‌های امروز و عقب‌افتاده</div>
      <div className="crm-reminders-list" id="crmRemindersList">
        {due.map((rm) => {
          const rec = records.find((r) => custKey(r.company) === rm.custKey);
          return (
            <div className="crm-reminder-row" key={rm.id} onClick={() => rec && onOpenProfile(rec.id)}>
              <div className="crm-reminder-main">
                <div className="crm-reminder-company">{rm.company}{rm.forAgent ? ' — برای ' + coordLabel(rm.forAgent) : ''}</div>
                {rm.text && <div className="crm-reminder-text">{rm.text}</div>}
              </div>
              <span className="crm-reminder-meta">{rm.dueDate}{rm.dueTime ? ' — ' + rm.dueTime : ''}</span>
              <button type="button" className="crm-reminder-done-btn" onClick={(e) => { e.stopPropagation(); onMarkDone(rm.id); }}><CheckIcon />انجام شد</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
