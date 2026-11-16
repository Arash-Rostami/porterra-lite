'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeAgentReport, exportAgentReportToExcel, agentColor } from '../../lib/analytics.js';
import { applyLeadFilter } from '../../lib/uiStore.js';
import { coordLabel, textFilter } from '../../lib/filters.js';
import RingChart from '../ui/RingChart.jsx';
import { toast } from '../ui/Toast.jsx';
import { DownloadIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 6;

function Bar({ val, total, color }) {
  const pct = total ? Math.max(Math.round((val / total) * 100), val > 0 ? 4 : 0) : 0;
  return <div className="crm-agent-report-bar-wrap"><div className="crm-agent-report-bar" style={{ width: pct + '%', background: color }}></div></div>;
}

function Row({ label, val, total, color, onOpen }) {
  return (
    <div className="crm-agent-report-row -link" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
      <span>{label}</span><Bar val={val} total={total} color={color} /><b>{val.toLocaleString('en-US')}</b>
    </div>
  );
}

function AgentReportCard({ d }) {
  const router = useRouter();
  const open = (href, partial) => () => {
    applyLeadFilter({ coordinator: [d.agent], ...partial });
    router.push(href);
  };
  return (
    <div className="crm-agent-report-card">
      <div className="crm-agent-report-head">
        <span className="crm-agent-report-dot" style={{ background: agentColor(d.agent) }}></span>
        <span className="crm-agent-report-name">{coordLabel(d.agent)}</span>
        <span className="crm-agent-report-total">{d.total.toLocaleString('en-US')} تماس</span>
        <RingChart percent={d.conversionRate} size={40} stroke={5} />
      </div>
      <Row label="در حال پیگیری" val={d.followUp} total={d.leads} color="#E3A23C" onOpen={open('/leads', { status: ['در حال پیگیری'] })} />
      <Row label="بی‌پاسخ" val={d.noAnswer} total={d.leads} color="#6B7280" onOpen={open('/leads', { status: ['بی‌پاسخ'] })} />
      <Row label="غیرفعال" val={d.deactivated} total={d.leads} color="#7C2D12" onOpen={open('/leads', { status: ['غیرفعال'] })} />
      <Row label="استعلام باز" val={d.quoteOpen} total={d.quoteTotal} color="#1F6F72" onOpen={open('/inquiries')} />
      <Row label="استعلام موفق" val={d.quoteWon} total={d.quoteTotal} color="#3E7A4F" onOpen={open('/inquiries')} />
      <Row label="استعلام ناموفق" val={d.quoteLost} total={d.quoteTotal} color="#B4532A" onOpen={open('/inquiries')} />
      <div className="crm-agent-report-conversion"><span>نرخ تبدیل سرنخ</span><span>{d.conversionRate}٪ ({d.converted.toLocaleString('en-US')} مشتری از {d.companies.toLocaleString('en-US')} شرکت)</span></div>
    </div>
  );
}

export default function AgentReport({ records }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const data = useMemo(() => computeAgentReport(records), [records]);
  const filtered = useMemo(() => {
    return textFilter(data, q, (d) => [coordLabel(d.agent)]);
  }, [data, q]);
  const { pageItems, totalPages, safePage } = paginate(filtered, page, PER_PAGE);

  function changeQuery(v) {
    setQ(v);
    setPage(1);
  }

  async function handleExport() {
    const ok = await exportAgentReportToExcel(data);
    toast(ok ? 'فایل اکسل گزارش کارشناس دانلود شد' : 'داده‌ای نیست');
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">گزارش عملکرد کارشناسان</div>
        <span className="crm-result-count">
          {filtered.length === data.length
            ? `${data.length.toLocaleString('en-US')} کارشناس`
            : `${filtered.length.toLocaleString('en-US')} نتیجه از ${data.length.toLocaleString('en-US')}`}
        </span>
      </div>
      <div className="crm-toolbar">
        <input className="crm-input crm-search-input -compact" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی کارشناس..." />
        <div className="crm-table-actions">
          <button type="button" className="crm-export-btn" onClick={handleExport}><DownloadIcon />خروجی اکسل</button>
        </div>
      </div>
      <div className="crm-agent-report-grid" id="crmAgentReport">
        {!filtered.length ? <div className="crm-empty">داده‌ای نیست</div> : pageItems.map((d) => <AgentReportCard key={d.agent} d={d} />)}
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
