import Utils from './utils';
import { coordLabel, type LeadLike } from './filters';

export function findDuplicateCompany<T extends LeadLike>(records: T[], companyInput: string | null | undefined): string | null {
  const company = Utils.normSpace(companyInput).toLowerCase();
  if (company.length < 2) return null;
  const match = records.find((r) => r.company && Utils.normSpace(r.company).toLowerCase() === company);
  if (!match) return null;
  return `⚠️ قبلاً ${coordLabel(match.coordinator ?? '')} با «${match.company}» تماس گرفته${match.name ? ' (مخاطب: ' + match.name + ')' : ''} — تاریخ آخرین تماس: ${match.date || '-'}`;
}

export function findDuplicatePhone<T extends LeadLike>(records: T[], phoneInput: string | null | undefined): string | null {
  const phone = Utils.normalizePhone(phoneInput);
  if (phone.length < 6) return null;
  const tail = phone.slice(-8);
  const match = records.find((r) => r.phone && Utils.normalizePhone(r.phone).slice(-8) === tail);
  if (!match) return null;
  return `⚠️ این شماره قبلاً برای «${match.company || '-'}» توسط ${coordLabel(match.coordinator ?? '')} ثبت شده`;
}
