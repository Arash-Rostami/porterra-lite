'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store.js';

// isolated so the 1s tick re-renders only this component, not the whole Header
function relative(lastUpdated, now) {
  if (!lastUpdated) return 'در حال بارگذاری…';
  const diff = Math.max(0, now - lastUpdated);
  if (diff < 10000) return 'هم‌اکنون';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} ثانیه پیش`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعت پیش`;
  const d = Math.floor(h / 24);
  return `${d} روز پیش`;
}

export default function LastUpdatedLabel({ className }) {
  const lastUpdated = useStore((s) => s.lastUpdated);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const title = lastUpdated ? `آخرین به‌روزرسانی: ${new Date(lastUpdated).toLocaleTimeString('en-GB')}` : undefined;
  return <span className={className} title={title}>{relative(lastUpdated, now)}</span>;
}