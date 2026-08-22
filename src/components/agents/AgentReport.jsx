'use client';
import { useMemo, useState } from 'react';
import { computeAgentReport, exportAgentReportToExcel, agentColor } from '../../lib/analytics';
import { coordLabel } from '../../lib/filters';
import Utils from '../../lib/utils';
import RingChart from '../ui/RingChart.jsx';
import { toast } from '../ui/Toast.jsx';
import { DownloadIcon } from '../ui/Icon.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const PER_PAGE = 6;

function Bar({ val, total, color }) {
  const pct = total ? Math.max(Math.round((val / total) * 100), val > 0 ? 4 : 0) : 0;
  return <div className="crm-agent-report-bar-wrap"><div className="crm-agent-report-bar" style={{ width: pct + '%', background: color }}></div></div>;
}

function AgentReportCard({ d }) {
  return (
    <div className="crm-agent-report-card">
      <div className="crm-agent-report-head">
        <span className="crm-agent-report-dot" style={{ background: agentColor(d.agent) }}></span>
        <span className="crm-agent-report-name">{coordLabel(d.agent)}</span>
        <span className="crm-agent-report-total">{d.total.toLocaleString('en-US')} تماس</span>
        <RingChart percent={d.conversionRate} size={40} stroke={5} />
      </div>
      <div className="crm-agent-report-row"><span>در حال پیگیری</span><Bar val={d.followUp} total={d.total} color="#E3A23C" /><b>{d.followUp.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>بی‌پاسخ</span><Bar val={d.noAnswer} total={d.total} color="#6B7280" /><b>{d.noAnswer.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>غیرفعال</span><Bar val={d.deactivated} total={d.total} color="#7C2D12" /><b>{d.deactivated.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>استعلام باز</span><Bar val={d.quoteOpen} total={d.total} color="#1F6F72" /><b>{d.quoteOpen.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>استعلام موفق</span><Bar val={d.quoteWon} total={d.total} color="#3E7A4F" /><b>{d.quoteWon.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>استعلام ناموفق</span><Bar val={d.quoteLost} total={d.total} color="#B4532A" /><b>{d.quoteLost.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-conversion"><span>نرخ تبدیل سرنخ</span><span>{d.conversionRate}٪ ({d.converted.toLocaleString('en-US')} نفر)</span></div>
    </div>
  );
}

export default function AgentReport({ records }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const data = computeAgentReport(records);
  const filtered = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return data;
    return data.filter((d) => coordLabel(d.agent).toLowerCase().includes(query));
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
