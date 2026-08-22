'use client';
import { useMemo, useState } from 'react';
import Utils from '../../lib/utils';
import { coordLabel } from '../../lib/filters';
import { agentColor } from '../../lib/analytics';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 20;

export default function AgentsPanel({ records, activeCoordinator, onToggleCoordinator, onOpenProfile }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const counts = {};
  for (const r of records) {
    const a = Utils.normSpace(r.coordinator) || 'نامشخص';
    counts[a] = (counts[a] || 0) + 1;
  }
  const allNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const names = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return allNames;
    return allNames.filter((n) => coordLabel(n).toLowerCase().includes(query));
  }, [allNames, q]);

  function changeQuery(v) {
    setQ(v);
    setPage(1);
  }

  const { pageItems, totalPages, safePage } = paginate(names, page, PER_PAGE);

  return (
    <div className="crm-section" id="crmAgents">
      <div className="crm-section-title-row">
        <div className="crm-section-title">کارشناسان</div>
        <span className="crm-result-count">
          {names.length === allNames.length
            ? `${allNames.length.toLocaleString('en-US')} کارشناس`
            : `${names.length.toLocaleString('en-US')} نتیجه از ${allNames.length.toLocaleString('en-US')}`}
        </span>
      </div>
      <div className="crm-toolbar">
        <input className="crm-input crm-search-input -compact" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی کارشناس..." />
      </div>
      <div className="crm-agent-chips">
        {pageItems.map((n) => (
          <button
            key={n}
            type="button"
            className={`crm-agent-chip${activeCoordinator === n ? ' -active' : ''}`}
            onClick={() => onToggleCoordinator(activeCoordinator === n ? '' : n)}
          >
            <span className="crm-agent-dot" style={{ background: agentColor(n) }}></span>
            <span className="crm-agent-name">{coordLabel(n)}</span>
            <span className="crm-agent-count">{counts[n].toLocaleString('en-US')} تماس</span>
            <span className="crm-agent-profile-btn" title="مشاهده پروفایل کارشناس" onClick={(e) => { e.stopPropagation(); onOpenProfile(n); }}>👤 پروفایل</span>
          </button>
        ))}
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
