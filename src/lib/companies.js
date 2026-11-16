import Utils from './utils.js';
import { effectiveResult, isQuoteOpen, matchesFilter, getFiltered, searchHay } from './filters.js';

const TEMP_RULES = { hotAnswered: 4, warmAnswered: 2, coldDays: 60 };

const keyCache = new Map();

export function companyKey(name) {
  let key = keyCache.get(name);
  if (key === undefined) {
    key = Utils.normName(name).toLowerCase();
    if (keyCache.size >= 20000) keyCache.clear();
    keyCache.set(name, key);
  }
  return key;
}

export function isCall(r) {
  return !!(r.date || r.result || r.notes);
}

const tsCache = new WeakMap();
function ts(r) {
  let t = tsCache.get(r);
  if (t === undefined) {
    const d = Utils.parseDate(r.date);
    t = d ? d.getTime() : 0;
    tsCache.set(r, t);
  }
  return t;
}

function temperatureOf(c) {
  if (c.tempManual) return c.tempManual;
  if (c.openQuotes) return 'hot';
  if (c.days >= TEMP_RULES.coldDays) return 'cold';
  if (c.priced || c.answered >= TEMP_RULES.hotAnswered) return 'hot';
  return c.answered >= TEMP_RULES.warmAnswered ? 'warm' : 'cold';
}

const cache = new WeakMap();

export function companies(records) {
  let list = cache.get(records);
  if (list) return list;
  const groups = new Map();
  for (const r of records) {
    const key = companyKey(r.company);
    if (!key) continue;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  list = [];
  for (const [key, recs] of groups) {
    recs.sort((a, b) => ts(b) - ts(a));
    const last = recs[0];
    const c = { key, name: last.company, records: recs, last, calls: 0, answered: 0, isCustomer: false, won: 0, lost: 0, openQuotes: 0, priced: 0, tempManual: null };
    for (const r of recs) {
      if (isCall(r)) {
        c.calls++;
        if (effectiveResult(r) !== 'بی‌پاسخ') c.answered++;
      }
      if (r.converted || r.quoteResult === 'موفق') c.isCustomer = true;
      if (r.quoteResult === 'موفق') c.won++;
      else if (r.quoteResult === 'ناموفق') c.lost++;
      else if (isQuoteOpen(r)) c.openQuotes++;
      if (r.quotePrice && r.quoteResult !== 'ناموفق') c.priced++;
      if (!c.tempManual && r.temperature) c.tempManual = r.temperature;
    }
    c.lastTs = ts(last);
    c.days = c.lastTs ? Math.round((today - c.lastTs) / 86400000) : Infinity;
    c.temp = temperatureOf(c);
    list.push(c);
  }
  cache.set(records, list);
  return list;
}

function makeRow(c, last, calls, hay) {
  return { ...last, key: c.key, calls, won: c.won, isCustomer: c.isCustomer, temp: c.temp, tempManual: c.tempManual, status: effectiveResult(last), hay };
}

export function callMatcher(callFilters) {
  const { coordinator, dateFrom, dateTo } = callFilters || {};
  const hasCoord = Array.isArray(coordinator) ? coordinator.length > 0 : !!coordinator;
  const from = dateFrom ? Utils.parseDate(Utils.fromISODate(dateFrom)) : null;
  const to = dateTo ? Utils.parseDate(Utils.fromISODate(dateTo)) : null;
  const fromTs = from ? from.getTime() : 0;
  const toTs = to ? to.getTime() : 0;
  if (!hasCoord && !fromTs && !toTs) return null;
  return (r) => {
    if (hasCoord && !matchesFilter(Utils.normSpace(r.coordinator), coordinator)) return false;
    if (fromTs || toTs) {
      const t = ts(r);
      if (!t || (fromTs && t < fromTs) || (toTs && t > toTs)) return false;
    }
    return true;
  };
}

export function companyHay(c) {
  if (c.hay === undefined) c.hay = c.records.map(searchHay).join('\n');
  return c.hay;
}

export function companyRows(records, callFilters, segment, withHay = false) {
  const match = callMatcher(callFilters);
  const cacheKey = withHay ? 'rowWithHay' : 'row';
  const rows = [];
  for (const c of companies(records)) {
    if (segment === 'lead' && c.isCustomer) continue;
    if (segment === 'customer' && !c.isCustomer) continue;
    let last = c.last;
    let calls = c.calls;
    let hay = withHay ? companyHay(c) : undefined;
    if (match) {
      last = null;
      calls = 0;
      const hits = [];
      for (const r of c.records) {
        if (!match(r)) continue;
        hits.push(r);
        if (!last) last = r;
        if (isCall(r)) calls++;
      }
      if (!last) continue;
      if (withHay && hits.length !== c.records.length) hay = hits.map(searchHay).join('\n');
    }
    if (last === c.last && calls === c.calls && hay === (withHay ? c.hay : undefined)) rows.push(c[cacheKey] || (c[cacheKey] = makeRow(c, last, calls, hay)));
    else rows.push(makeRow(c, last, calls, hay));
  }
  return rows;
}

export function leadList(records, filters, segment, chartFilter, sort) {
  let calls = { coordinator: filters.coordinator, dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  let remaining = chartFilter;
  if (chartFilter && chartFilter.type === 'month') {
    calls = { ...calls, dateFrom: Utils.toISODate(chartFilter.dateFrom), dateTo: Utils.toISODate(chartFilter.dateTo) };
    remaining = null;
  } else if (chartFilter && chartFilter.type === 'day') {
    const iso = Utils.toISODate(chartFilter.date);
    calls = { ...calls, dateFrom: iso, dateTo: iso, ...(chartFilter.agent ? { coordinator: [chartFilter.agent] } : {}) };
    remaining = null;
  }
  const rows = companyRows(records, calls, segment, true);
  return getFiltered(rows, { ...filters, coordinator: '', dateFrom: '', dateTo: '' }, remaining, sort);
}
