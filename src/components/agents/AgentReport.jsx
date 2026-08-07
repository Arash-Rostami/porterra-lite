'use client';
import { computeAgentReport, exportAgentReportToExcel, agentColor } from '../../lib/analytics.js';
import { coordLabel } from '../../lib/filters.js';
import RingChart from '../ui/RingChart.jsx';
import { toast } from '../ui/Toast.jsx';
import { DownloadIcon } from '../ui/Icon.jsx';

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
      <div className="crm-agent-report-row"><span>موفق</span><Bar val={d.success} total={d.total} color="#3E7A4F" /><b>{d.success.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>ناموفق</span><Bar val={d.fail} total={d.total} color="#B4532A" /><b>{d.fail.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>در جریان</span><Bar val={d.pending} total={d.total} color="#E3A23C" /><b>{d.pending.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-row"><span>استعلام</span><Bar val={d.quoted} total={d.total} color="#1F6F72" /><b>{d.quoted.toLocaleString('en-US')}</b></div>
      <div className="crm-agent-report-conversion"><span>نرخ تبدیل به مشتری</span><span>{d.conversionRate}٪ ({d.customers.toLocaleString('en-US')} نفر)</span></div>
    </div>
  );
}

export default function AgentReport({ records }) {
  const data = computeAgentReport(records);

  async function handleExport() {
    const ok = await exportAgentReportToExcel(data);
    toast(ok ? 'فایل اکسل گزارش کارشناس دانلود شد' : 'داده‌ای نیست');
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row crm-agent-report-head-row">
        <div className="crm-section-title">گزارش عملکرد کارشناسان</div>
        <button type="button" className="crm-export-btn" onClick={handleExport}><DownloadIcon />خروجی اکسل</button>
      </div>
      <div className="crm-agent-report-grid" id="crmAgentReport">
        {!data.length ? <div className="crm-empty">داده‌ای نیست</div> : data.map((d) => <AgentReportCard key={d.agent} d={d} />)}
      </div>
    </div>
  );
}
