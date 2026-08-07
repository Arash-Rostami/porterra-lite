import Utils from './utils.js';

export const COORD_LABELS = { FARNAZ: 'فرناز', PARDIS: 'پردیس', ZOHREH: 'زهره' };
const FAIL_NOTE_PATTERNS = ['یادم نمیاد', 'جواب نداد', 'پاسخ نداد', 'جواب نمی', 'پاسخ نمی'];

export function coordLabel(v) {
  return COORD_LABELS[v] || v;
}

export function coordClass(co) {
  if (co === 'FARNAZ') return '-farnaz';
  if (co === 'PARDIS') return '-pardis';
  if (co === 'ZOHREH') return '-zohreh';
  return '-other';
}

export function badgeClass(cat) {
  if (!cat) return '-other';
  if (cat === 'Solar') return '-solar';
  if (cat.indexOf('Polymer') > -1) return '-polymer';
  if (cat === 'Petrochemical') return '-petro';
  if (cat === 'Chemical') return '-chem';
  if (cat === 'Wood') return '-wood';
  if (cat === 'Glass Fiber') return '-glass';
  return '-other';
}

export function noteIndicatesNoAnswer(notes) {
  if (!notes) return false;
  return FAIL_NOTE_PATTERNS.some((p) => notes.indexOf(p) > -1);
}

export function effectiveResult(r) {
  if (r.result) return r.result;
  if (noteIndicatesNoAnswer(r.notes)) return 'ناموفق';
  return null;
}

export function statusBadgeInfo(r) {
  const effRes = effectiveResult(r);
  if (!effRes) return { text: '-', className: '-none' };
  let cls = '-progress';
  if (effRes === 'موفق') cls = '-success';
  else if (effRes === 'ناموفق') cls = '-fail';
  return { text: effRes, className: cls };
}

export function smartSearch(records, query) {
  if (!query || !query.trim()) return records.map((r) => ({ r, score: 1 }));
  const tokens = query.trim().toLowerCase().split(/\s+/);
  const fields = ['company', 'name', 'phone', 'notes', 'product', 'category', 'source', 'coordinator'];
  const out = [];
  for (const r of records) {
    let score = 0;
    for (const tok of tokens) {
      let hit = false;
      for (const f of fields) {
        const v = r[f];
        if (v && String(v).toLowerCase().indexOf(tok) > -1) { hit = true; break; }
      }
      if (!hit && r.coordinator && coordLabel(r.coordinator).toLowerCase().indexOf(tok) > -1) hit = true;
      if (hit) score++;
    }
    if (score > 0) out.push({ r, score });
  }
  return out;
}

export function getFiltered(records, filters, chartFilter, sort) {
  let base = records;
  const { coordinator, category, source, status, dateFrom, dateTo } = filters;
  base = base.filter((r) => {
    if (coordinator && r.coordinator !== coordinator) return false;
    if (category && r.category !== category) return false;
    if (source && Utils.normSpace(r.source) !== source) return false;
    if (status) {
      const eff = effectiveResult(r);
      if (status === 'بدون وضعیت') { if (eff) return false; }
      else if (eff !== status) return false;
    }
    return true;
  });
  if (dateFrom || dateTo) {
    const fromDt = dateFrom ? Utils.parseDate(Utils.fromISODate(dateFrom)) : null;
    const toDt = dateTo ? Utils.parseDate(Utils.fromISODate(dateTo)) : null;
    base = base.filter((r) => {
      const dt = Utils.parseDate(r.date);
      if (!dt) return false;
      if (fromDt && dt < fromDt) return false;
      if (toDt && dt > toDt) return false;
      return true;
    });
  }
  if (chartFilter) {
    const cf = chartFilter;
    base = base.filter((r) => {
      if (cf.type === 'month') {
        const dt = Utils.parseDate(r.date);
        return dt && dt.getFullYear() === cf.y && dt.getMonth() + 1 === cf.m;
      }
      if (cf.type === 'day') {
        const dt = Utils.parseDate(r.date);
        if (!dt || dt.getFullYear() !== cf.y || dt.getMonth() !== cf.m || dt.getDate() !== cf.day) return false;
        if (cf.agent) return Utils.normSpace(r.coordinator) === cf.agent;
        return true;
      }
      if (cf.type === 'otherSource') {
        return !cf.topSet.has(Utils.normSpace(r.source) || 'نامشخص');
      }
      return true;
    });
  }
  let scored = smartSearch(base, filters.q);
  scored.sort((a, b) => b.score - a.score);
  let list = scored.map((s) => s.r);
  if (sort && sort.key) {
    const k = sort.key;
    list = list.slice().sort((a, b) => {
      let av = a[k] || '', bv = b[k] || '';
      if (k === 'date') { av = Utils.parseDate(a.date) || new Date(0); bv = Utils.parseDate(b.date) || new Date(0); return (av - bv) * sort.dir; }
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
  }
  return list;
}

export function filterOptionsFrom(records) {
  const coords = new Set(), cats = new Set(), sources = new Set();
  for (const r of records) {
    if (r.coordinator) coords.add(r.coordinator);
    if (r.category) cats.add(r.category);
    if (r.source) sources.add(Utils.normSpace(r.source));
  }
  return {
    coordinators: Array.from(coords).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: coordLabel(v) })),
    categories: Array.from(cats).sort((a, b) => a.localeCompare(b)),
    sources: Array.from(sources).sort((a, b) => a.localeCompare(b)),
  };
}
