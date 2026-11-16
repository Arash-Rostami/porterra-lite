import { isCall } from './companies.js';
import { matchesFilter } from './filters.js';
import { gregorianToJalali, jalaliToGregorian, jalaliMonthLength } from './calendar.js';

const pad2 = (n) => String(n).padStart(2, '0');

export const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function buildDayIndex(records, reminders, agent) {
  const days = new Map();
  const day = (iso) => {
    let d = days.get(iso);
    if (!d) days.set(iso, (d = { reminders: [], calls: [] }));
    return d;
  };
  for (const rm of reminders) {
    if (rm.done || !rm.dueDate || !matchesFilter(rm.forAgent, agent)) continue;
    day(rm.dueDate).reminders.push(rm);
  }
  for (const r of records) {
    if (!r.date || !isCall(r) || !matchesFilter(r.coordinator, agent)) continue;
    const [d, m, y] = r.date.split('.');
    if (y && m && d) day(`${y.length === 2 ? '20' + y : y}-${pad2(m)}-${pad2(d)}`).calls.push(r);
  }
  return days;
}

function saturdayOffset(d) {
  return (d.getDay() + 1) % 7;
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function periodOf(cursor, view, jalali) {
  if (view === 'day') return { cells: [cursor], monthKey: null };
  if (view === 'week') {
    const start = addDays(cursor, -saturdayOffset(cursor));
    return { cells: Array.from({ length: 7 }, (_, i) => addDays(start, i)), monthKey: null };
  }
  let first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  if (jalali) {
    const [cy, cm] = gregorianToJalali(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const [gy, gm, gd] = jalaliToGregorian(cy, cm, 1);
    first = new Date(gy, gm - 1, gd);
  }
  const [jy, jm] = gregorianToJalali(first.getFullYear(), first.getMonth() + 1, first.getDate());
  const length = jalali ? jalaliMonthLength(jy, jm) : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const start = addDays(first, -saturdayOffset(first));
  const rows = Math.ceil((saturdayOffset(first) + length) / 7);
  return {
    cells: Array.from({ length: rows * 7 }, (_, i) => addDays(start, i)),
    monthKey: jalali ? `${jy}-${jm}` : `${first.getFullYear()}-${first.getMonth()}`,
  };
}

export function stepCursor(cursor, view, jalali, dir) {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addDays(cursor, 7 * dir);
  if (jalali) {
    const [jy, jm] = gregorianToJalali(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const total = jy * 12 + (jm - 1) + dir;
    const [gy, gm, gd] = jalaliToGregorian(Math.floor(total / 12), (total % 12) + 1, 1);
    return new Date(gy, gm - 1, gd);
  }
  return new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
}

export function cellLabel(date, jalali) {
  if (!jalali) return date.getDate();
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate())[2];
}

export function monthKeyOf(date, jalali) {
  if (!jalali) return `${date.getFullYear()}-${date.getMonth()}`;
  const [jy, jm] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${jy}-${jm}`;
}
