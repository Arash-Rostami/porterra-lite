import Utils from './utils';

export const COORD_LABELS: Record<string, string> = { FARNAZ: 'فرناز', PARDIS: 'پردیس', ZOHREH: 'زهره' };
export const COORD_OPTS: { value: string; label: string }[] = [
  { value: 'FARNAZ', label: 'فرناز' }, { value: 'PARDIS', label: 'پردیس' }, { value: 'ZOHREH', label: 'زهره' },
];
export const SOURCE_OPTS: string[] = ['ادمونت', 'اینترنت', 'نمایشگاه', 'مدیریت', 'ارتباطات', 'بازاریابی', 'همکاران', 'مشتری ورودی'];
export const RESULT_OPTS: string[] = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال'];
export const STATUS_OPTS: string[] = ['در حال پیگیری', 'در حال استعلام', 'بی‌پاسخ', 'غیرفعال', 'بدون وضعیت'];
export const PRIORITY_OPTS: string[] = ['بالا', 'متوسط', 'پایین'];
export const PRICE_TYPE_OPTS: string[] = ['نقدی', 'اعتباری', 'پیش‌پرداخت'];
const FAIL_NOTE_PATTERNS: string[] = ['یادم نمیاد', 'جواب نداد', 'پاسخ نداد', 'جواب نمی', 'پاسخ نمی'];

// Minimal structural shape of the fields the pure computation layer (this file,
// duplicates.ts, analytics.ts, suggestions.ts) reads/writes on a lead record.
// The canonical, fuller `Lead` type (with id, deactivateReason, quote* fields,
// etc.) is defined in src/types/lead.ts once mappers.ts is converted (Task 8) —
// this lighter type exists because those four files convert before mappers.ts
// does, and each only ever needs a subset of Lead's fields.
export interface LeadLike {
  result?: string | null;
  notes?: string | null;
  quoteResult?: string | null;
  converted?: boolean;
  coordinator?: string | null;
  category?: string | null;
  source?: string | null;
  product?: string | null;
  company?: string | null;
  name?: string | null;
  phone?: string | null;
  date?: string | null;
  priority?: string | null;
  price?: string | null;
}

export interface AgentInfo {
  agentCode: string;
  displayName: string;
  department?: string | null;
}

export interface CurrentUser {
  role: string;
  department?: string | null;
  agentCode?: string | null;
}

let AGENT_DIRECTORY: Record<string, string> = {};
let AGENT_DEPARTMENTS: Record<string, string | null> = {};
export function setAgentDirectory(agents: AgentInfo[]): void {
  AGENT_DIRECTORY = {};
  AGENT_DEPARTMENTS = {};
  for (const a of agents) {
    AGENT_DIRECTORY[a.agentCode] = a.displayName;
    AGENT_DEPARTMENTS[a.agentCode] = a.department || null;
  }
}

export function coordLabel(v: string): string {
  return AGENT_DIRECTORY[v] || COORD_LABELS[v] || v;
}

export function coordCodeFromLabel(label: string | null | undefined): string | null {
  const s = Utils.normSpace(label || '');
  if (!s) return null;
  for (const code in AGENT_DIRECTORY) {
    if (Utils.normSpace(AGENT_DIRECTORY[code]) === s) return code;
  }
  return null;
}

export function coordOptions(): { value: string; label: string }[] {
  const codes = Object.keys(AGENT_DIRECTORY);
  if (!codes.length) return COORD_OPTS;
  return codes.sort((a, b) => AGENT_DIRECTORY[a].localeCompare(AGENT_DIRECTORY[b])).map((value) => ({ value, label: AGENT_DIRECTORY[value] }));
}

export function scopedCoordOptions(currentUser: CurrentUser | null | undefined): { value: string; label: string }[] {
  if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'developer') return coordOptions();
  if (currentUser.role === 'manager') {
    const codes = Object.keys(AGENT_DIRECTORY).filter((code) => AGENT_DEPARTMENTS[code] === currentUser.department);
    return codes.sort((a, b) => AGENT_DIRECTORY[a].localeCompare(AGENT_DIRECTORY[b])).map((value) => ({ value, label: AGENT_DIRECTORY[value] }));
  }
  const code = currentUser.agentCode;
  if (!code) return [];
  return [{ value: code, label: AGENT_DIRECTORY[code] || coordLabel(code) }];
}

export function coordClass(co: string | null | undefined): string {
  if (co === 'FARNAZ') return '-farnaz';
  if (co === 'PARDIS') return '-pardis';
  if (co === 'ZOHREH') return '-zohreh';
  return '-other';
}

export function badgeClass(cat: string | null | undefined): string {
  if (!cat) return '-other';
  if (cat === 'Solar') return '-solar';
  if (cat.indexOf('Polymer') > -1) return '-polymer';
  if (cat === 'Petrochemical') return '-petro';
  if (cat === 'Chemical') return '-chem';
  if (cat === 'Wood') return '-wood';
  if (cat === 'Glass Fiber') return '-glass';
  return '-other';
}

export function noteIndicatesNoAnswer(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return FAIL_NOTE_PATTERNS.some((p) => notes.indexOf(p) > -1);
}

export function effectiveResult(r: LeadLike): string | null {
  if (r.result) return r.result;
  if (noteIndicatesNoAnswer(r.notes)) return 'بی‌پاسخ';
  return null;
}

export function isQuoteOpen(r: LeadLike): boolean {
  return r.result === 'در حال استعلام' && !r.quoteResult;
}

export function statusBadgeInfo(r: LeadLike): { text: string; className: string } {
  if (r.converted || r.quoteResult === 'موفق') return { text: 'موفق', className: '-success' };
  if (r.quoteResult === 'ناموفق') return { text: 'ناموفق', className: '-fail' };
  const effRes = effectiveResult(r);
  if (!effRes) return { text: '-', className: '-none' };
  if (effRes === 'غیرفعال') return { text: effRes, className: '-fail' };
  return { text: effRes, className: '-progress' };
}

export interface ScoredRecord<T> {
  r: T;
  score: number;
}

export function smartSearch<T extends LeadLike & Record<string, unknown>>(records: T[], query: string | null | undefined): ScoredRecord<T>[] {
  if (!query || !query.trim()) return records.map((r) => ({ r, score: 1 }));
  const tokens = query.trim().toLowerCase().split(/\s+/);
  const fields = ['company', 'name', 'phone', 'notes', 'product', 'category', 'source', 'coordinator'];
  const out: ScoredRecord<T>[] = [];
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

export interface LeadFilters {
  coordinator?: string | null;
  category?: string | null;
  source?: string | null;
  product?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  q?: string | null;
}

export type ChartFilter =
  | { type: 'month'; dateFrom?: string | null; dateTo?: string | null }
  | { type: 'day'; date: string; agent?: string | null }
  | { type: 'otherSource'; topSet: Set<string> }
  | { type: 'kpi'; key: string }
  | null
  | undefined;

export interface SortSpec {
  key: string;
  dir: 1 | -1;
}

export function getFiltered<T extends LeadLike & Record<string, unknown>>(
  records: T[],
  filters: LeadFilters,
  chartFilter: ChartFilter,
  sort: SortSpec | null | undefined
): T[] {
  let base: T[] = records;
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
  let list: T[] = scored.map((s) => s.r);
  if (sort && sort.key) {
    const k = sort.key;
    list = list.slice().sort((a, b) => {
      const av: unknown = a[k] || '', bv: unknown = b[k] || '';
      if (k === 'date') {
        const avd = Utils.parseDate(a.date) || new Date(0);
        const bvd = Utils.parseDate(b.date) || new Date(0);
        return (avd.getTime() - bvd.getTime()) * sort.dir;
      }
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
  }
  return list;
}

export interface FilterOptions {
  coordinators: { value: string; label: string }[];
  categories: string[];
  sources: string[];
}

export function filterOptionsFrom<T extends LeadLike>(records: T[]): FilterOptions {
  const coords = new Set<string>(), cats = new Set<string>(), sources = new Set<string>();
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

export function sourceSuggestions<T extends LeadLike>(records: T[]): string[] {
  const set = new Set<string>(SOURCE_OPTS);
  for (const r of records) {
    const s = Utils.normSpace(r.source);
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
