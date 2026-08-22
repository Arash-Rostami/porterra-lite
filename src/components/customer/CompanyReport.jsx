'use client';
import { useEffect, useMemo, useState } from 'react';
import Utils from '../../lib/utils';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import { coordLabel, coordClass, statusBadgeInfo } from '../../lib/filters';
import { custKey } from '../../lib/store';
import { FA_MONTHS, JALALI_MONTHS, formatDisplayDate, gregorianToJalali } from '../../lib/calendar';
import { useUiStore } from '../../lib/uiStore';
import { XIcon, SearchIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 6;
const COMPANY_LIST_PAGE_SIZE = 20;

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

function buildReport(records, input, calendar) {
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

  const jalali = calendar === 'jalali';
  const monthly = {};
  for (const r of dated) {
    const dt = Utils.parseDate(r.date);
    let y = dt.getFullYear(), m = dt.getMonth() + 1;
    if (jalali) [y, m] = gregorianToJalali(y, m, dt.getDate());
    const k = y + '-' + String(m).padStart(2, '0');
    monthly[k] = (monthly[k] || 0) + 1;
  }
  const monthKeys = Object.keys(monthly).sort().reverse();
  const maxMonthly = Math.max(...Object.values(monthly), 1);

  return { displayName, matches, sorted, firstRec, lastRec, daysSinceLast, coords, monthly, monthKeys, maxMonthly };
}

export default function CompanyReport({ records, onOpenRecord, initialCompany = '' }) {
  const calendar = useUiStore((u) => u.calendar);
  const [input, setInput] = useState(initialCompany);
  const [query, setQuery] = useState(initialCompany);
  const [page, setPage] = useState(1);
  const [companyListPage, setCompanyListPage] = useState(1);
  const report = query ? buildReport(records, query, calendar) : null;
  const historyPage = report && !report.empty ? paginate(report.sorted, page, PER_PAGE) : null;

  useEffect(() => {
    if (!initialCompany) return;
    // Must re-run whenever initialCompany changes post-mount (e.g. navigating between company
    // report links without a full page reload), not just once at mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput(initialCompany);
    setQuery(initialCompany);
    setPage(1);
  }, [initialCompany]);

  const companies = useMemo(() => {
    const seen = new Map();
    for (const r of records) {
      const name = Utils.normSpace(r.company);
      if (!name) continue;
      const key = custKey(r.company);
      if (!seen.has(key)) seen.set(key, { name, count: 0 });
      seen.get(key).count++;
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);
  const companyListPaged = paginate(companies, companyListPage, COMPANY_LIST_PAGE_SIZE);

  function runQuery(v) {
    setQuery(v);
    setPage(1);
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title">گزارش شرکت</div>
      <div className="crm-company-report-search">
        <CompanySuggest
          records={records}
          className="crm-input"
          value={input}
          onChange={setInput}
          onSelect={(name) => { setInput(name); runQuery(name); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runQuery(input); } }}
          placeholder="نام شرکت را وارد کنید..."
        />
        <button type="button" className="crm-btn-primary" onClick={() => runQuery(input)}><SearchIcon />نمایش گزارش</button>
      </div>
      <div className="crm-company-report-result" id="crmCompanyReportResult">
        {!report ? (
          <div className="crm-section" style={{ marginTop: 8 }}>
            <div className="crm-section-title-row">
              <div className="crm-section-title">فهرست شرکت‌ها</div>
              <span className="crm-result-count">{companies.length.toLocaleString('en-US')} شرکت</span>
            </div>
            <div className="crm-history-list" style={{ maxHeight: 'none' }}>
              {!companies.length ? (
                <div className="crm-feed-empty">شرکتی ثبت نشده است</div>
              ) : companyListPaged.pageItems.map((c) => (
                <div className="crm-history-item" key={c.name} onClick={() => { setInput(c.name); runQuery(c.name); }}>
                  <div className="crm-history-item-top">
                    <span><b>{c.name}</b></span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.count.toLocaleString('en-US')} تماس</span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination safePage={companyListPaged.safePage} totalPages={companyListPaged.totalPages} onPage={setCompanyListPage} />
          </div>
        ) : report.empty ? (
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
                {report.firstRec && <span>اولین تماس: <b>{formatDisplayDate(report.firstRec.date, calendar)}</b></span>}
                {report.lastRec && <span>آخرین تماس: <b>{formatDisplayDate(report.lastRec.date, calendar)}</b> ({report.daysSinceLast.toLocaleString('en-US')} روز پیش)</span>}
              </div>
            </div>
            {report.monthKeys.length > 0 && (
              <div className="crm-company-report-monthly">
                {report.monthKeys.map((k) => {
                  const [y, m] = k.split('-').map(Number);
                  const pct = Math.max(Math.round((report.monthly[k] / report.maxMonthly) * 100), 6);
                  return (
                    <div className="crm-cr-month-row" key={k}>
                      <span>{(calendar === 'jalali' ? JALALI_MONTHS : FA_MONTHS)[m - 1]} {y}</span>
                      <div className="crm-cr-month-bar-wrap"><div className="crm-cr-month-bar" style={{ width: pct + '%' }}></div></div>
                      <b>{report.monthly[k].toLocaleString('en-US')}</b>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="crm-history-list" id="crmCompanyReportHistory" style={{ maxHeight: 'none' }}>
              {historyPage.pageItems.map((r) => (
                <div className="crm-history-item" key={r.id} onClick={() => onOpenRecord(r.id)}>
                  <div className="crm-history-item-top">
                    <span><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{r.coordinator ? coordLabel(r.coordinator) : '-'}</span> <b>{formatDisplayDate(r.date, calendar) || 'بدون تاریخ'}</b></span>
                    <StatusBadge r={r} />
                  </div>
                  <div className="crm-history-item-notes">{r.notes || 'بدون یادداشت'}</div>
                </div>
              ))}
            </div>
            <Pagination safePage={historyPage.safePage} totalPages={historyPage.totalPages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
