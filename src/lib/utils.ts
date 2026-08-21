import { gregorianToJalali, JALALI_MONTHS } from './calendar.js';

export type Calendar = 'gregorian' | 'jalali';

export default class Utils {
  static normSpace(s: unknown): string {
    return (s || '').toString().replace(/\s+/g, ' ').trim();
  }

  static normalizePhone(s: string | null | undefined): string {
    if (!s) return '';
    let out = String(s)
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    const plus = /^\s*\+/.test(String(s)) ? '+' : '';
    return plus + out.replace(/[^0-9]/g, '');
  }

  static parseDate(str: string | null | undefined): Date | null {
    if (!str) return null;
    const parts = str.split('.');
    if (parts.length !== 3) return null;
    let [d, m, y] = parts.map((p) => parseInt(p, 10));
    if (!d || !m || !y) return null;
    if (y < 100) y += 2000;
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return null;
    return dt;
  }

  static toISODate(ddmmyyyy: string | null | undefined): string {
    const dt = Utils.parseDate(ddmmyyyy);
    if (!dt) return '';
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }

  static todayDdMmYyyy(): string {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  static fromISODate(iso: string | null | undefined): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts.map((p) => parseInt(p, 10));
    if (!y || !m || !d) return '';
    return String(d).padStart(2, '0') + '.' + String(m).padStart(2, '0') + '.' + y;
  }

  static formatTs(ts: number | string | null | undefined, calendar?: Calendar): string {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (calendar === undefined) calendar = 'jalali';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(n));
    const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
    const gy = parseInt(p('year'), 10);
    const gm = parseInt(p('month'), 10);
    const gd = parseInt(p('day'), 10);
    let hh = p('hour');
    if (hh === '24') hh = '00';
    const mm = p('minute');
    if (calendar !== 'jalali') {
      return String(gd).padStart(2, '0') + '.' + String(gm).padStart(2, '0') + '.' + gy + ' — ' + hh + ':' + mm;
    }
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    return String(jd).padStart(2, '0') + ' ' + JALALI_MONTHS[jm - 1] + ' ' + jy + ' — ' + hh + ':' + mm;
  }
}
