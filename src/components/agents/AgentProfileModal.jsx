'use client';
import { useState, useMemo } from 'react';
import { computeAgentStats } from '../../lib/analytics.js';
import { computeSuggestions } from '../../lib/suggestions.js';
import { coordLabel, statusBadgeInfo } from '../../lib/filters.js';
import Utils from '../../lib/utils.js';
import RingChart from '../ui/RingChart.jsx';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import useCountUp from '../../lib/useCountUp.js';
import { useUiStore } from '../../lib/uiStore.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import { FilterIcon, TrashIcon } from '../ui/Icon.jsx';

const PAGE_SIZE_OPTS = ['10', '20', '50', '100'];
const priorityClass = (p) => (p === 'بالا' ? '-high' : p === 'متوسط' ? '-mid' : '-low');

function StatValue({ target }) {
  const display = useCountUp(target, 500);
  return <div className="crm-agent-profile-stat-value">{display}</div>;
}

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

export default function AgentProfileModal({ agent, records, onClose, onOpenRecord }) {
  const calendar = useUiStore((u) => u.calendar);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({ from: null, to: null });
  const [sugPage, setSugPage] = useState(1);
  const [sugPerPage, setSugPerPage] = useState(10);
  const [histPage, setHistPage] = useState(1);
  const [histPerPage, setHistPerPage] = useState(10);
  const [tab, setTab] = useState('suggestions');

  const s = useMemo(() => {
    if (!agent) return null;
    return computeAgentStats(records, agent, applied.from, applied.to);
  }, [agent, records, applied]);

  const suggestions = useMemo(() => {
    if (!agent) return [];
    const byAgent = computeSuggestions(records);
    return (byAgent[agent] || []).slice().sort((a, b) => (b.noStatus - a.noStatus) || (b.isNoAnswer - a.isNoAnswer) || (b.pr - a.pr) || (b.days - a.days));
  }, [agent, records]);

  if (!agent || !s) return null;

  const sortedHistory = s.recs.slice().sort((a, b) => {
    const da = Utils.parseDate(a.date), db = Utils.parseDate(b.date);
    return (db || new Date(0)) - (da || new Date(0));
  });

  const sugTotalPages = Math.max(1, Math.ceil(suggestions.length / sugPerPage));
  const sugSafePage = Math.min(sugPage, sugTotalPages);
  const sugStartIdx = (sugSafePage - 1) * sugPerPage;
  const sugPageItems = suggestions.slice(sugStartIdx, sugStartIdx + sugPerPage);

  const histTotalPages = Math.max(1, Math.ceil(sortedHistory.length / histPerPage));
  const histSafePage = Math.min(histPage, histTotalPages);
  const histStartIdx = (histSafePage - 1) * histPerPage;
  const histPageItems = sortedHistory.slice(histStartIdx, histStartIdx + histPerPage);

  function applyFilter() {
    setApplied({
      from: dateFrom ? Utils.parseDate(Utils.fromISODate(dateFrom)) : null,
      to: dateTo ? Utils.parseDate(Utils.fromISODate(dateTo)) : null,
    });
    setSugPage(1);
    setHistPage(1);
  }
  function clearFilter() {
    setDateFrom(''); setDateTo(''); setApplied({ from: null, to: null });
    setSugPage(1);
    setHistPage(1);
  }
  function changeSugPerPage(v) {
    setSugPerPage(parseInt(v, 10) || 10);
    setSugPage(1);
  }
  function changeHistPerPage(v) {
    setHistPerPage(parseInt(v, 10) || 10);
    setHistPage(1);
  }
  function openRecord(id) {
    onClose();
    onOpenRecord(id);
  }

  return (
    <Modal open onClose={onClose} title={`پروفایل کارشناس — ${coordLabel(agent)}`} width="4xl">
          <div className="crm-agent-profile-filter">
            <span>از تاریخ</span>
            <input type="date" className="crm-input crm-mono" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span>تا تاریخ</span>
            <input type="date" className="crm-input crm-mono" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button type="button" className="crm-btn-primary" onClick={applyFilter}><FilterIcon />اعمال فیلتر</button>
            <button type="button" className="crm-btn-ghost" title="پاک کردن فیلتر بازه" onClick={clearFilter}><TrashIcon />کل بازه</button>
          </div>

          <div className="crm-agent-profile-stats" id="apStats">
            {[['کل تماس‌ها', s.total], ['موفق', s.success], ['ناموفق', s.fail], ['در حال پیگیری', s.pending], ['استعلام', s.quoted]].map(([label, val]) => (
              <div className="crm-agent-profile-stat" key={label}>
                <StatValue target={val} />
                <div className="crm-agent-profile-stat-label">{label}</div>
              </div>
            ))}
            <div className="crm-agent-profile-stat crm-ring-stat">
              <RingChart percent={s.conversionRate} size={60} stroke={7} />
              <div className="crm-agent-profile-stat-label">نرخ تبدیل</div>
            </div>
          </div>

          <div className="crm-modal-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'suggestions'} className={`crm-modal-tab${tab === 'suggestions' ? ' -active' : ''}`} onClick={() => setTab('suggestions')}>پیشنهاد تماس امروز</button>
            <button type="button" role="tab" aria-selected={tab === 'history'} className={`crm-modal-tab${tab === 'history' ? ' -active' : ''}`} onClick={() => setTab('history')}>لیست تماس‌ها در این بازه</button>
          </div>

          {tab === 'suggestions' && (
            <>
              <div className="crm-suggest-grid" id="apSuggestions">
                {!suggestions.length ? (
                  <div className="crm-suggest-empty">فعلاً پیشنهاد تماسی برای این کارشناس نیست 🎉</div>
                ) : (
                  <div className="crm-suggest-card">
                    <div className="crm-suggest-list">
                      {sugPageItems.map((item) => (
                        <div className="crm-suggest-item" key={item.r.id}>
                          <div className="crm-suggest-item-top">
                            <span className="crm-suggest-company" title="ثبت تماس با این مشتری" onClick={() => openRecord(item.r.id)}>{item.r.company || '-'}</span>
                            <span className="crm-suggest-days">{item.days.toLocaleString('en-US')} روز پیش</span>
                          </div>
                          <div className="crm-suggest-meta">
                            {item.r.phone && <span className="crm-mono">{item.r.phone}</span>}
                            {item.noStatus && <span className="crm-suggest-priority -high">بدون وضعیت</span>}
                            {item.isNoAnswer && <span className="crm-suggest-priority -high">تماس مجدد</span>}
                            {item.r.priority && <span className={`crm-suggest-priority ${priorityClass(item.r.priority)}`}>{item.r.priority}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="crm-pagination-row">
                  <div className="crm-page-size">
                    <span>تعداد نمایش در صفحه:</span>
                    <Dropdown value={String(sugPerPage)} onChange={changeSugPerPage} options={PAGE_SIZE_OPTS} placeholder="10" />
                  </div>
                  <div className="crm-pagination">
                    <button className="crm-page-btn" disabled={sugSafePage <= 1} onClick={() => setSugPage((p) => p - 1)}>قبلی</button>
                    <span className="crm-page-info">صفحه {sugSafePage} از {sugTotalPages}</span>
                    <button className="crm-page-btn" disabled={sugSafePage >= sugTotalPages} onClick={() => setSugPage((p) => p + 1)}>بعدی</button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              <div className="crm-history-list" id="apHistoryList" style={{ maxHeight: 'none' }}>
                {!sortedHistory.length ? (
                  <div className="crm-empty">تماسی در این بازه پیدا نشد</div>
                ) : histPageItems.map((r) => (
                  <div className="crm-history-item" key={r.id} onClick={() => openRecord(r.id)}>
                    <div className="crm-history-item-top">
                      <span><b>{r.company || '-'}</b> <span className="crm-mono">{formatDisplayDate(r.date, calendar) || 'بدون تاریخ'}</span></span>
                      <StatusBadge r={r} />
                    </div>
                    <div className="crm-history-item-notes">{r.notes || 'بدون یادداشت'}</div>
                  </div>
                ))}
              </div>
              {sortedHistory.length > 0 && (
                <div className="crm-pagination-row">
                  <div className="crm-page-size">
                    <span>تعداد نمایش در صفحه:</span>
                    <Dropdown value={String(histPerPage)} onChange={changeHistPerPage} options={PAGE_SIZE_OPTS} placeholder="10" />
                  </div>
                  <div className="crm-pagination">
                    <button className="crm-page-btn" disabled={histSafePage <= 1} onClick={() => setHistPage((p) => p - 1)}>قبلی</button>
                    <span className="crm-page-info">صفحه {histSafePage} از {histTotalPages}</span>
                    <button className="crm-page-btn" disabled={histSafePage >= histTotalPages} onClick={() => setHistPage((p) => p + 1)}>بعدی</button>
                  </div>
                </div>
              )}
            </>
          )}
    </Modal>
  );
}
