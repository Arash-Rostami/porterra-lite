'use client';
import { useState, useEffect } from 'react';
import { useUiStore } from '../../lib/uiStore.js';
import { gregorianToJalali, JALALI_MONTHS, FA_MONTHS } from '../../lib/calendar.js';

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
const toFa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function tehranParts(d) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const p = (t) => parts.find((x) => x.type === t)?.value ?? '';
  let hh = p('hour');
  if (hh === '24') hh = '00';
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(p('year'), 10),
    month: parseInt(p('month'), 10),
    day: parseInt(p('day'), 10),
    hour: hh,
    minute: p('minute'),
    weekday: weekdayMap[p('weekday')] ?? 0,
  };
}

function formatDate(d, calendar) {
  const tp = tehranParts(d);
  const wd = WEEKDAYS[tp.weekday];
  if (calendar === 'jalali') {
    const [jy, jm, jd] = gregorianToJalali(tp.year, tp.month, tp.day);
    return `${wd}، ${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
  }
  return `${wd}، ${toFa(tp.day)} ${FA_MONTHS[tp.month - 1]} ${toFa(tp.year)}`;
}

function formatTime(d) {
  const tp = tehranParts(d);
  return toFa(String(tp.hour).padStart(2, '0') + ':' + String(tp.minute).padStart(2, '0'));
}

export default function DateTime() {
  const calendar = useUiStore((u) => u.calendar);
  const [now, setNow] = useState(null);
  useEffect(() => {
    // SSR-safe: server can't know the time, so initial state stays null (renders '—') and the
    // real value is only set client-side here — a lazy useState initializer would mismatch SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="crm-datetime" title={calendar === 'jalali' ? 'تقویم شمسی' : 'تقویم میلادی'}>
      <span className="crm-datetime-date">{now ? formatDate(now, calendar) : '—'}</span>
      <span className="crm-datetime-time">{now ? formatTime(now) : '—'}</span>
    </div>
  );
}