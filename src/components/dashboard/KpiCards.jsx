'use client';
import { computeKpis } from '../../lib/analytics';
import useCountUp from '../../lib/useCountUp';

function KpiCard({ label, value, cls, onClick }) {
  const display = useCountUp(value);
  return (
    <button type="button" className={`crm-kpi${cls ? ' ' + cls : ''}`} onClick={onClick}>
      <div className="crm-kpi-label">{label}</div>
      <div className="crm-kpi-value">{display}</div>
    </button>
  );
}

export default function KpiCards({ records, onSelectKpi }) {
  const kpis = computeKpis(records);
  return (
    <div className="crm-kpis" id="crmKpis">
      {kpis.map((k) => <KpiCard key={k.key} {...k} onClick={() => onSelectKpi(k.key, k.label)} />)}
    </div>
  );
}
