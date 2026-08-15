import Utils from '../../lib/utils.js';

export default function PhoneLink({ phone, className = 'crm-mono' }) {
  if (!phone) return null;
  const href = Utils.normalizePhone(phone);
  if (!href) return <span className={className}>{phone}</span>;
  return <a className={className} href={`tel:${href}`} dir="ltr">{phone}</a>;
}