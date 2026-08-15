'use client';
import { useUiStore } from '../../lib/uiStore.js';
import Dropdown from './Dropdown.jsx';
import { gregorianToJalali, jalaliToGregorian, jalaliMonthLength, JALALI_MONTHS } from '../../lib/calendar.js';

const pad2 = (n) => String(n).padStart(2, '0');
const MONTH_OPTS = JALALI_MONTHS.map((label, i) => ({ value: String(i + 1), label }));

function isoToJalali(iso) {
  if (!iso) return { jy: '', jm: '', jd: '' };
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return { jy: '', jm: '', jd: '' };
  const [jy, jm, jd] = gregorianToJalali(y, m, d);
  return { jy, jm, jd };
}

function currentJalaliYear() {
  const now = new Date();
  const [jy] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return jy;
}

export default function DateField({ value, onChange, className }) {
  const calendar = useUiStore((u) => u.calendar);

  if (calendar !== 'jalali') {
    return <input type="date" className={className} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }

  const { jy, jm, jd } = isoToJalali(value);
  const baseYear = currentJalaliYear();
  const yearOpts = Array.from({ length: 16 }, (_, i) => String(baseYear + 3 - i));
  const dayCount = jy && jm ? jalaliMonthLength(jy, jm) : 31;
  const dayOpts = Array.from({ length: dayCount }, (_, i) => String(i + 1));

  function emit(nextJy, nextJm, nextJd) {
    if (!nextJy || !nextJm || !nextJd) { onChange(''); return; }
    const maxDay = jalaliMonthLength(nextJy, nextJm);
    const clampedD = Math.min(nextJd, maxDay);
    const [gy, gm, gd] = jalaliToGregorian(nextJy, nextJm, clampedD);
    onChange(`${gy}-${pad2(gm)}-${pad2(gd)}`);
  }

  return (
    <div className="crm-jalali-date">
      <Dropdown value={jd ? String(jd) : ''} onChange={(v) => emit(jy || baseYear, jm || 1, v ? parseInt(v, 10) : '')} options={dayOpts} placeholder="روز" />
      <Dropdown value={jm ? String(jm) : ''} onChange={(v) => emit(jy || baseYear, v ? parseInt(v, 10) : '', jd || 1)} options={MONTH_OPTS} placeholder="ماه" />
      <Dropdown value={jy ? String(jy) : ''} onChange={(v) => emit(v ? parseInt(v, 10) : '', jm || 1, jd || 1)} options={yearOpts} placeholder="سال" />
    </div>
  );
}
