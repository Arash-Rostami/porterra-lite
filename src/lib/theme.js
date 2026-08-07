'use client';
import { useSyncExternalStore, useCallback } from 'react';

const THEME_STORAGE_KEY = 'crm_theme_pref_v1';
const DEFAULT_DARK = true;

export function chartGridColor(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(18,35,46,0.08)';
}
export function chartTextColor(dark) {
  return dark ? '#B9C7C2' : '#5C6B66';
}

// module-level so a toggle anywhere flips the class for every caller; per-component useState left /login and /dashboard stale
let darkState = DEFAULT_DARK;
let hydrated = false;
const listeners = new Set();

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') darkState = stored === 'dark';
  } catch {}
}

function subscribe(cb) {
  hydrate();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function getSnapshot() { return darkState; }
function getServerSnapshot() { return DEFAULT_DARK; }

function applyTheme(next) {
  darkState = next;
  try { localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light'); } catch {}
  listeners.forEach((l) => l());
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggleTheme = useCallback(() => applyTheme(!darkState), []);
  return { dark, toggleTheme };
}