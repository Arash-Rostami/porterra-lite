'use client';
import { useSyncExternalStore, useEffect } from 'react';

let message = null;
let timer = null;
let lastShown = 0;
const listeners = new Set();
function emit() { for (const l of listeners) l(); }

export function toast(msg) {
  message = msg;
  lastShown = Date.now();
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => { message = null; emit(); }, 2600);
}

export function toastShownRecently(windowMs = 600) {
  return Date.now() - lastShown < windowMs;
}

export function useToast() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => message,
    () => null,
  );
}

export function Toast() {
  const msg = useToast();
  return <div className={`crm-toast${msg ? ' -show' : ''}`} id="crmToast">{msg}</div>;
}
