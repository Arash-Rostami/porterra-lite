'use client';
import { useSyncExternalStore } from 'react';

const ORDER_KEY = (username) => `crm_lead_order_${username}`;
const FLAGS_KEY = (username) => `crm_lead_flags_${username}`;

let prefsUser = null;
let prefs = { order: [], flags: [] };
const listeners = new Set();
function emit() { for (const l of listeners) l(); }

function readArray(key) {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v.map(String) : [];
  } catch { return []; }
}

export function initLeadPrefsForUser(username) {
  prefsUser = username;
  prefs = {
    order: readArray(ORDER_KEY(username)),
    flags: readArray(FLAGS_KEY(username)),
  };
  emit();
}

export function resetLeadPrefs() {
  prefsUser = null;
  prefs = { order: [], flags: [] };
  emit();
}

export function useLeadPrefs() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => prefs,
    () => prefs,
  );
}

function persist(key, value) {
  if (!prefsUser) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function toggleFlag(id) {
  const set = new Set(prefs.flags);
  if (set.has(id)) set.delete(id); else set.add(id);
  const flags = Array.from(set);
  persist(FLAGS_KEY(prefsUser), flags);
  prefs = { ...prefs, flags };
  emit();
}

export function setManualOrder(order) {
  const next = order.map(String);
  persist(ORDER_KEY(prefsUser), next);
  prefs = { ...prefs, order: next };
  emit();
}

export function getOrderIndex(order) {
  const m = new Map();
  for (let i = 0; i < order.length; i++) m.set(String(order[i]), i);
  return m;
}