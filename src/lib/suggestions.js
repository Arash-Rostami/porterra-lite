import Utils from './utils.js';
import { effectiveResult, coordLabel } from './filters.js';
import { custKey } from './store.js';

const PRIORITY_RANK = { 'بالا': 3, 'متوسط': 2, 'پایین': 1 };

export function computeSuggestions(records) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // a fresh call supersedes any older, still-pending record for the same company
  const latestByCustomer = {};
  for (const r of records) {
    const key = custKey(r.company);
    if (!key) continue;
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const existing = latestByCustomer[key];
    const existingDt = existing ? Utils.parseDate(existing.date) : null;
    if (!existing || !existingDt || dt > existingDt) {
      latestByCustomer[key] = r;
    }
  }

  const byAgent = {};
  for (const key in latestByCustomer) {
    const r = latestByCustomer[key];
    if (r.converted) continue;
    const effRes = effectiveResult(r);
    if (effRes === 'موفق') continue;
    const dt = Utils.parseDate(r.date);
    if (!dt) continue;
    const days = Math.round((now - dt) / 86400000);
    if (days <= 0) continue;
    const noStatus = !effRes;
    const pr = noStatus ? 3 : PRIORITY_RANK[r.priority] || 0;
    const isNoAnswer = effRes === 'ناموفق';
    if (!isNoAnswer && !noStatus && days < 3 && pr < 3) continue;
    const agent = Utils.normSpace(r.coordinator);
    if (!agent) continue;
    if (!byAgent[agent]) byAgent[agent] = [];
    byAgent[agent].push({ r, days, pr, isNoAnswer, noStatus });
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
  const cap = searchTerm ? 20 : 6;
  const sorted = filtered.slice().sort((a, b) => (b.noStatus - a.noStatus) || (b.isNoAnswer - a.isNoAnswer) || (b.pr - a.pr) || (b.days - a.days));
  return { filtered, shown: sorted.slice(0, cap) };
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
    const list = byAgent[agent].slice().sort((a, b) => (b.noStatus - a.noStatus) || (b.isNoAnswer - a.isNoAnswer) || (b.pr - a.pr) || (b.days - a.days));
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
