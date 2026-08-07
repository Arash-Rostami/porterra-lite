'use client';
import { useSyncExternalStore } from 'react';

const CALENDAR_KEY = 'crm_calendar_pref_v1';
function readCalendarPref() {
  if (typeof window === 'undefined') return 'gregorian';
  try { return localStorage.getItem(CALENDAR_KEY) === 'jalali' ? 'jalali' : 'gregorian'; } catch { return 'gregorian'; }
}

const FONT_SCALE_KEY = 'crm_font_scale_v1';
const FONT_SCALE_DEFAULT = 1.08; // slightly larger than the original 1.0 baseline
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.3;
function readFontScalePref() {
  if (typeof window === 'undefined') return FONT_SCALE_DEFAULT;
  try {
    const v = parseFloat(localStorage.getItem(FONT_SCALE_KEY));
    return Number.isFinite(v) ? v : FONT_SCALE_DEFAULT;
  } catch { return FONT_SCALE_DEFAULT; }
}

let ui = {
  profileId: null,
  quickCallOnOpen: false,
  agentProfile: null,
  addFormOpen: false,
  chartFilter: null,
  filters: { q: '', coordinator: '', category: '', source: '', status: '', dateFrom: '', dateTo: '' },
  calendar: 'gregorian',
  fontScale: FONT_SCALE_DEFAULT,
  scope: 'mine',
};
const SERVER_UI = { ...ui };
const listeners = new Set();
function emit() { for (const l of listeners) l(); }

let uiHydrated = false;
function hydrateUi() {
  if (uiHydrated || typeof window === 'undefined') return;
  uiHydrated = true;
  ui = { ...ui, calendar: readCalendarPref(), fontScale: readFontScalePref() };
}

const SCOPE_KEY = (username) => `crm_scope_${username}`;
let scopeUser = null;

export function useUiStore(selector) {
  return useSyncExternalStore(
    (cb) => { hydrateUi(); listeners.add(cb); return () => listeners.delete(cb); },
    () => selector(ui),
    () => selector(SERVER_UI),
  );
}

export function openProfile(id, quickCall = false) { ui = { ...ui, profileId: id, quickCallOnOpen: quickCall }; emit(); }
export function closeProfile() { ui = { ...ui, profileId: null, quickCallOnOpen: false }; emit(); }
export function openAgentProfile(agent) { ui = { ...ui, agentProfile: agent }; emit(); }
export function closeAgentProfile() { ui = { ...ui, agentProfile: null }; emit(); }
export function setAddFormOpen(open) { ui = { ...ui, addFormOpen: open }; emit(); }
export function setFilters(filters) { ui = { ...ui, filters }; emit(); }
export function setChartFilter(chartFilter) { ui = { ...ui, chartFilter }; emit(); }
export function clearChartFilter() { ui = { ...ui, chartFilter: null }; emit(); }
export function initScopeForUser(username) {
  scopeUser = username;
  let s = 'mine';
  try {
    const v = localStorage.getItem(SCOPE_KEY(username));
    if (v === 'mine' || v === 'all') s = v;
  } catch {}
  ui = { ...ui, scope: s };
  emit();
}
export function setScope(scope) {
  if (scopeUser) { try { localStorage.setItem(SCOPE_KEY(scopeUser), scope); } catch {} }
  ui = { ...ui, scope };
  emit();
}
export function toggleCalendar() {
  const next = ui.calendar === 'jalali' ? 'gregorian' : 'jalali';
  try { localStorage.setItem(CALENDAR_KEY, next); } catch {}
  ui = { ...ui, calendar: next };
  emit();
}

function setFontScale(next) {
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(next * 100) / 100));
  try { localStorage.setItem(FONT_SCALE_KEY, String(clamped)); } catch {}
  ui = { ...ui, fontScale: clamped };
  emit();
}
export function increaseFontScale() { setFontScale(ui.fontScale + 0.05); }
export function decreaseFontScale() { setFontScale(ui.fontScale - 0.05); }

// a chart drill-down owns exactly one filter dimension — each must clear the others or a stale filter silently ANDs with the new one and zeros the result set
export function applyCategoryFilter(category) {
  setChartFilter(null);
  setFilters({ ...ui.filters, coordinator: '', category, source: '', dateFrom: '', dateTo: '' });
}
export function applySourceFilter(source, top) {
  if (source === 'سایر') {
    const topSet = new Set(top.filter((t) => t[0] !== 'سایر').map((t) => t[0]));
    setChartFilter({ type: 'otherSource', label: `منبع سرنخ: سایر منابع (غیر از ${topSet.size} مورد پرتکرار)`, topSet });
    setFilters({ ...ui.filters, coordinator: '', category: '', source: '', dateFrom: '', dateTo: '' });
  } else {
    setChartFilter(null);
    setFilters({ ...ui.filters, coordinator: '', category: '', source, dateFrom: '', dateTo: '' });
  }
}
export function applyMonthFilter(y, m, label) {
  setChartFilter({ type: 'month', y, m, label: `ماه: ${label}` });
  setFilters({ ...ui.filters, coordinator: '', category: '', source: '', dateFrom: '', dateTo: '' });
}
export function applyDayFilter(y, m, day, agent, label) {
  setChartFilter({ type: 'day', y, m, day, agent, label });
  setFilters({ ...ui.filters, coordinator: '', category: '', source: '', dateFrom: '', dateTo: '' });
}
export function setCoordinatorFilter(coordinator) {
  setFilters({ ...ui.filters, coordinator });
}
