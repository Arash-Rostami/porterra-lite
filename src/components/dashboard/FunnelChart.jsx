'use client';
import { useMemo } from 'react';
import { computeFunnelStages } from '../../lib/analytics.js';

export default function FunnelChart({ records, callFilters }) {
  const { stages, leadConversionRate, quoteToSaleRate, quoteTotal } = useMemo(() => computeFunnelStages(records, callFilters), [records, callFilters]);
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
      <div className="crm-funnel-rates">
        <span title="مشتریان ÷ کل شرکت‌ها">نرخ تبدیل سرنخ: {leadConversionRate}٪</span>
        <span title="استعلام موفق ÷ (موفق + ناموفق + در جریان)">نرخ تبدیل استعلام به فروش: {quoteTotal ? quoteToSaleRate + '٪' : '—'}</span>
      </div>
    </div>
  );
}
