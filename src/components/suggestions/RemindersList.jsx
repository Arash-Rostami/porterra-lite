'use client';
import { useState } from 'react';
import { getDueReminders, custKey } from '../../lib/store.js';
import { coordLabel } from '../../lib/filters.js';
import Dropdown from '../ui/Dropdown.jsx';
import { CheckIcon } from '../ui/Icon.jsx';

const PAGE_SIZE_OPTS = ['10', '20', '50', '100'];

export default function RemindersList({ reminders, records, onMarkDone, onOpenProfile }) {
  const due = getDueReminders(reminders);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  if (!due.length) return null;

  const totalPages = Math.max(1, Math.ceil(due.length / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageItems = due.slice(startIdx, startIdx + perPage);

  function changePerPage(v) {
    setPerPage(parseInt(v, 10) || 10);
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
              <span className="crm-reminder-meta">{rm.dueDate}{rm.dueTime ? ' — ' + rm.dueTime : ''}</span>
              <button type="button" className="crm-reminder-done-btn" onClick={(e) => { e.stopPropagation(); onMarkDone(rm.id); }}><CheckIcon />انجام شد</button>
            </div>
          );
        })}
      </div>
      {due.length > 0 && (
        <div className="crm-pagination-row">
          <div className="crm-page-size">
            <span>تعداد نمایش در صفحه:</span>
            <Dropdown value={String(perPage)} onChange={changePerPage} options={PAGE_SIZE_OPTS} placeholder="10" />
          </div>
          <div className="crm-pagination">
            <button className="crm-page-btn" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</button>
            <span className="crm-page-info">صفحه {safePage} از {totalPages}</span>
            <button className="crm-page-btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</button>
          </div>
        </div>
      )}
    </div>
  );
}
