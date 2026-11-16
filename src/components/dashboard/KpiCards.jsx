'use client';
import { useMemo } from 'react';
import { computeKpis } from '../../lib/analytics.js';
import useCountUp from '../../lib/useCountUp.js';

function KpiCard({ label, value, cls, onClick }) {
  const display = useCountUp(value);
  return (
    <button type="button" className={`crm-kpi${cls ? ' ' + cls : ''}`} onClick={onClick}>
      <div className="crm-kpi-label">{label}</div>
      <div className="crm-kpi-value">{display}</div>
    </button>
  );
}

export default function KpiCards({ records, callFilters, onSelectKpi }) {
  const kpis = useMemo(() => computeKpis(records, callFilters), [records, callFilters]);
  return (
    <div className="crm-kpis" id="crmKpis">
      {kpis.map((k) => <KpiCard key={k.key} label={k.label} value={k.value} cls={k.cls} onClick={() => onSelectKpi(k.target)} />)}
    </div>
  );
}
