import Utils from './utils.js';
import { FA_MONTHS, JALALI_MONTHS, gregorianToJalali, jalaliToGregorian, jalaliMonthLength } from './calendar.js';
import { effectiveResult, coordLabel, type LeadLike } from './filters.js';

const pad2 = (n: number): string => String(n).padStart(2, '0');
const ddmmyyyy = (y: number, m: number, d: number): string => `${pad2(d)}.${pad2(m)}.${y}`;

const AGENT_COLORS: Record<string, string> = { FARNAZ: '#45556c', PARDIS: '#155dfc', ZOHREH: '#f54a00' };

export function agentColor(name: string): string {
  if (AGENT_COLORS[name]) return AGENT_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h},45%,42%)`;
}

export interface Tally {
  noAnswer: number;
  deactivated: number;
  followUp: number;
  quoteOpen: number;
  quoteWon: number;
  quoteLost: number;
  converted: number;
}

function tally(recs: LeadLike[]): Tally {
  let noAnswer = 0, deactivated = 0, followUp = 0, quoteOpen = 0, quoteWon = 0, quoteLost = 0, converted = 0;
  for (const r of recs) {
    const eff = effectiveResult(r);
    if (eff === 'بی‌پاسخ') noAnswer++;
    else if (eff === 'غیرفعال') deactivated++;
    else if (eff === 'در حال پیگیری') followUp++;
    else if (eff === 'در حال استعلام') {
      if (r.quoteResult === 'موفق') quoteWon++;
      else if (r.quoteResult === 'ناموفق') quoteLost++;
      else quoteOpen++;
    }
    if (r.converted) converted++;
  }
  return { noAnswer, deactivated, followUp, quoteOpen, quoteWon, quoteLost, converted };
}

function quoteToSaleRate(t: Tally): number {
  const quoted = t.quoteOpen + t.quoteWon + t.quoteLost;
  return quoted ? Math.round((t.quoteWon / quoted) * 100) : 0;
}

export interface AgentReportRow extends Tally {
  agent: string;
  total: number;
  conversionRate: number;
  quoteToSaleRate: number;
}

export function computeAgentReport<T extends LeadLike & { coordinator?: string | null }>(records: T[]): AgentReportRow[] {
  const agents = Array.from(new Set(records.map((r) => Utils.normSpace(r.coordinator)).filter(Boolean))).sort();
  return agents.map((agent) => {
    const recs = records.filter((r) => Utils.normSpace(r.coordinator) === agent);
    const total = recs.length;
    const t = tally(recs);
    return { agent, total, ...t, conversionRate: total ? Math.round((t.converted / total) * 100) : 0, quoteToSaleRate: quoteToSaleRate(t) };
  }).sort((a, b) => b.total - a.total);
}

export interface AgentStats extends Tally {
  recs: LeadLike[];
  total: number;
  conversionRate: number;
  quoteToSaleRate: number;
}

export function computeAgentStats<T extends LeadLike & { coordinator?: string | null; date?: string | null }>(
  records: T[], agent: string, fromDt: Date | null, toDt: Date | null
): AgentStats {
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
    conversionRate: recs.length ? Math.round((t.converted / recs.length) * 100) : 0,
    quoteToSaleRate: quoteToSaleRate(t),
  };
}

export async function exportAgentReportToExcel(data: AgentReportRow[]): Promise<boolean> {
  if (!data.length) return false;
  const XLSX = await import('xlsx');
  const rows = data.map((d) => ({
    'کارشناس': coordLabel(d.agent), 'کل تماس‌ها': d.total, 'در حال پیگیری': d.followUp, 'بی‌پاسخ': d.noAnswer,
    'غیرفعال': d.deactivated, 'استعلام باز': d.quoteOpen, 'استعلام موفق': d.quoteWon, 'استعلام ناموفق': d.quoteLost,
    'سرنخ تبدیل‌شده': d.converted, 'نرخ تبدیل سرنخ (٪)': d.conversionRate, 'نرخ تبدیل استعلام به فروش (٪)': d.quoteToSaleRate,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'گزارش کارشناس');
  const today = new Date();
  XLSX.writeFile(wb, 'گزارش-کارشناس-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx');
  return true;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  cls: string;
}

export function computeKpis<T extends LeadLike>(records: T[]): Kpi[] {
  const t = tally(records);
  return [
    { key: 'total', label: 'تعداد کل سرنخ‌ها', value: records.length, cls: '' },
    { key: 'converted', label: 'سرنخ تبدیل‌شده', value: t.converted, cls: '-teal' },
    { key: 'quoteOpen', label: 'استعلام‌های در جریان', value: t.quoteOpen, cls: '-amber' },
    { key: 'deactivated', label: 'غیرفعال شده', value: t.deactivated, cls: '' },
    { key: 'followUp', label: 'در حال پیگیری', value: t.followUp, cls: '' },
    { key: 'noAnswer', label: 'بی‌پاسخ', value: t.noAnswer, cls: '' },
  ];
}

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
  pct: number;
  widthPct: number;
}

export interface FunnelResult {
  stages: FunnelStage[];
  leadConversionRate: number;
  quoteToSaleRate: number;
}

export function computeFunnelStages<T extends LeadLike>(records: T[]): FunnelResult {
  const total = records.length;
  const t = tally(records);
  const quotedCount = t.quoteOpen + t.quoteWon + t.quoteLost;
  const convertedCount = t.converted;
  const raw = [
    { label: 'کل سرنخ‌ها', value: total, color: '#64748b' },
    { label: 'در حال استعلام', value: quotedCount, color: '#ff6900' },
    { label: 'فروش شده', value: convertedCount, color: '#00bc7d' },
  ];
  const stages = raw.map((s) => {
    const pct = total ? Math.round((s.value / total) * 100) : 0;
    return { ...s, pct, widthPct: Math.max(pct, s.value > 0 ? 4 : 0) };
  });
  return {
    stages,
    leadConversionRate: total ? Math.round((convertedCount / total) * 100) : 0,
    quoteToSaleRate: quoteToSaleRate(t),
  };
}

export interface TrendData {
  keys: string[];
  labels: string[];
  data: number[];
  ranges: { from: string; to: string }[];
}

export function computeTrendData<T extends LeadLike & { date?: string | null }>(records: T[], calendar: string): TrendData {
  const jalali = calendar === 'jalali';
  const counts: Record<string, number> = {};
  for (const r of records) {
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    let y = dt.getFullYear(), m = dt.getMonth() + 1;
    if (jalali) [y, m] = gregorianToJalali(y, m, dt.getDate());
    const k = y + '-' + pad2(m);
    counts[k] = (counts[k] || 0) + 1;
  }
  const keys = Object.keys(counts).sort();
  const labels = keys.map((k) => {
    const [y, m] = k.split('-').map(Number);
    return (jalali ? JALALI_MONTHS[m - 1] : FA_MONTHS[m - 1]) + ' ' + y;
  });
  const ranges = keys.map((k) => {
    const [y, m] = k.split('-').map(Number);
    if (jalali) {
      const [fy, fm, fd] = [y, m, 1];
      const [ty, tm, td] = [y, m, jalaliMonthLength(y, m)];
      return { from: ddmmyyyy(...jalaliToGregorian(fy, fm, fd)), to: ddmmyyyy(...jalaliToGregorian(ty, tm, td)) };
    }
    const lastDay = new Date(y, m, 0).getDate();
    return { from: ddmmyyyy(y, m, 1), to: ddmmyyyy(y, m, lastDay) };
  });
  const data = keys.map((k) => counts[k]);
  return { keys, labels, data, ranges };
}

export interface DailyAgentDataset {
  label: string;
  data: number[];
  rawData: number[];
  backgroundColor: string;
  borderRadius: number;
  maxBarThickness: number;
}

export interface DailyAgentData {
  y: number;
  labels: string[];
  datasets: DailyAgentDataset[];
  agents: string[];
  cap: number;
  wasCapped: boolean;
  totalThisMonth: number;
  activeDays: { lab: string; i: number; total: number; date: string }[];
  monthLabel: string;
  dayDates: string[];
}

export function computeDailyAgentData<T extends LeadLike & { coordinator?: string | null; date?: string | null }>(
  records: T[], calendar: string
): DailyAgentData {
  const jalali = calendar === 'jalali';
  const now = new Date();
  let y: number, m: number, daysInMonth: number, monthLabel: string;
  if (jalali) {
    const [jy, jm] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    y = jy; m = jm;
    daysInMonth = jalaliMonthLength(jy, jm);
    monthLabel = JALALI_MONTHS[jm - 1];
  } else {
    y = now.getFullYear(); m = now.getMonth() + 1;
    daysInMonth = new Date(y, m, 0).getDate();
    monthLabel = FA_MONTHS[m - 1];
  }
  const dayDates = Array.from({ length: daysInMonth }, (_, i) => (jalali ? ddmmyyyy(...jalaliToGregorian(y, m, i + 1)) : ddmmyyyy(y, m, i + 1)));

  const agents = Array.from(new Set(records.map((r) => Utils.normSpace(r.coordinator)).filter(Boolean))).sort();
  const counts: Record<string, number[]> = {};
  agents.forEach((a) => { counts[a] = new Array(daysInMonth).fill(0); });
  let totalThisMonth = 0;
  for (const r of records) {
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    let ry = dt.getFullYear(), rm = dt.getMonth() + 1, rd = dt.getDate();
    if (jalali) [ry, rm, rd] = gregorianToJalali(ry, rm, rd);
    if (ry !== y || rm !== m) continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    counts[agent][rd - 1]++;
    totalThisMonth++;
  }

  const nonZero: number[] = [];
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
  const datasets: DailyAgentDataset[] = agents.map((a) => ({
    label: coordLabel(a),
    data: counts[a].map((v) => Math.min(v, cap)),
    rawData: counts[a],
    backgroundColor: agentColor(a),
    borderRadius: 4,
    maxBarThickness: 14,
  }));

  const dayTotals = labels.map((_, i) => agents.reduce((sum, a) => sum + counts[a][i], 0));
  const activeDays = labels.map((lab, i) => ({ lab, i, total: dayTotals[i], date: dayDates[i] })).filter((d) => d.total > 0);

  return { y, labels, datasets, agents, cap, wasCapped, totalThisMonth, activeDays, monthLabel, dayDates };
}

export interface CategoryData {
  labels: string[];
  data: number[];
  colors: string[];
}

export function computeCategoryData<T extends { category?: string | null }>(records: T[]): CategoryData {
  const byCat: Record<string, number> = {};
  for (const r of records) {
    const c = r.category || 'نامشخص';
    byCat[c] = (byCat[c] || 0) + 1;
  }
  const catColors: Record<string, string> = { Solar: '#ff6900', Polymer: '#00bc7d', Petrochemical: '#2b7fff', Chemical: '#fb2c36', 'Chemical/Polymer': '#45556c', Wood: '#5C6AC4', 'Glass Fiber': '#6750A4', 'نامشخص': '#9AA6B2' };
  const labels = Object.keys(byCat);
  const data = labels.map((l) => byCat[l]);
  const colors = labels.map((l) => catColors[l] || '#BFC7BE');
  return { labels, data, colors };
}

export function computeSourceData<T extends { source?: string | null }>(records: T[]): [string, number][] {
  const bySrc: Record<string, number> = {};
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
