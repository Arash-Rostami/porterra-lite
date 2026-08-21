import { describe, it, expect } from 'vitest';
import { gregorianToJalali, jalaliToGregorian, jalaliMonthLength, formatDisplayDate } from './calendar.js';

describe('gregorianToJalali / jalaliToGregorian', () => {
  it('round-trips a known Gregorian date through both conversions', () => {
    const [jy, jm, jd] = gregorianToJalali(2026, 3, 21);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    expect([gy, gm, gd]).toEqual([2026, 3, 21]);
  });

  it('round-trips a known Jalali date through both conversions', () => {
    const [gy, gm, gd] = jalaliToGregorian(1404, 1, 1);
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    expect([jy, jm, jd]).toEqual([1404, 1, 1]);
  });
});

describe('jalaliMonthLength', () => {
  it('returns 31 for each of the first 6 Jalali months', () => {
    for (let m = 1; m <= 6; m++) expect(jalaliMonthLength(1404, m)).toBe(31);
  });

  it('returns 30 for months 7-11', () => {
    for (let m = 7; m <= 11; m++) expect(jalaliMonthLength(1404, m)).toBe(30);
  });

  it('returns 29 or 30 for Esfand (month 12), consistent with a round-trip', () => {
    const len = jalaliMonthLength(1404, 12);
    expect([29, 30]).toContain(len);
    const [gy, gm, gd] = jalaliToGregorian(1404, 12, len);
    const [jy2, jm2, jd2] = gregorianToJalali(gy, gm, gd);
    expect([jy2, jm2, jd2]).toEqual([1404, 12, len]);
  });
});

describe('formatDisplayDate', () => {
  it('returns the input unchanged when calendar is not jalali', () => {
    expect(formatDisplayDate('21.03.2026', 'gregorian')).toBe('21.03.2026');
    expect(formatDisplayDate('21.03.2026', undefined)).toBe('21.03.2026');
  });

  it('converts to a Jalali display string matching gregorianToJalali directly', () => {
    const [jy, jm, jd] = gregorianToJalali(2026, 3, 21);
    const expected = `${String(jd).padStart(2, '0')} فروردین ${jy}`;
    expect(jm).toBe(1); // sanity check the fixture actually lands in فروردین
    expect(formatDisplayDate('21.03.2026', 'jalali')).toBe(expected);
  });

  it('returns the input unchanged for a malformed date string', () => {
    expect(formatDisplayDate('not-a-date', 'jalali')).toBe('not-a-date');
  });

  it('returns empty/falsy input unchanged', () => {
    expect(formatDisplayDate('', 'jalali')).toBe('');
    expect(formatDisplayDate(null, 'jalali')).toBe(null);
  });
});
