'use client';
import Utils from '../../lib/utils.js';
import { coordLabel } from '../../lib/filters.js';
import { agentColor } from '../../lib/analytics.js';

export default function AgentsPanel({ records, activeCoordinator, onToggleCoordinator, onOpenProfile }) {
  const counts = {};
  for (const r of records) {
    const a = Utils.normSpace(r.coordinator) || 'نامشخص';
    counts[a] = (counts[a] || 0) + 1;
  }
  const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  return (
    <div className="crm-section" id="crmAgents">
      <div className="crm-section-title">کارشناسان</div>
      <div className="crm-agent-chips">
        {names.map((n) => (
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
    </div>
  );
}
