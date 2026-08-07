'use client';
import { useState } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import { filterAgentSuggestions, suggestionCategoryOptions, suggestionProductOptions, exportSuggestionsToExcel } from '../../lib/suggestions.js';
import { agentColor } from '../../lib/analytics.js';
import { coordLabel } from '../../lib/filters.js';
import { toast } from '../ui/Toast.jsx';
import { DownloadIcon, TrashIcon } from '../ui/Icon.jsx';

const priorityClass = (p) => (p === 'بالا' ? '-high' : p === 'متوسط' ? '-mid' : '-low');
const emptyAgentFilter = { category: '', product: '', search: '' };

function AgentCard({ agent, pool, onOpenProfile }) {
  const [f, setF] = useState(emptyAgentFilter);
  const { filtered, shown } = filterAgentSuggestions(pool, f);
  const cats = suggestionCategoryOptions(pool);
  const prods = suggestionProductOptions(pool);

  return (
    <div className="crm-suggest-card">
      <div className="crm-suggest-head">
        <span className="crm-suggest-agent-dot" style={{ background: agentColor(agent) }}></span>
        <span className="crm-suggest-agent-name">{coordLabel(agent)}</span>
        <span className="crm-suggest-count">
          {filtered.length.toLocaleString('en-US')} مورد{filtered.length !== pool.length ? ` (از ${pool.length.toLocaleString('en-US')})` : ''}
        </span>
      </div>
      <div className="crm-suggest-card-search">
        <input className="crm-input" autoComplete="off" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} placeholder="جست‌وجو در پیشنهادهای این کارشناس..." />
      </div>
      <div className="crm-suggest-card-filter">
        <Dropdown value={f.category} onChange={(v) => setF({ ...f, category: v })} options={cats} placeholder="همه دسته‌ها" />
        <Dropdown value={f.product} onChange={(v) => setF({ ...f, product: v })} options={prods} placeholder="همه محصولات" />
        <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => setF(emptyAgentFilter)}><TrashIcon /></button>
      </div>
      <div className="crm-suggest-list">
        {!shown.length ? (
          <div className="crm-suggest-empty">با این فیلتر موردی نیست</div>
        ) : shown.map((item) => (
          <div className="crm-suggest-item" key={item.r.id}>
            <div className="crm-suggest-item-top">
              <span className="crm-suggest-company" title="ثبت تماس با این مشتری" onClick={() => onOpenProfile(item.r.id, true)}>{item.r.company || '-'}</span>
              <span className="crm-suggest-days">{item.days.toLocaleString('en-US')} روز پیش</span>
            </div>
            <div className="crm-suggest-meta">
              {item.r.product && <span className="crm-suggest-priority -low">{item.r.product}</span>}
              {item.r.phone && <span className="crm-mono">{item.r.phone}</span>}
              {item.noStatus && <span className="crm-suggest-priority -high">بدون وضعیت</span>}
              {item.isNoAnswer && <span className="crm-suggest-priority -high">تماس مجدد</span>}
              {item.r.priority && <span className={`crm-suggest-priority ${priorityClass(item.r.priority)}`}>{item.r.priority}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuggestionsPanel({ byAgent, onOpenProfile }) {
  const agents = Object.keys(byAgent).sort((a, b) => byAgent[b].length - byAgent[a].length);

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
      {!agents.length ? (
        <div className="crm-suggest-empty">فعلاً پیشنهاد تماسی نیست — همه پیگیری‌ها به‌روزن 🎉</div>
      ) : (
        <div className="crm-suggest-grid">
          {agents.map((agent) => <AgentCard key={agent} agent={agent} pool={byAgent[agent]} onOpenProfile={onOpenProfile} />)}
        </div>
      )}
    </div>
  );
}
