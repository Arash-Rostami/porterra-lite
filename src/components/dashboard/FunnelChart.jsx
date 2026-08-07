'use client';
import { computeFunnelStages } from '../../lib/analytics.js';

export default function FunnelChart({ records }) {
  const stages = computeFunnelStages(records);
  return (
    <div className="crm-section" id="crmFunnel">
      <div className="crm-section-title">قیف فروش</div>
      {stages.map((s) => (
        <div className="crm-funnel-row" key={s.label}>
          <div className="crm-funnel-label">{s.label}</div>
          <div className="crm-funnel-bar-wrap">
            <div className="crm-funnel-bar" style={{ width: s.widthPct + '%', background: s.color }}>
              {s.value.toLocaleString('en-US')}
            </div>
          </div>
          <div className="crm-funnel-pct">{s.pct}%</div>
        </div>
      ))}
    </div>
  );
}
