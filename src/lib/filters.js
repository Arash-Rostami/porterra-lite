import Utils from './utils.js';

export const COORD_LABELS = { FARNAZ: 'فرناز', PARDIS: 'پردیس', ZOHREH: 'زهره' };
export const COORD_OPTS = [{ value: 'FARNAZ', label: 'فرناز' }, { value: 'PARDIS', label: 'پردیس' }, { value: 'ZOHREH', label: 'زهره' }];
export const SOURCE_OPTS = ['ادمونت', 'اینترنت', 'نمایشگاه', 'همکاران', 'بازاریابی', 'ارتباطات', 'مدیریت', 'مشتری ورودی', 'سایر'];
export const OTHER_SOURCES_LABEL = 'سایر منابع';
export const TEMP_OPTS = [{ value: 'hot', label: 'داغ' }, { value: 'warm', label: 'گرم' }, { value: 'cold', label: 'سرد' }];
export const TEMP_RANK = { hot: 0, warm: 1, cold: 2 };
export const RESULT_OPTS = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال'];
export const STATUS_OPTS = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال', 'بدون وضعیت'];
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

export function textFilter(items, query, fieldsFn) {
  const q = Utils.normText(query);
  if (!q) return items;
  return items.filter((item) => fieldsFn(item).some((v) => v && Utils.normText(v).indexOf(q) > -1));
}

const HAY_FIELDS = ['company', 'name', 'phone', 'notes', 'product', 'category', 'source', 'coordinator'];
const hayCache = new WeakMap();

export function searchHay(r) {
  let hay = hayCache.get(r);
  if (hay === undefined) {
    const parts = HAY_FIELDS.map((f) => (r[f] ? Utils.normText(r[f]) : ''));
    if (r.phone) parts.push(Utils.phoneDigits(r.phone));
    if (r.coordinator) parts.push(Utils.normText(coordLabel(r.coordinator)));
    hay = parts.filter(Boolean).join('\n');
    hayCache.set(r, hay);
  }
  return hay;
}

export function smartSearch(records, query) {
  const phrase = Utils.normText(query);
  if (!phrase) return records.map((r) => ({ r, score: 1 }));
  const tokens = phrase.split(' ');
  const out = [];
  for (const r of records) {
    const hay = r.hay || searchHay(r);
    if (!tokens.every((t) => hay.indexOf(t) > -1)) continue;
    out.push({ r, score: hay.indexOf(phrase) > -1 ? 2 : 1 });
  }
  return out;
}

export function matchesFilter(fieldValue, filterValue) {
  if (Array.isArray(filterValue)) return !filterValue.length || filterValue.includes(fieldValue);
  return !filterValue || fieldValue === filterValue;
}

function activeStatuses(status) {
  if (Array.isArray(status)) return status.length ? status : null;
  return status ? [status] : null;
}

export function getFiltered(records, filters, chartFilter, sort) {
  let base = records;
  const { coordinator, category, source, product, status, dateFrom, dateTo, temp } = filters;
  base = base.filter((r) => {
    if (!matchesFilter(r.coordinator, coordinator)) return false;
    if (!matchesFilter(r.category || 'نامشخص', category)) return false;
    if (!matchesFilter(Utils.normSpace(r.source) || 'نامشخص', source)) return false;
    if (!matchesFilter(r.product, product)) return false;
    if (!matchesFilter(r.temp, temp)) return false;
    const statuses = activeStatuses(status);
    if (statuses) {
      const eff = r.status !== undefined ? r.status : effectiveResult(r);
      if (!statuses.some((s) => (s === 'بدون وضعیت' ? !eff : eff === s))) return false;
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
      return true;
    });
  }
  let scored = smartSearch(base, filters.q);
  scored.sort((a, b) => b.score - a.score);
  let list = scored.map((s) => s.r);
  if (sort && sort.key) {
    const k = sort.key;
    if (k === 'date') {
      list = list.map((r) => [r, (Utils.parseDate(r.date) || new Date(0)).getTime()])
        .sort((a, b) => (a[1] - b[1]) * sort.dir)
        .map((x) => x[0]);
    } else if (k === 'temp') {
      list = list.slice().sort((a, b) => (TEMP_RANK[a.temp] - TEMP_RANK[b.temp]) * sort.dir);
    } else if (k === 'calls') {
      list = list.slice().sort((a, b) => ((a.calls || 0) - (b.calls || 0)) * sort.dir);
    } else {
      list = list.slice().sort((a, b) => String(a[k] || '').localeCompare(String(b[k] || '')) * sort.dir);
    }
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
