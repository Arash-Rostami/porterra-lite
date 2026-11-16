'use client';
import { useMemo, useState } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import { paginate } from '../ui/Pagination.jsx';
import { filterAgentSuggestions, sortSuggestions, exportSuggestionsToExcel, SUGGESTION_SORT_MODES, SUGGESTION_DAILY_CAP } from '../../lib/suggestions.js';
import { agentColor } from '../../lib/analytics.js';
import { coordLabel, TEMP_OPTS } from '../../lib/filters.js';
import { useStore } from '../../lib/store.js';
import { toast } from '../ui/Toast.jsx';
import PhoneLink from '../ui/PhoneLink.jsx';
import { DownloadIcon, TrashIcon, InfoIcon } from '../ui/Icon.jsx';

const TEMP_CLASS = { hot: '-high', warm: '-mid', cold: '-low' };
const tempLabel = (v) => (TEMP_OPTS.find((t) => t.value === v) || {}).label || '';
const emptyAgentFilter = { category: '', product: '', search: '' };
const PAGE_SIZE_OPTS = ['6', '10', '20', '50'];

function AgentCard({ agent, pool, cap, sortMode, categoryOpts, productOpts, onOpenProfile }) {
  const [f, setF] = useState(emptyAgentFilter);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const { filtered, sorted } = useMemo(() => {
    const { filtered: matching } = filterAgentSuggestions(pool, f);
    return { filtered: matching, sorted: sortSuggestions(matching, sortMode).slice(0, cap) };
  }, [pool, f, sortMode, cap]);

  const { pageItems, totalPages, safePage } = paginate(sorted, page, perPage);

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
          {sorted.length.toLocaleString('en-US')} مورد{filtered.length > sorted.length ? ` — ${filtered.length.toLocaleString('en-US')} در کل` : ''}{filtered.length !== pool.length ? ` (فیلتر از ${pool.length.toLocaleString('en-US')})` : ''}
        </span>
      </div>
      <div className="crm-suggest-card-search">
        <input className="crm-input" autoComplete="off" value={f.search} onChange={(e) => setFilter({ ...f, search: e.target.value })} placeholder="جست‌وجو در پیشنهادهای این کارشناس..." />
      </div>
      <div className="crm-suggest-card-filter">
        <Dropdown multiple value={f.category} onChange={(v) => setFilter({ ...f, category: v })} options={categoryOpts} placeholder="همه دسته‌ها" />
        <Dropdown multiple value={f.product} onChange={(v) => setFilter({ ...f, product: v })} options={productOpts} placeholder="همه محصولات" />
        <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => setFilter(emptyAgentFilter)}><TrashIcon /></button>
      </div>
      <div className="crm-suggest-list">
        {!pageItems.length ? (
          <div className="crm-suggest-empty">با این فیلتر موردی نیست</div>
        ) : pageItems.map((item) => (
          <div className="crm-suggest-item" key={item.r.id}>
            <div className="crm-suggest-item-top">
              <span className="crm-suggest-company" role="button" tabIndex={0} title="ثبت تماس با این سرنخ" onClick={() => onOpenProfile(item.r.id, true)} onKeyDown={(e) => { if (e.key === 'Enter') onOpenProfile(item.r.id, true); }}>{item.r.company || '-'}</span>
              <span className="crm-suggest-days">{item.days.toLocaleString('en-US')} روز پیش</span>
            </div>
            <div className="crm-suggest-meta">
              {item.r.product && <span className="crm-suggest-priority -low">{item.r.product}</span>}
              {item.r.phone && <PhoneLink phone={item.r.phone} />}
              {item.noStatus && <span className="crm-suggest-priority -high">بدون وضعیت</span>}
              {item.isNoAnswer && <span className="crm-suggest-priority -high">تماس مجدد</span>}
              {item.phoneBad && <span className="crm-suggest-priority -mid">شماره ناقص</span>}
              <span className={`crm-suggest-priority ${TEMP_CLASS[item.temp]}`}>{tempLabel(item.temp)}</span>
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

export default function SuggestionsPanel({ byAgent, showAll, onToggleAll, onOpenProfile }) {
  const agents = useMemo(() => Object.keys(byAgent).sort((a, b) => byAgent[b].length - byAgent[a].length), [byAgent]);
  const fullTotal = agents.reduce((sum, a) => sum + byAgent[a].length, 0);
  const hasMore = agents.some((a) => byAgent[a].length > SUGGESTION_DAILY_CAP);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const categoryOpts = useMemo(() => categories.map((c) => c.name).sort((a, b) => a.localeCompare(b)), [categories]);
  const productOpts = useMemo(() => products.map((p) => p.name).sort((a, b) => a.localeCompare(b)), [products]);
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
          {hasMore && (
            <div className="crm-sort-toggle-group">
              <button type="button" className={`crm-sort-toggle${showAll ? ' -active' : ''}`} onClick={onToggleAll}>
                {showAll ? `فقط ${SUGGESTION_DAILY_CAP} مورد اول هر کارشناس` : `نمایش همه (${fullTotal.toLocaleString('en-US')})`}
              </button>
            </div>
          )}
          <button type="button" className="crm-suggest-legend-btn" onClick={() => setLegendOpen((o) => !o)}><InfoIcon />توضیح ترتیب</button>
        </div>
      )}
      {legendOpen && (
        <div className="crm-suggest-legend">
          {sortMode === 'smart' && `هوشمند: اول سرنخ‌های داغ، بعد گرم و سرد؛ در هر گروه ابتدا بی‌پاسخ‌ها و بعد قدیمی‌ترین تماس. هر کارشناس در هر روز ${SUGGESTION_DAILY_CAP} مورد اول را می‌بیند و با «نمایش همه» بقیه هم نمایش داده می‌شود.`}
          {sortMode === 'days' && 'قدیمی‌ترین تماس: سرنخ‌هایی که بیشترین زمان از آخرین تماس با آن‌ها گذشته، اول نمایش داده می‌شوند.'}
        </div>
      )}
      {!agents.length ? (
        <div className="crm-suggest-empty">فعلاً پیشنهاد تماسی نیست — همه پیگیری‌ها به‌روزن 🎉</div>
      ) : (
        <div className="crm-suggest-grid">
          {agents.map((agent) => <AgentCard key={agent} agent={agent} pool={byAgent[agent]} cap={showAll ? Infinity : SUGGESTION_DAILY_CAP} sortMode={sortMode} categoryOpts={categoryOpts} productOpts={productOpts} onOpenProfile={onOpenProfile} />)}
        </div>
      )}
    </div>
  );
}
