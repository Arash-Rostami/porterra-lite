import Utils from './utils.js';
import { effectiveResult, coordLabel } from './filters.js';
import { custKey } from './store.js';

const PRIORITY_RANK = { 'بالا': 3, 'متوسط': 2, 'پایین': 1 };
const PRIORITY_SCORE = { 'بالا': 45, 'متوسط': 25, 'پایین': 10 };

const RECENCY_TIERS = [[6, 20], [13, 45], [29, 70], [Infinity, 90]];
function recencyScore(days) {
  for (const [maxDays, score] of RECENCY_TIERS) {
    if (days <= maxDays) return score;
  }
  return 90;
}

export function parsePriceValue(price) {
  if (!price) return null;
  const m = String(price).replace(/,/g, '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function computeSourceConversionRates(records) {
  const stats = {};
  for (const r of records) {
    const src = Utils.normSpace(r.source);
    if (!src) continue;
    if (!stats[src]) stats[src] = { converted: 0, total: 0 };
    stats[src].total++;
    if (r.converted) stats[src].converted++;
  }
  const rates = {};
  for (const src in stats) rates[src] = stats[src].converted / stats[src].total;
  return rates;
}

function computeSuggestionScore(item, sourceRates) {
  let score = item.noStatus ? 100 : (item.isNoAnswer ? 70 : 0);
  score += PRIORITY_SCORE[item.r.priority] || 0;
  score += recencyScore(item.days);
  const priceVal = parsePriceValue(item.r.price);
  if (priceVal) score += Math.min(priceVal / 100000, 10) * 3;
  const src = Utils.normSpace(item.r.source);
  if (src && sourceRates[src]) score += sourceRates[src] * 40;
  return Math.round(score);
}

export function computeSuggestions(records) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sourceRates = computeSourceConversionRates(records);

  const latestByCompany = {};
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

  const byAgent = {};
  for (const key in latestByCompany) {
    const r = latestByCompany[key];
    if (r.converted) continue;
    if (r.result === 'غیرفعال' || r.result === 'در حال استعلام') continue;
    const effRes = effectiveResult(r);
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const days = Math.round((now - dt) / 86400000);
    if (days <= 0) continue;
    const noStatus = !effRes;
    const pr = noStatus ? 3 : PRIORITY_RANK[r.priority] || 0;
    const isNoAnswer = effRes === 'بی‌پاسخ';
    if (!isNoAnswer && !noStatus && days < 3 && pr < 3) continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    if (!byAgent[agent]) byAgent[agent] = [];
    const item = { r, days, pr, isNoAnswer, noStatus };
    item.score = computeSuggestionScore(item, sourceRates);
    byAgent[agent].push(item);
  }
  return byAgent;
}

export function summarizeSuggestions(byAgent) {
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

export const SUGGESTION_SORT_MODES = [
  { key: 'smart', label: 'هوشمند' },
  { key: 'days', label: 'قدیمی‌ترین تماس' },
  { key: 'value', label: 'بیشترین ارزش معامله' },
];

export function sortSuggestions(items, sortMode) {
  const list = items.slice();
  if (sortMode === 'days') return list.sort((a, b) => b.days - a.days);
  if (sortMode === 'value') return list.sort((a, b) => (parsePriceValue(b.r.price) || 0) - (parsePriceValue(a.r.price) || 0));
  return list.sort((a, b) => b.score - a.score);
}

export function filterAgentSuggestions(pool, filters) {
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

export function suggestionCategoryOptions(pool) {
  return Array.from(new Set(pool.map((i) => i.r.category || 'نامشخص'))).sort((a, b) => a.localeCompare(b));
}
export function suggestionProductOptions(pool) {
  return Array.from(new Set(pool.map((i) => i.r.product).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function exportSuggestionsToExcel(byAgent) {
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
