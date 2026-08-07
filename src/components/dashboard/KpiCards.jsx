'use client';
import { computeKpis } from '../../lib/analytics.js';
import useCountUp from '../../lib/useCountUp.js';

function KpiCard({ label, value, sub, cls }) {
  const display = useCountUp(value);
  return (
    <div className={`crm-kpi${cls ? ' ' + cls : ''}`}>
      <div className="crm-kpi-label">{label}</div>
      <div className="crm-kpi-value">{display}</div>
      <div className="crm-kpi-sub">{sub}</div>
    </div>
  );
}

export default function KpiCards({ records }) {
  const kpis = computeKpis(records);
  return (
    <div className="crm-kpis" id="crmKpis">
      {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
    </div>
  );
}
