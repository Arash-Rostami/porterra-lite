'use client';
import { useState } from 'react';
import { summarizeSuggestions } from '../../lib/suggestions.js';
import { findLatestComment } from '../../lib/store.js';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';
import { XIcon } from '../ui/Icon.jsx';

export function ReminderBanner({ byAgent }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  const { total, noAnswer, highPriority } = summarizeSuggestions(byAgent);

  if (!total) {
    return (
      <div className="crm-reminder-banner -show" id="crmReminderBanner">
        <span className="crm-reminder-banner-text">🎉 امروز پیشنهاد تماسی نداری — همه پیگیری‌ها به‌روزن</span>
        <button type="button" className="crm-banner-close" onClick={() => setClosed(true)}><XIcon /></button>
      </div>
    );
  }
  return (
    <div className="crm-reminder-banner -show" id="crmReminderBanner">
      <span className="crm-reminder-banner-text">📌 پیگیری‌های امروز:</span>
      <span className="crm-reminder-stat -total"><b>{total.toLocaleString('en-US')}</b> مورد نیاز به پیگیری</span>
      {noAnswer > 0 && (
        <span className="crm-reminder-stat -noanswer"><b>{noAnswer.toLocaleString('en-US')}</b> تماس مجدد (بی‌پاسخ)</span>
      )}
      {highPriority > 0 && (
        <span className="crm-reminder-stat -high"><b>{highPriority.toLocaleString('en-US')}</b> اولویت بالا</span>
      )}
      <button type="button" className="crm-banner-close" onClick={() => setClosed(true)}><XIcon /></button>
    </div>
  );
}

export function CommentBanner({ customerMeta, records, onOpenProfile }) {
  const [closed, setClosed] = useState(false);
  const calendar = useUiStore((u) => u.calendar);
  const found = findLatestComment(customerMeta, records);
  if (closed || !found) return null;
  const { comment, record, companyLabel } = found;
  return (
    <div className="crm-comment-banner -show" id="crmCommentBanner" onClick={() => record && onOpenProfile(record.id)}>
      <span>🗨️ برای «{companyLabel}» نظر جدیدی از <b>{comment.author || '-'}</b> ثبت شد</span>
      <span className="crm-comment-time">{Utils.formatTs(comment.ts, calendar)}</span>
      <button type="button" className="crm-banner-close" onClick={(e) => { e.stopPropagation(); setClosed(true); }}><XIcon /></button>
    </div>
  );
}
