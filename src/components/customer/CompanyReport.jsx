'use client';
import { useState } from 'react';
import Utils from '../../lib/utils.js';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import { coordLabel, coordClass, statusBadgeInfo } from '../../lib/filters.js';
import { custKey } from '../../lib/store.js';
import { FA_MONTHS } from '../../lib/calendar.js';
import { XIcon, SearchIcon } from '../ui/Icon.jsx';

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

function buildReport(records, input) {
  const trimmed = Utils.normSpace(input);
  if (!trimmed) return { empty: 'یک نام شرکت وارد کن یا از لیست انتخاب کن' };
  const key = custKey(trimmed);
  let matches = records.filter((r) => custKey(r.company) === key);
  if (!matches.length) matches = records.filter((r) => Utils.normSpace(r.company).toLowerCase().indexOf(trimmed.toLowerCase()) > -1);
  if (!matches.length) return { empty: 'شرکتی با این نام پیدا نشد' };

  const displayName = matches[0].company;
  const sorted = matches.slice().sort((a, b) => {
    const da = Utils.parseDate(a.date), db = Utils.parseDate(b.date);
    return (db || new Date(0)) - (da || new Date(0));
  });
  const dated = sorted.filter((r) => Utils.parseDate(r.date));
  const firstRec = dated.length ? dated[dated.length - 1] : null;
  const lastRec = dated.length ? dated[0] : null;
  const lastDt = lastRec ? Utils.parseDate(lastRec.date) : null;
  const coords = Array.from(new Set(matches.map((r) => r.coordinator).filter(Boolean)));
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const daysSinceLast = lastDt ? Math.round((now - lastDt) / 86400000) : null;

  const monthly = {};
  for (const r of dated) {
    const dt = Utils.parseDate(r.date);
    const k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    monthly[k] = (monthly[k] || 0) + 1;
  }
  const monthKeys = Object.keys(monthly).sort();
  const maxMonthly = Math.max(...Object.values(monthly), 1);

  return { displayName, matches, sorted, firstRec, lastRec, daysSinceLast, coords, monthly, monthKeys, maxMonthly };
}

export default function CompanyReport({ records, onOpenRecord }) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const report = query ? buildReport(records, query) : null;

  return (
    <div className="crm-section">
      <div className="crm-section-title">گزارش شرکت</div>
      <div className="crm-company-report-search">
        <CompanySuggest
          records={records}
          className="crm-input"
          value={input}
          onChange={setInput}
          onSelect={(name) => { setInput(name); setQuery(name); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setQuery(input); } }}
          placeholder="نام شرکت را وارد کنید..."
        />
        <button type="button" className="crm-btn-primary" onClick={() => setQuery(input)}><SearchIcon />نمایش گزارش</button>
      </div>
      <div className="crm-company-report-result" id="crmCompanyReportResult">
        {!report ? null : report.empty ? (
          <div className="crm-empty">{report.empty}</div>
        ) : (
          <>
            <div className="crm-company-report-header">
              <div className="crm-company-report-title-row">
                <div className="crm-company-report-title">{report.displayName}</div>
                <button type="button" className="crm-modal-close" onClick={() => { setQuery(''); setInput(''); }}><XIcon /></button>
              </div>
              <div className="crm-company-report-stats">
                <span><b>{report.matches.length.toLocaleString('en-US')}</b> تماس</span>
                <span>کارشناس‌ها: {report.coords.map((c) => coordLabel(c)).join('، ') || '-'}</span>
                {report.firstRec && <span>اولین تماس: <b>{report.firstRec.date}</b></span>}
                {report.lastRec && <span>آخرین تماس: <b>{report.lastRec.date}</b> ({report.daysSinceLast.toLocaleString('en-US')} روز پیش)</span>}
              </div>
            </div>
            {report.monthKeys.length > 0 && (
              <div className="crm-company-report-monthly">
                {report.monthKeys.map((k) => {
                  const [y, m] = k.split('-').map(Number);
                  const pct = Math.max(Math.round((report.monthly[k] / report.maxMonthly) * 100), 6);
                  return (
                    <div className="crm-cr-month-row" key={k}>
                      <span>{FA_MONTHS[m - 1]} {y}</span>
                      <div className="crm-cr-month-bar-wrap"><div className="crm-cr-month-bar" style={{ width: pct + '%' }}></div></div>
                      <b>{report.monthly[k].toLocaleString('en-US')}</b>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="crm-history-list" id="crmCompanyReportHistory" style={{ maxHeight: 'none' }}>
              {report.sorted.map((r) => (
                <div className="crm-history-item" key={r.id} onClick={() => onOpenRecord(r.id)}>
                  <div className="crm-history-item-top">
                    <span><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{r.coordinator ? coordLabel(r.coordinator) : '-'}</span> <b>{r.date || 'بدون تاریخ'}</b></span>
                    <StatusBadge r={r} />
                  </div>
                  <div className="crm-history-item-notes">{r.notes || 'بدون یادداشت'}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
