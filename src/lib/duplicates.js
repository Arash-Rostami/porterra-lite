import Utils from './utils.js';
import { coordLabel } from './filters.js';

export function findDuplicateCompany(records, companyInput) {
  const company = Utils.normSpace(companyInput).toLowerCase();
  if (company.length < 2) return null;
  const match = records.find((r) => r.company && Utils.normSpace(r.company).toLowerCase() === company);
  if (!match) return null;
  return `⚠️ قبلاً ${coordLabel(match.coordinator)} با «${match.company}» تماس گرفته${match.name ? ' (مخاطب: ' + match.name + ')' : ''} — تاریخ آخرین تماس: ${match.date || '-'}`;
}

export function findDuplicatePhone(records, phoneInput) {
  const phone = (phoneInput || '').replace(/\D/g, '');
  if (phone.length < 6) return null;
  const tail = phone.slice(-8);
  const match = records.find((r) => r.phone && r.phone.replace(/\D/g, '').slice(-8) === tail);
  if (!match) return null;
  return `⚠️ این شماره قبلاً برای «${match.company || '-'}» توسط ${coordLabel(match.coordinator)} ثبت شده`;
}
