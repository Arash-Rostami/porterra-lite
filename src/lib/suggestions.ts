import Utils from './utils';
import { effectiveResult, coordLabel, type LeadLike } from './filters';
import { custKey } from './store';

const PRIORITY_RANK: Record<string, number> = { 'بالا': 3, 'متوسط': 2, 'پایین': 1 };
const PRIORITY_SCORE: Record<string, number> = { 'بالا': 45, 'متوسط': 25, 'پایین': 10 };

const RECENCY_TIERS: [number, number][] = [[6, 20], [13, 45], [29, 70], [Infinity, 90]];
function recencyScore(days: number): number {
  for (const [maxDays, score] of RECENCY_TIERS) {
    if (days <= maxDays) return score;
  }
  return 90;
}

export function parsePriceValue(price: string | null | undefined): number | null {
  if (!price) return null;
  const m = String(price).replace(/,/g, '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function computeSourceConversionRates<T extends LeadLike>(records: T[]): Record<string, number> {
  const stats: Record<string, { converted: number; total: number }> = {};
  for (const r of records) {
    const src = Utils.normSpace(r.source);
    if (!src) continue;
    if (!stats[src]) stats[src] = { converted: 0, total: 0 };
    stats[src].total++;
    if (r.converted) stats[src].converted++;
  }
  const rates: Record<string, number> = {};
  for (const src in stats) rates[src] = stats[src].converted / stats[src].total;
  return rates;
}

export interface SuggestionItem<T> {
  r: T;
  days: number;
  pr: number;
  isNoAnswer: boolean;
  noStatus: boolean;
  score: number;
}

function computeSuggestionScore<T extends LeadLike>(item: Omit<SuggestionItem<T>, 'score'>, sourceRates: Record<string, number>): number {
  let score = item.noStatus ? 100 : (item.isNoAnswer ? 70 : 0);
  score += PRIORITY_SCORE[item.r.priority ?? ''] || 0;
  score += recencyScore(item.days);
  const priceVal = parsePriceValue(item.r.price);
  if (priceVal) score += Math.min(priceVal / 100000, 10) * 3;
  const src = Utils.normSpace(item.r.source);
  if (src && sourceRates[src]) score += sourceRates[src] * 40;
  return Math.round(score);
}

export function computeSuggestions<T extends LeadLike & { company?: string | null; coordinator?: string | null; date?: string | null }>(
  records: T[]
): Record<string, SuggestionItem<T>[]> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sourceRates = computeSourceConversionRates(records);

  const latestByCompany: Record<string, T> = {};
  for (const r of records) {
    const key = custKey(r.company);
    if (!key) continue;
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const existing = latestByCompany[key];
    const existingDt = existing ? Utils.parseDate(existing.date) : null;
    if (!existing || !existingDt || dt > existingDt) {
      latestByCompany[key] = r;
    }
  }

  const byAgent: Record<string, SuggestionItem<T>[]> = {};
  for (const key in latestByCompany) {
    const r = latestByCompany[key];
    if (r.converted) continue;
    if (r.result === 'غیرفعال' || r.result === 'در حال استعلام') continue;
    const effRes = effectiveResult(r);
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const days = Math.round((now.getTime() - dt.getTime()) / 86400000);
    if (days <= 0) continue;
    const noStatus = !effRes;
    const pr = noStatus ? 3 : PRIORITY_RANK[r.priority ?? ''] || 0;
    const isNoAnswer = effRes === 'بی‌پاسخ';
    if (!isNoAnswer && !noStatus && days < 3 && pr < 3) continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    if (!byAgent[agent]) byAgent[agent] = [];
    const item: SuggestionItem<T> = { r, days, pr, isNoAnswer, noStatus, score: 0 };
    item.score = computeSuggestionScore(item, sourceRates);
    byAgent[agent].push(item);
  }
  return byAgent;
}

export interface SuggestionsSummary {
  total: number;
  noAnswer: number;
  highPriority: number;
}

export function summarizeSuggestions<T>(byAgent: Record<string, SuggestionItem<T>[]>): SuggestionsSummary {
  let total = 0, noAnswer = 0, highPriority = 0;
  for (const agent in byAgent) {
    for (const item of byAgent[agent]) {
      total++;
      if (item.isNoAnswer) noAnswer++;
      if (item.pr === 3) highPriority++;
    }
  }
  return { total, noAnswer, highPriority };
}

export const SUGGESTION_SORT_MODES: { key: string; label: string }[] = [
  { key: 'smart', label: 'هوشمند' },
  { key: 'days', label: 'قدیمی‌ترین تماس' },
  { key: 'value', label: 'بیشترین ارزش معامله' },
];

export function sortSuggestions<T extends { price?: string | null }>(items: SuggestionItem<T>[], sortMode: string): SuggestionItem<T>[] {
  const list = items.slice();
  if (sortMode === 'days') return list.sort((a, b) => b.days - a.days);
  if (sortMode === 'value') return list.sort((a, b) => (parsePriceValue(b.r.price) || 0) - (parsePriceValue(a.r.price) || 0));
  return list.sort((a, b) => b.score - a.score);
}

export interface SuggestionFilters {
  category?: string | null;
  product?: string | null;
  search?: string | null;
}

export function filterAgentSuggestions<T extends { category?: string | null; product?: string | null; company?: string | null; name?: string | null; phone?: string | null; notes?: string | null }>(
  pool: SuggestionItem<T>[], filters: SuggestionFilters
): { filtered: SuggestionItem<T>[] } {
  const searchTerm = (filters.search || '').trim().toLowerCase();
  const filtered = pool.filter((item) => {
    if (filters.category && (item.r.category || 'نامشخص') !== filters.category) return false;
    if (filters.product && item.r.product !== filters.product) return false;
    if (searchTerm) {
      const hay = [item.r.company, item.r.name, item.r.phone, item.r.product, item.r.notes].filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(searchTerm) === -1) return false;
    }
    return true;
  });
  return { filtered };
}

export async function exportSuggestionsToExcel<T extends { company?: string | null; name?: string | null; phone?: string | null; notes?: string | null; priority?: string | null; price?: string | null }>(
  byAgent: Record<string, SuggestionItem<T>[]>
): Promise<boolean> {
  const XLSX = await import('xlsx');
  const agents = Object.keys(byAgent).sort((a, b) => byAgent[b].length - byAgent[a].length);
  if (!agents.length) return false;
  const wb = XLSX.utils.book_new();
  const summaryRows = agents.map((agent) => {
    const list = byAgent[agent];
    return { 'کارشناس': coordLabel(agent), 'کل موارد': list.length, 'تماس مجدد': list.filter((i) => i.isNoAnswer).length, 'اولویت بالا': list.filter((i) => i.pr === 3).length };
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه');
  agents.forEach((agent) => {
    const list = sortSuggestions(byAgent[agent], 'smart');
    const rows = list.map((item) => ({
      'شرکت': item.r.company || '', 'مخاطب': item.r.name || '', 'تلفن': item.r.phone || '',
      'روز از آخرین تماس': item.days,
      'وضعیت': item.noStatus ? 'بدون وضعیت' : (item.isNoAnswer ? 'تماس مجدد' : (effectiveResult(item.r) || 'پیگیری')),
      'اولویت': item.r.priority || '', 'یادداشت': item.r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 40 }];
    const sheetName = coordLabel(agent).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'کارشناس';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  const today = new Date();
  const fname = 'پیشنهاد-تماس-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx';
  XLSX.writeFile(wb, fname);
  return true;
}
