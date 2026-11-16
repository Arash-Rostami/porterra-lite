'use client';
import { useMemo, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Utils from '../../lib/utils.js';
import { coordLabel, coordClass, PRICE_TYPE_OPTS, textFilter } from '../../lib/filters.js';
import { announceQuotePrice, resolveQuote } from '../../lib/store.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import { useUiStore, setFilters, DEFAULT_FILTERS } from '../../lib/uiStore.js';
import { callMatcher } from '../../lib/companies.js';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon, TrashIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 15;

function quoteStatus(r) {
  if (r.quoteResult) return { text: r.quoteResult, className: r.quoteResult === 'موفق' ? '-success' : '-fail' };
  if (r.quotePrice) return { text: 'در انتظار جواب مشتری', className: '-progress' };
  return { text: 'در انتظار اعلام قیمت', className: '-warn' };
}

function quoteDuration(rec) {
  const priceDt = Utils.parseDate(rec.quotePriceDate) || Utils.parseDate(rec.date);
  if (!priceDt) return null;
  const end = Utils.parseDate(rec.quoteResultDate) || new Date();
  return Math.round((end - priceDt) / 86400000);
}

function QuoteDetailModal({ rec, calendar, onClose, onOpenRecord }) {
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('');
  const [terms, setTerms] = useState('');
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);

  const stage = !rec.quotePrice ? 'A' : !rec.quoteResult ? 'B' : 'C';
  const duration = quoteDuration(rec);

  function submitPrice() {
    if (!price.trim()) { toast('قیمت الزامی است'); return; }
    announceQuotePrice(rec.id, price.trim(), priceType || null, terms.trim() || null);
    toast('قیمت اعلام شد — در انتظار جواب سرنخ');
  }
  function submitSuccess() {
    resolveQuote(rec.id, 'موفق', null);
    toast('استعلام «موفق» ثبت شد — سرنخ تبدیل شد');
    onClose();
  }
  function submitFail() {
    if (!failReason.trim()) { toast('دلیل ناموفقی الزامی است'); return; }
    resolveQuote(rec.id, 'ناموفق', failReason.trim());
    toast('استعلام «ناموفق» ثبت شد');
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="جزئیات استعلام" width="lg" actions={<button type="button" className="crm-btn-ghost" onClick={onClose}><XCircleIcon />بستن</button>}>
      <div className="crm-history-item-top" style={{ marginBottom: 12 }}>
        <span><span className={`crm-coord-tag ${coordClass(rec.coordinator)}`}>{coordLabel(rec.coordinator)}</span> <b>{rec.company}</b></span>
        <span>{formatDisplayDate(rec.date, calendar)}</span>
      </div>
      {rec.product && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>محصول: {rec.product}</div>}

      {stage === 'A' && (
        <div className="crm-form-grid">
          <div className="crm-field -span2"><label>قیمت</label><input className="crm-input crm-mono" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="crm-field"><label>نوع قیمت</label><Dropdown value={priceType} onChange={setPriceType} options={PRICE_TYPE_OPTS} placeholder="انتخاب کنید" /></div>
          <div className="crm-field -span3"><label>شرایط</label><textarea className="crm-textarea" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          <div className="crm-field -span3"><button type="button" className="crm-btn-primary" onClick={submitPrice}><CheckIcon />اعلام قیمت</button></div>
        </div>
      )}

      {stage === 'B' && (
        <div>
          <div style={{ fontSize: 12.5, marginBottom: 10 }}>قیمت اعلامی: {rec.quotePrice}{rec.quotePriceType ? ` (${rec.quotePriceType})` : ''}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="crm-btn-primary" onClick={submitSuccess}><CheckIcon />موفق</button>
            <button type="button" className="crm-btn-ghost" onClick={() => setShowFail((s) => !s)}><XCircleIcon />ناموفق</button>
          </div>
          {showFail && (
            <div className="crm-field" style={{ marginTop: 10 }}>
              <label>دلیل ناموفقی *</label>
              <textarea className="crm-textarea" rows={2} value={failReason} onChange={(e) => setFailReason(e.target.value)} />
              <button type="button" className="crm-btn-primary" style={{ marginTop: 8 }} onClick={submitFail}><CheckIcon />ثبت نتیجه</button>
            </div>
          )}
        </div>
      )}

      {stage === 'C' && (
        <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>نتیجه: <b>{rec.quoteResult}</b></div>
          <div>قیمت اعلامی: {rec.quotePrice}{rec.quotePriceType ? ` (${rec.quotePriceType})` : ''}</div>
          {rec.quotePriceDate && <div>تاریخ اعلام قیمت: {formatDisplayDate(rec.quotePriceDate, calendar)}</div>}
          {rec.quoteResultDate && <div>تاریخ نتیجه: {formatDisplayDate(rec.quoteResultDate, calendar)}</div>}
          {rec.quoteResult === 'ناموفق' && rec.quoteFailReason && <div>دلیل ناموفقی: {rec.quoteFailReason}</div>}
          {duration != null && <div>مدت‌زمان استعلام: {duration.toLocaleString('en-US')} روز</div>}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onOpenRecord(rec.id); onClose(); }}>مشاهده پروفایل کامل این تماس ←</a>
      </div>
    </Modal>
  );
}

export default function QuotesPanel({ records, onOpenRecord }) {
  const calendar = useUiStore((u) => u.calendar);
  const [filter, setFilter] = useState('open');
  const [activeId, setActiveId] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  function changeFilter(f) {
    setFilter(f);
    setPage(1);
  }
  function changeQuery(v) {
    setQ(v);
    setPage(1);
  }

  const filters = useUiStore((u) => u.filters);
  const quotes = useMemo(() => {
    const match = callMatcher(filters);
    return records.filter((r) => (r.result === 'در حال استعلام' || r.quoteResult) && (!match || match(r)));
  }, [records, filters]);
  const filterActive = !!callMatcher(filters);
  const open = useMemo(() => quotes.filter((x) => !x.quoteResult), [quotes]);
  const won = useMemo(() => quotes.filter((x) => x.quoteResult === 'موفق'), [quotes]);
  const lost = useMemo(() => quotes.filter((x) => x.quoteResult === 'ناموفق'), [quotes]);

  const sorted = useMemo(() => {
    const pool = filter === 'open' ? open : filter === 'won' ? won : lost;
    return pool.slice().sort((a, b) => {
      if (!a.quoteResult && b.quoteResult) return -1;
      if (a.quoteResult && !b.quoteResult) return 1;
      return (Utils.parseDate(b.date) || 0) - (Utils.parseDate(a.date) || 0);
    });
  }, [filter, open, won, lost]);

  const list = useMemo(() => {
    return textFilter(sorted, q, (r) => [r.company, r.product, coordLabel(r.coordinator)]);
  }, [sorted, q]);

  const active = activeId ? records.find((r) => r.id === activeId) : null;
  const { pageItems, totalPages, safePage } = paginate(list, page, PER_PAGE);

  return (
    <>
      <div className="crm-kpis crm-kpis-3">
        {[['open', 'باز', open], ['won', 'موفق', won], ['lost', 'ناموفق', lost]].map(([key, label, pool]) => (
          <button key={key} type="button" className={`crm-kpi${filter === key ? ' -selected' : ''}`} onClick={() => changeFilter(key)}>
            <div className="crm-kpi-label">{label}</div>
            <div className="crm-kpi-value">{pool.length.toLocaleString('en-US')}</div>
          </button>
        ))}
      </div>

      <div className="crm-section">
        <div className="crm-section-title">
          لیست استعلام‌ها <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
            ({list.length === sorted.length
              ? sorted.length.toLocaleString('en-US')
              : `${list.length.toLocaleString('en-US')} نتیجه از ${sorted.length.toLocaleString('en-US')}`})
          </span>
        </div>
        <div className="crm-toolbar">
          <input className="crm-input crm-search-input -compact" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی شرکت، محصول یا کارشناس..." />
        </div>
        {filterActive && (
          <div className="crm-active-chart-filter -show">
            <span>فیلتر فعال از صفحه قبل (کارشناس/بازه تاریخ)</span>
            <button type="button" title="پاک کردن" aria-label="پاک کردن" onClick={() => setFilters(DEFAULT_FILTERS)}><TrashIcon /></button>
          </div>
        )}
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr><th>شرکت</th><th>محصول</th><th>وضعیت</th><th>تاریخ</th><th>قیمت</th><th>مدت</th></tr>
            </thead>
            <tbody>
              {pageItems.length ? pageItems.map((r) => {
                const duration = quoteDuration(r);
                const st = quoteStatus(r);
                return (
                  <tr key={r.id} className="crm-row-link" role="button" tabIndex={0} onClick={() => setActiveId(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveId(r.id); } }}>
                    <td><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{coordLabel(r.coordinator)}</span> <b>{r.company}</b></td>
                    <td className="crm-product-text">{r.product || '-'}</td>
                    <td><span className={`crm-status-badge ${st.className}`}>{st.text}</span></td>
                    <td className="crm-mono crm-date-text">{formatDisplayDate(r.date, calendar) || '-'}</td>
                    <td className="crm-mono">{r.quotePrice || '-'}</td>
                    <td className="crm-mono">{duration != null ? `${duration.toLocaleString('en-US')} روز` : '-'}</td>
                  </tr>
                );
              }) : <tr><td colSpan={6}><div className="crm-empty">استعلامی در این دسته یافت نشد</div></td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} />
      </div>

      {active && <QuoteDetailModal rec={active} calendar={calendar} onClose={() => setActiveId(null)} onOpenRecord={onOpenRecord} />}
    </>
  );
}
