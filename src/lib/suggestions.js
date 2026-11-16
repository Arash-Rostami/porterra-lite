import Utils from './utils.js';
import { effectiveResult, coordLabel, matchesFilter, TEMP_OPTS, TEMP_RANK } from './filters.js';
import { companies, companyHay } from './companies.js';

export const SUGGESTION_DAILY_CAP = 30;

function phoneBad(c) {
  return !c.records.some((r) => Utils.phoneDigits(r.phone).length >= 10);
}

function byPriority(a, b) {
  return (TEMP_RANK[a.temp] - TEMP_RANK[b.temp])
    || (Number(b.isNoAnswer) - Number(a.isNoAnswer))
    || (b.days - a.days)
    || (Number(a.phoneBad) - Number(b.phoneBad));
}

function buildSuggestions(records) {
  const byAgent = {};
  for (const c of companies(records)) {
    const r = c.last;
    if (c.isCustomer || !c.lastTs || c.days <= 0) continue;
    const effRes = effectiveResult(r);
    if (effRes === 'غیرفعال' || effRes === 'در حال استعلام') continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    (byAgent[agent] || (byAgent[agent] = [])).push({ r, days: c.days, temp: c.temp, isNoAnswer: effRes === 'بی‌پاسخ', noStatus: !effRes, phoneBad: phoneBad(c), hay: companyHay(c) });
  }
  for (const agent in byAgent) byAgent[agent].sort(byPriority);
  return byAgent;
}

const suggestionsCache = new WeakMap();

export function computeSuggestions(records) {
  let byAgent = suggestionsCache.get(records);
  if (!byAgent) suggestionsCache.set(records, (byAgent = buildSuggestions(records)));
  return byAgent;
}


export function summarizeSuggestions(byAgent) {
  let total = 0, noAnswer = 0, hot = 0;
  for (const agent in byAgent) {
    for (const item of byAgent[agent]) {
      total++;
      if (item.isNoAnswer) noAnswer++;
      if (item.temp === 'hot') hot++;
    }
  }
  return { total, noAnswer, hot };
}

export const SUGGESTION_SORT_MODES = [
  { key: 'smart', label: 'هوشمند' },
  { key: 'days', label: 'قدیمی‌ترین تماس' },
];

export function sortSuggestions(items, sortMode) {
  const list = items.slice();
  return sortMode === 'days' ? list.sort((a, b) => b.days - a.days) : list;
}

export function filterAgentSuggestions(pool, filters) {
  const tokens = Utils.normText(filters.search).split(' ').filter(Boolean);
  const filtered = pool.filter((item) => {
    if (!matchesFilter(item.r.category || 'نامشخص', filters.category)) return false;
    if (!matchesFilter(item.r.product, filters.product)) return false;
    return tokens.every((t) => item.hay.indexOf(t) > -1);
  });
  return { filtered };
}

export async function exportSuggestionsToExcel(byAgent) {
  const XLSX = await import('xlsx');
  const agents = Object.keys(byAgent).sort((a, b) => byAgent[b].length - byAgent[a].length);
  if (!agents.length) return false;
  const wb = XLSX.utils.book_new();
  const summaryRows = agents.map((agent) => {
    const list = byAgent[agent];
    return { 'کارشناس': coordLabel(agent), 'کل موارد': list.length, 'تماس مجدد': list.filter((i) => i.isNoAnswer).length, 'سرنخ داغ': list.filter((i) => i.temp === 'hot').length };
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه');
  agents.forEach((agent) => {
    const list = byAgent[agent];
    const rows = list.map((item) => ({
      'شرکت': item.r.company || '', 'مخاطب': item.r.name || '', 'تلفن': item.r.phone || '',
      'روز از آخرین تماس': item.days,
      'وضعیت': item.noStatus ? 'بدون وضعیت' : (item.isNoAnswer ? 'تماس مجدد' : (effectiveResult(item.r) || 'پیگیری')),
      'دما': (TEMP_OPTS.find((t) => t.value === item.temp) || {}).label || '', 'یادداشت': item.r.notes || '',
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
