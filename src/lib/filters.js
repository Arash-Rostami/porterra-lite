import Utils from './utils.js';

export const COORD_LABELS = { FARNAZ: 'فرناز', PARDIS: 'پردیس', ZOHREH: 'زهره' };
export const COORD_OPTS = [{ value: 'FARNAZ', label: 'فرناز' }, { value: 'PARDIS', label: 'پردیس' }, { value: 'ZOHREH', label: 'زهره' }];
export function commentAuthors() {
  return Object.values(AGENT_DIRECTORY).sort((a, b) => a.localeCompare(b));
}
export const SOURCE_OPTS = ['ادمونت', 'اینترنت', 'نمایشگاه', 'مدیریت', 'ارتباطات', 'بازاریابی', 'همکاران', 'مشتری ورودی'];
export const RESULT_OPTS = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال'];
export const STATUS_OPTS = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال', 'بدون وضعیت'];
export const PRIORITY_OPTS = ['بالا', 'متوسط', 'پایین'];
export const PRICE_TYPE_OPTS = ['نقدی', 'اعتباری', 'پیش‌پرداخت'];
const FAIL_NOTE_PATTERNS = ['یادم نمیاد', 'جواب نداد', 'پاسخ نداد', 'جواب نمی', 'پاسخ نمی'];

let AGENT_DIRECTORY = {};
let AGENT_DEPARTMENTS = {};
export function setAgentDirectory(agents) {
  AGENT_DIRECTORY = {};
  AGENT_DEPARTMENTS = {};
  for (const a of agents) {
    AGENT_DIRECTORY[a.agentCode] = a.displayName;
    AGENT_DEPARTMENTS[a.agentCode] = a.department || null;
  }
}

export function coordLabel(v) {
  return AGENT_DIRECTORY[v] || COORD_LABELS[v] || v;
}

export function coordCodeFromLabel(label) {
  const s = Utils.normSpace(label || '');
  if (!s) return null;
  for (const code in AGENT_DIRECTORY) {
    if (Utils.normSpace(AGENT_DIRECTORY[code]) === s) return code;
  }
  return null;
}

export function coordOptions() {
  const codes = Object.keys(AGENT_DIRECTORY);
  if (!codes.length) return COORD_OPTS;
  return codes.sort((a, b) => AGENT_DIRECTORY[a].localeCompare(AGENT_DIRECTORY[b])).map((value) => ({ value, label: AGENT_DIRECTORY[value] }));
}

export function scopedCoordOptions(currentUser) {
  if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'developer') return coordOptions();
  if (currentUser.role === 'manager') {
    const codes = Object.keys(AGENT_DIRECTORY).filter((code) => AGENT_DEPARTMENTS[code] === currentUser.department);
    return codes.sort((a, b) => AGENT_DIRECTORY[a].localeCompare(AGENT_DIRECTORY[b])).map((value) => ({ value, label: AGENT_DIRECTORY[value] }));
  }
  const code = currentUser.agentCode;
  if (!code) return [];
  return [{ value: code, label: AGENT_DIRECTORY[code] || coordLabel(code) }];
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
  if (noteIndicatesNoAnswer(r.notes)) return 'بی‌پاسخ';
  return null;
}

export function isQuoteOpen(r) {
  return r.result === 'در حال استعلام' && !r.quoteResult;
}

export function statusBadgeInfo(r) {
  if (r.converted || r.quoteResult === 'موفق') return { text: 'موفق', className: '-success' };
  if (r.quoteResult === 'ناموفق') return { text: 'ناموفق', className: '-fail' };
  const effRes = effectiveResult(r);
  if (!effRes) return { text: '-', className: '-none' };
  if (effRes === 'غیرفعال') return { text: effRes, className: '-fail' };
  return { text: effRes, className: '-progress' };
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
  const { coordinator, category, source, product, status, dateFrom, dateTo } = filters;
  base = base.filter((r) => {
    if (coordinator && r.coordinator !== coordinator) return false;
    if (category && r.category !== category) return false;
    if (source && Utils.normSpace(r.source) !== source) return false;
    if (product && r.product !== product) return false;
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
        if (!dt) return false;
        const fromDt = cf.dateFrom ? Utils.parseDate(cf.dateFrom) : null;
        const toDt = cf.dateTo ? Utils.parseDate(cf.dateTo) : null;
        if (fromDt && dt < fromDt) return false;
        if (toDt && dt > toDt) return false;
        return true;
      }
      if (cf.type === 'day') {
        const dt = Utils.parseDate(r.date);
        const target = Utils.parseDate(cf.date);
        if (!dt || !target || dt.getTime() !== target.getTime()) return false;
        if (cf.agent) return Utils.normSpace(r.coordinator) === cf.agent;
        return true;
      }
      if (cf.type === 'otherSource') {
        return !cf.topSet.has(Utils.normSpace(r.source) || 'نامشخص');
      }
      if (cf.type === 'kpi') {
        if (cf.key === 'total') return true;
        if (cf.key === 'converted') return !!r.converted;
        if (cf.key === 'quoteOpen') return isQuoteOpen(r);
        if (cf.key === 'deactivated') return r.result === 'غیرفعال';
        if (cf.key === 'followUp') return r.result === 'در حال پیگیری';
        if (cf.key === 'noAnswer') return effectiveResult(r) === 'بی‌پاسخ';
        return true;
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

export function sourceSuggestions(records) {
  const set = new Set(SOURCE_OPTS);
  for (const r of records) {
    const s = Utils.normSpace(r.source);
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
