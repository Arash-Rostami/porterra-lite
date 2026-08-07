// display-only: dates are always STORED as Gregorian dd.mm.yyyy — this only affects rendering
export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const FA_MONTHS = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];

function div(a, b) { return Math.floor(a / b); }

export function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function formatDisplayDate(ddmmyyyy, calendar) {
  if (!ddmmyyyy || calendar !== 'jalali') return ddmmyyyy;
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return ddmmyyyy;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return ddmmyyyy;
  const [jy, jm, jd] = gregorianToJalali(y, m, d);
  return `${String(jd).padStart(2, '0')} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}
