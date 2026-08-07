'use client';
import { useSyncExternalStore } from 'react';

// promise-based confirm so any handler can `await confirm({...})` for a real modal (ui/Modal.jsx) instead of native confirm()
let state = { open: false, title: '', message: '', confirmText: 'تأیید', cancelText: 'انصراف', tone: 'danger' };
let resolver = null;
const listeners = new Set();
function emit() { for (const l of listeners) l(); }

export function useConfirmState() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state,
  );
}

export function confirm(options = {}) {
  return new Promise((resolve) => {
    resolver = resolve;
    state = {
      open: true,
      title: options.title || 'تأیید',
      message: options.message || '',
      confirmText: options.confirmText || 'تأیید',
      cancelText: options.cancelText || 'انصراف',
      tone: options.tone || 'danger',
    };
    emit();
  });
}

export function answerConfirm(val) {
  if (resolver) { resolver(val); resolver = null; }
  state = { ...state, open: false };
  emit();
}