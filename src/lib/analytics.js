import Utils from './utils.js';
import { FA_MONTHS } from './calendar.js';
import { effectiveResult, coordLabel } from './filters.js';

const AGENT_COLORS = {FARNAZ: '#45556c', PARDIS: '#155dfc', ZOHREH: '#f54a00'};

export function agentColor(name) {
    if (AGENT_COLORS[name]) return AGENT_COLORS[name];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return `hsl(${h},45%,42%)`;
}

function tally(recs) {
    let success = 0, fail = 0, pending = 0, quoted = 0, customers = 0;
    for (const r of recs) {
        const eff = effectiveResult(r);
        if (eff === 'موفق') success++;
        else if (eff === 'ناموفق') fail++;
        else pending++;
        if (r.price && String(r.price).trim()) quoted++;
        if (r.converted || eff === 'موفق') customers++;
    }
    return {success, fail, pending, quoted, customers};
}

export function computeAgentReport(records) {
    const agents = Array.from(new Set(records.map((r) => Utils.normSpace(r.coordinator)).filter(Boolean))).sort();
    return agents.map((agent) => {
        const recs = records.filter((r) => Utils.normSpace(r.coordinator) === agent);
        const total = recs.length;
        const t = tally(recs);
        return {agent, total, ...t, conversionRate: total ? Math.round((t.customers / total) * 100) : 0};
    }).sort((a, b) => b.total - a.total);
}

export function computeAgentStats(records, agent, fromDt, toDt) {
    const recs = records.filter((r) => {
        if (Utils.normSpace(r.coordinator) !== agent) return false;
        if (fromDt || toDt) {
            const dt = Utils.parseDate(r.date);
            if (!dt) return false;
            if (fromDt && dt < fromDt) return false;
            if (toDt && dt > toDt) return false;
        }
        return true;
    });
    const t = tally(recs);
    return {
        recs,
        total: recs.length, ...t,
        conversionRate: recs.length ? Math.round((t.customers / recs.length) * 100) : 0
    };
}

export function agentCounts(records) {
    const counts = {};
    for (const r of records) {
        const a = Utils.normSpace(r.coordinator) || 'نامشخص';
        counts[a] = (counts[a] || 0) + 1;
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({name, count: counts[name]}));
}

export async function exportAgentReportToExcel(data) {
    if (!data.length) return false;
    const XLSX = await import('xlsx');
    const rows = data.map((d) => ({
        'کارشناس': coordLabel(d.agent), 'کل تماس‌ها': d.total, 'موفق': d.success, 'ناموفق': d.fail,
        'در جریان': d.pending, 'استعلام‌ها': d.quoted, 'مشتری‌شده': d.customers, 'نرخ تبدیل (٪)': d.conversionRate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch: 14}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 14}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'گزارش کارشناس');
    const today = new Date();
    XLSX.writeFile(wb, 'گزارش-کارشناس-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx');
    return true;
}

export function computeKpis(records) {
  const companies = new Set();
  let solar = 0, poly = 0, petro = 0, chem = 0, last7 = 0;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  for (const r of records) {
    if (r.company) companies.add(Utils.normSpace(r.company));
    const cat = r.category || '';
    if (cat === 'Solar') solar++;
    else if (cat.indexOf('Polymer') > -1) poly++;
    else if (cat === 'Petrochemical') petro++;
    else if (cat === 'Chemical') chem++;
    const dt = Utils.parseDate(r.date);
    if (dt && dt >= weekAgo && dt <= now) last7++;
  }
  return [
    { label: 'کل مخاطبین ثبت‌شده', value: records.length, sub: companies.size + ' شرکت متمایز', cls: '' },
    { label: 'سرنخ‌های خورشیدی', value: solar, sub: 'Solar', cls: '-amber' },
    { label: 'پلیمر / پتروشیمی / شیمیایی', value: poly + petro + chem, sub: 'Polymer + Petrochemical + Chemical', cls: '-teal' },
    { label: 'تماس ۷ روز اخیر', value: last7, sub: 'نسبت به امروز', cls: '' },
  ];
}

export function computeFunnelStages(records) {
  const total = records.length;
  let followedUp = 0, quoted = 0, customer = 0;
  for (const r of records) {
    const eff = effectiveResult(r);
    const isCustomer = r.converted || eff === 'موفق';
    if (eff) followedUp++;
    if (r.price && String(r.price).trim()) quoted++;
    if (isCustomer) customer++;
  }
  const raw = [
    { label: 'کل سرنخ‌ها', value: total, color: '#64748b' },
    { label: 'پیگیری شده', value: followedUp, color: '#2b7fff' },
    { label: 'قیمت داده شده', value: quoted, color: '#ff6900' },
    { label: 'مشتری شده', value: customer, color: '#00bc7d' },
  ];
  return raw.map((s) => {
    const pct = total ? Math.round((s.value / total) * 100) : 0;
    return { ...s, pct, widthPct: Math.max(pct, s.value > 0 ? 4 : 0) };
  });
}

export function computeTrendData(records) {
  const counts = {};
  for (const r of records) {
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    counts[k] = (counts[k] || 0) + 1;
  }
  const keys = Object.keys(counts).sort();
  const labels = keys.map((k) => {
    const [y, m] = k.split('-').map(Number);
    return FA_MONTHS[m - 1] + ' ' + y;
  });
  const data = keys.map((k) => counts[k]);
  return { keys, labels, data };
}

export function computeDailyAgentData(records) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const agents = Array.from(new Set(records.map((r) => Utils.normSpace(r.coordinator)).filter(Boolean))).sort();
  const counts = {};
  agents.forEach((a) => { counts[a] = new Array(daysInMonth).fill(0); });
  let totalThisMonth = 0;
  for (const r of records) {
    const dt = Utils.parseDate(r.date);
    if (!dt || dt.getFullYear() !== y || dt.getMonth() !== m) continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    counts[agent][dt.getDate() - 1]++;
    totalThisMonth++;
  }

  // cap outlier days so a bulk-import spike doesn't flatten the chart; real value still shows in tooltip
  const nonZero = [];
  agents.forEach((a) => counts[a].forEach((v) => { if (v > 0) nonZero.push(v); }));
  nonZero.sort((a, b) => a - b);
  let cap = 20;
  let wasCapped = false;
  if (nonZero.length) {
    const p75 = nonZero[Math.floor(nonZero.length * 0.75)];
    cap = Math.max(15, Math.min(40, p75 * 3));
  }
  agents.forEach((a) => { if (counts[a].some((v) => v > cap)) wasCapped = true; });

  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const datasets = agents.map((a) => ({
    label: coordLabel(a),
    data: counts[a].map((v) => Math.min(v, cap)),
    rawData: counts[a],
    backgroundColor: agentColor(a),
    borderRadius: 4,
    maxBarThickness: 14,
  }));

  const dayTotals = labels.map((_, i) => agents.reduce((sum, a) => sum + counts[a][i], 0));
  const activeDays = labels.map((lab, i) => ({ lab, i, total: dayTotals[i] })).filter((d) => d.total > 0);

  return { y, m, labels, datasets, agents, cap, wasCapped, totalThisMonth, activeDays, monthLabel: FA_MONTHS[m] };
}

export function computeCategoryData(records) {
  const byCat = {};
  for (const r of records) {
    const c = r.category || 'نامشخص';
    byCat[c] = (byCat[c] || 0) + 1;
  }
  // BMS-CM semantic palette: warning/success/info/danger + slate primary + Google Material accents
  const catColors = { Solar: '#ff6900', Polymer: '#00bc7d', Petrochemical: '#2b7fff', Chemical: '#fb2c36', 'Chemical/Polymer': '#45556c', Wood: '#5C6AC4', 'Glass Fiber': '#6750A4', 'نامشخص': '#9AA6B2' };
  const labels = Object.keys(byCat);
  const data = labels.map((l) => byCat[l]);
  const colors = labels.map((l) => catColors[l] || '#BFC7BE');
  return { labels, data, colors };
}

export function computeSourceData(records) {
  const bySrc = {};
  for (const r of records) {
    const s = Utils.normSpace(r.source) || 'نامشخص';
    bySrc[s] = (bySrc[s] || 0) + 1;
  }
  const sorted = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 7);
  const restSum = sorted.slice(7).reduce((a, [, v]) => a + v, 0);
  if (restSum > 0) top.push(['سایر', restSum]);
  return top;
}