'use client';
import { useState } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import { filterAgentSuggestions, sortSuggestions, exportSuggestionsToExcel, SUGGESTION_SORT_MODES } from '../../lib/suggestions.js';
import { agentColor } from '../../lib/analytics.js';
import { coordLabel } from '../../lib/filters.js';
import { useStore } from '../../lib/store.js';
import { toast } from '../ui/Toast.jsx';
import PhoneLink from '../ui/PhoneLink.jsx';
import { DownloadIcon, TrashIcon, InfoIcon } from '../ui/Icon.jsx';

const priorityClass = (p) => (p === 'بالا' ? '-high' : p === 'متوسط' ? '-mid' : '-low');
const emptyAgentFilter = { category: '', product: '', search: '' };
const PAGE_SIZE_OPTS = ['6', '10', '20', '50'];

function AgentCard({ agent, pool, sortMode, categoryOpts, productOpts, onOpenProfile }) {
  const [f, setF] = useState(emptyAgentFilter);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const { filtered } = filterAgentSuggestions(pool, f);
  const sorted = sortSuggestions(filtered, sortMode);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageItems = sorted.slice(startIdx, startIdx + perPage);

  function setFilter(next) {
    setF(next);
    setPage(1);
  }
  function changePerPage(v) {
    setPerPage(parseInt(v, 10) || 6);
    setPage(1);
  }

  return (
    <div className="crm-suggest-card">
      <div className="crm-suggest-head">
        <span className="crm-suggest-agent-dot" style={{ background: agentColor(agent) }}></span>
        <span className="crm-suggest-agent-name">{coordLabel(agent)}</span>
        <span className="crm-suggest-count">
          {sorted.length.toLocaleString('en-US')} مورد{sorted.length !== pool.length ? ` (از ${pool.length.toLocaleString('en-US')})` : ''}
        </span>
      </div>
      <div className="crm-suggest-card-search">
        <input className="crm-input" autoComplete="off" value={f.search} onChange={(e) => setFilter({ ...f, search: e.target.value })} placeholder="جست‌وجو در پیشنهادهای این کارشناس..." />
      </div>
      <div className="crm-suggest-card-filter">
        <Dropdown value={f.category} onChange={(v) => setFilter({ ...f, category: v })} options={categoryOpts} placeholder="همه دسته‌ها" />
        <Dropdown value={f.product} onChange={(v) => setFilter({ ...f, product: v })} options={productOpts} placeholder="همه محصولات" />
        <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => setFilter(emptyAgentFilter)}><TrashIcon /></button>
      </div>
      <div className="crm-suggest-list">
        {!pageItems.length ? (
          <div className="crm-suggest-empty">با این فیلتر موردی نیست</div>
        ) : pageItems.map((item) => (
          <div className="crm-suggest-item" key={item.r.id}>
            <div className="crm-suggest-item-top">
              <span className="crm-suggest-company" title="ثبت تماس با این سرنخ" onClick={() => onOpenProfile(item.r.id, true)}>{item.r.company || '-'}</span>
              <span className="crm-suggest-days">{item.days.toLocaleString('en-US')} روز پیش</span>
            </div>
            <div className="crm-suggest-meta">
              {item.r.product && <span className="crm-suggest-priority -low">{item.r.product}</span>}
              {item.r.phone && <PhoneLink phone={item.r.phone} />}
              {item.noStatus && <span className="crm-suggest-priority -high">بدون وضعیت</span>}
              {item.isNoAnswer && <span className="crm-suggest-priority -high">تماس مجدد</span>}
              {item.r.priority && <span className={`crm-suggest-priority ${priorityClass(item.r.priority)}`}>{item.r.priority}</span>}
            </div>
          </div>
        ))}
      </div>
      {sorted.length > 0 && (
        <div className="crm-pagination-row">
          <div className="crm-page-size">
            <span>تعداد نمایش:</span>
            <Dropdown value={String(perPage)} onChange={changePerPage} options={PAGE_SIZE_OPTS} placeholder="6" />
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

export default function SuggestionsPanel({ byAgent, onOpenProfile }) {
  const agents = Object.keys(byAgent).sort((a, b) => byAgent[b].length - byAgent[a].length);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const categoryOpts = categories.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  const productOpts = products.map((p) => p.name).sort((a, b) => a.localeCompare(b));
  const [sortMode, setSortMode] = useState('smart');
  const [legendOpen, setLegendOpen] = useState(false);

  async function handleExport() {
    const ok = await exportSuggestionsToExcel(byAgent);
    toast(ok ? 'فایل اکسل پیشنهاد تماس دانلود شد' : 'فعلاً پیشنهاد تماسی نیست');
  }

  return (
    <div className="crm-section" id="crmSuggestions">
      <div className="crm-section-title-row">
        <div className="crm-section-title">پیشنهاد تماس امروز</div>
        <button type="button" className="crm-export-btn" onClick={handleExport}><DownloadIcon />خروجی اکسل</button>
      </div>
      {!!agents.length && (
        <div className="crm-suggest-sortbar">
          <div className="crm-sort-toggle-group">
            {SUGGESTION_SORT_MODES.map((m) => (
              <button key={m.key} type="button" className={`crm-sort-toggle${sortMode === m.key ? ' -active' : ''}`} onClick={() => setSortMode(m.key)}>{m.label}</button>
            ))}
          </div>
          <button type="button" className="crm-suggest-legend-btn" onClick={() => setLegendOpen((o) => !o)}><InfoIcon />توضیح ترتیب</button>
        </div>
      )}
      {legendOpen && (
        <div className="crm-suggest-legend">
          {sortMode === 'smart' && 'هوشمند: بر اساس مجموع امتیاز وضعیت (بدون پاسخ/بدون وضعیت) + اولویت + مدت زمان از آخرین تماس + ارزش معامله + نرخ تبدیل تاریخی منبع سرنخ — بالاترین امتیاز اول نمایش داده می‌شود.'}
          {sortMode === 'days' && 'قدیمی‌ترین تماس: سرنخ‌هایی که بیشترین زمان از آخرین تماس با آن‌ها گذشته، اول نمایش داده می‌شوند.'}
          {sortMode === 'value' && 'بیشترین ارزش معامله: سرنخ‌هایی که بالاترین آخرین قیمت اعلامی را دارند، اول نمایش داده می‌شوند.'}
        </div>
      )}
      {!agents.length ? (
        <div className="crm-suggest-empty">فعلاً پیشنهاد تماسی نیست — همه پیگیری‌ها به‌روزن 🎉</div>
      ) : (
        <div className="crm-suggest-grid">
          {agents.map((agent) => <AgentCard key={agent} agent={agent} pool={byAgent[agent]} sortMode={sortMode} categoryOpts={categoryOpts} productOpts={productOpts} onOpenProfile={onOpenProfile} />)}
        </div>
      )}
    </div>
  );
}
