import Utils from './utils.js';
import { companyKey, isCall } from './companies.js';

export const UNKNOWN_PRODUCT = 'نامشخص';

const squash = (s) => ` ${Utils.normText(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

export function makeProductMatcher(names) {
  const keyed = names
    .map((name) => ({ name, k: squash(name) }))
    .filter((x) => x.k.trim())
    .sort((a, b) => b.k.length - a.k.length);
  const cache = new Map();
  return (text) => {
    if (!text || !String(text).trim()) return [UNKNOWN_PRODUCT];
    let found = cache.get(text);
    if (!found) {
      let hay = squash(text);
      found = [];
      for (const { name, k } of keyed) {
        if (!hay.includes(k)) continue;
        found.push(name);
        hay = hay.split(k).join(' ');
      }
      if (!found.length) found.push(UNKNOWN_PRODUCT);
      cache.set(text, found);
    }
    return found;
  };
}

export function productStats(records, names) {
  const match = makeProductMatcher(names);
  const byCompany = new Map();
  const total = new Map();
  for (const r of records) {
    if (!isCall(r)) continue;
    const key = companyKey(r.company);
    if (!key) continue;
    let per = byCompany.get(key);
    if (!per) byCompany.set(key, (per = Object.create(null)));
    for (const p of match(r.product)) {
      per[p] = (per[p] || 0) + 1;
      total.set(p, (total.get(p) || 0) + 1);
    }
  }
  return { byCompany, total };
}

export function productColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h},45%,42%)`;
}
