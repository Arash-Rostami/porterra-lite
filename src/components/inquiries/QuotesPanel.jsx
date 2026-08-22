'use client';
import { useMemo, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Utils from '../../lib/utils';
import { coordLabel, coordClass, PRICE_TYPE_OPTS } from '../../lib/filters';
import { announceQuotePrice, resolveQuote } from '../../lib/store';
import { formatDisplayDate } from '../../lib/calendar';
import { useUiStore } from '../../lib/uiStore';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 6;

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
          {rec.quoteFailReason && <div>دلیل ناموفقی: {rec.quoteFailReason}</div>}
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

  const quotes = useMemo(() => records.filter((r) => r.result === 'در حال استعلام'), [records]);
  const open = useMemo(() => quotes.filter((q) => !q.quoteResult), [quotes]);
  const won = useMemo(() => quotes.filter((q) => q.quoteResult === 'موفق'), [quotes]);
  const lost = useMemo(() => quotes.filter((q) => q.quoteResult === 'ناموفق'), [quotes]);

  const companyBadges = useMemo(() => {
    const seen = new Set();
    for (const r of quotes) {
      const name = Utils.normSpace(r.company);
      if (name) seen.add(name);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [quotes]);

  function toggleCompanyBadge(name) {
    changeQuery(Utils.normSpace(q) === name ? '' : name);
  }

  const sorted = useMemo(() => {
    const pool = filter === 'open' ? open : filter === 'won' ? won : lost;
    return pool.slice().sort((a, b) => {
      if (!a.quoteResult && b.quoteResult) return -1;
      if (a.quoteResult && !b.quoteResult) return 1;
      return (Utils.parseDate(b.date) || 0) - (Utils.parseDate(a.date) || 0);
    });
  }, [filter, open, won, lost]);

  const list = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return sorted;
    return sorted.filter((r) => [r.company, r.product, coordLabel(r.coordinator)].some((v) => (v || '').toLowerCase().includes(query)));
  }, [sorted, q]);

  const active = activeId ? records.find((r) => r.id === activeId) : null;
  const { pageItems, totalPages, safePage } = paginate(list, page, PER_PAGE);

  return (
    <>
      <div className="crm-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={`crm-kpi${filter === 'open' ? ' -selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => changeFilter('open')}>
          <div className="crm-kpi-label">باز</div>
          <div className="crm-kpi-value">{open.length.toLocaleString('en-US')}</div>
        </div>
        <div className={`crm-kpi${filter === 'won' ? ' -selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => changeFilter('won')}>
          <div className="crm-kpi-label">موفق</div>
          <div className="crm-kpi-value">{won.length.toLocaleString('en-US')}</div>
        </div>
        <div className={`crm-kpi${filter === 'lost' ? ' -selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => changeFilter('lost')}>
          <div className="crm-kpi-label">ناموفق</div>
          <div className="crm-kpi-value">{lost.length.toLocaleString('en-US')}</div>
        </div>
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
        {companyBadges.length > 0 && (
          <div className="crm-badge-row">
            {companyBadges.map((name) => (
              <span
                key={name}
                className={`crm-badge -clickable${Utils.normSpace(q) === name ? ' -active' : ''}`}
                onClick={() => toggleCompanyBadge(name)}
              >{name}</span>
            ))}
          </div>
        )}
        <div className="crm-history-list" style={{ maxHeight: 'none' }}>
          {!list.length && <div className="crm-feed-empty">استعلامی در این دسته یافت نشد</div>}
          {pageItems.map((r) => {
            const duration = quoteDuration(r);
            return (
              <div className="crm-history-item" key={r.id} onClick={() => setActiveId(r.id)}>
                <div className="crm-history-item-top">
                  <span><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{coordLabel(r.coordinator)}</span> <b>{r.company}</b></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {r.quoteResult ? <span className={`crm-status-badge ${r.quoteResult === 'موفق' ? '-success' : '-fail'}`}>{r.quoteResult}</span> : <span className="crm-status-badge -progress">باز</span>}
                    {duration != null && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{duration.toLocaleString('en-US')} روز</span>}
                  </span>
                </div>
                <div className="crm-history-item-notes">{r.product || 'بدون محصول'} — {formatDisplayDate(r.date, calendar)}</div>
              </div>
            );
          })}
        </div>
        <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} />
      </div>

      {active && <QuoteDetailModal rec={active} calendar={calendar} onClose={() => setActiveId(null)} onOpenRecord={onOpenRecord} />}
    </>
  );
}
