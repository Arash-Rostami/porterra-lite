import * as XLSX from 'xlsx';
import Utils from './utils';
import { coordLabel, coordCodeFromLabel, effectiveResult } from './filters';

const IMPORT_ALIASES = {
  coordinator: ['coordinator', 'کارشناس', 'هماهنگ کننده', 'هماهنگ\u200cکننده'],
  company: ['company', 'شرکت', 'نام شرکت'],
  name: ['name', 'مخاطب', 'نام مخاطب', 'نام'],
  phone: ['phone', 'تلفن', 'شماره تلفن'],
  product: ['product', 'محصول'],
  category: ['product category', 'دسته محصول', 'دسته'],
  source: ['lead source', 'منبع سرنخ', 'منبع'],
  date: ['date of contact', 'تاریخ تماس', 'تاریخ'],
  price: ['last quoted price', 'آخرین قیمت اعلامی', 'قیمت'],
  result: ['result', 'نتیجه', 'وضعیت'],
  priority: ['priority', 'اولویت'],
  notes: ['notes', 'یادداشت'],
  converted: ['سرنخ تبدیل‌شده', 'converted'],
};

export function exportToExcel(records) {
  if (!records.length) return { ok: false, reason: 'empty' };
  const rows = records.map((r) => ({
    'کارشناس': r.coordinator ? coordLabel(r.coordinator) : '',
    'شرکت': r.company || '',
    'مخاطب': r.name || '',
    'تلفن': r.phone || '',
    'محصول': r.product || '',
    'دسته محصول': r.category || '',
    'منبع سرنخ': r.source || '',
    'تاریخ تماس': r.date || '',
    'آخرین قیمت اعلامی': r.price || '',
    'وضعیت': effectiveResult(r) || '',
    'اولویت': r.priority || '',
    'سرنخ تبدیل‌شده': r.converted ? 'بله' : 'خیر',
    'یادداشت': r.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'سرنخ‌ها');
  const today = new Date();
  const fname = 'سرنخ‌ها-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx';
  XLSX.writeFile(wb, fname);
  return { ok: true, count: records.length };
}

export function exportProductsToExcel(products) {
  if (!products.length) return { ok: false, reason: 'empty' };
  const rows = products.map((p) => ({
    'نام محصول': p.name || '',
    'دسته‌بندی': p.category || '',
    'تاریخ ثبت': p.createdAt ? Utils.formatTs(p.createdAt, 'gregorian') : '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'محصولات');
  const today = new Date();
  const fname = 'محصولات-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx';
  XLSX.writeFile(wb, fname);
  return { ok: true, count: products.length };
}

export function downloadImportTemplate() {
  const headers = ['کارشناس', 'شرکت', 'مخاطب', 'تلفن', 'محصول', 'دسته محصول', 'منبع سرنخ', 'تاریخ تماس', 'آخرین قیمت اعلامی', 'نتیجه', 'اولویت', 'سرنخ تبدیل‌شده', 'یادداشت'];
  const sample = [{
    'کارشناس': 'فرناز', 'شرکت': 'شرکت نمونه صنعت', 'مخاطب': 'آقای محمدی', 'تلفن': '09121234567',
    'محصول': 'PVC', 'دسته محصول': 'Polymer', 'منبع سرنخ': 'نمایشگاه', 'تاریخ تماس': '14.07.2026',
    'آخرین قیمت اعلامی': '', 'نتیجه': 'در حال پیگیری', 'اولویت': 'متوسط', 'سرنخ تبدیل‌شده': 'خیر',
    'یادداشت': 'این یک ردیف نمونه‌ست — پاکش کن و ردیف‌های خودت رو جایگزین کن',
  }];
  const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'سرنخ‌های جدید');
  XLSX.writeFile(wb, 'قالب-ورود-سرنخ.xlsx');
}

function findImportField(rowObj, aliases) {
  const keys = Object.keys(rowObj);
  for (const alias of aliases) {
    const found = keys.find((k) => k.toString().trim().toLowerCase() === alias);
    if (found && rowObj[found] !== null && rowObj[found] !== '' && rowObj[found] !== undefined) return rowObj[found];
  }
  return null;
}

function normalizeImportCoordinator(v) {
  if (v == null) return null;
  const s = String(v).trim();
  const fromLabel = coordCodeFromLabel(s);
  if (fromLabel) return fromLabel;
  if (s === 'فرناز') return 'FARNAZ';
  if (s === 'پردیس') return 'PARDIS';
  if (s === 'زهره') return 'ZOHREH';
  return s.toUpperCase() === 'FARNAZ' || s.toUpperCase() === 'PARDIS' || s.toUpperCase() === 'ZOHREH' ? s.toUpperCase() : s;
}

function normalizeImportDate(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    return String(v.getDate()).padStart(2, '0') + '.' + String(v.getMonth() + 1).padStart(2, '0') + '.' + v.getFullYear();
  }
  return String(v).trim();
}

function normalizeImportConverted(v) {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['بله', 'true', 'yes', '1', 'y'].includes(s);
}

// Legacy/alias free-text category names (from older exports or external sources) that should
// resolve to the same canonical category as 'Chemical/Polymer' — same mapping documented for
// the categories migration (Polymer/Petrochemical/Chemical -> CAT-chempoly).
const CATEGORY_ALIASES_OF_CHEMPOLY = ['polymer', 'petrochemical', 'chemical'];

// Called by the import UI after parseImportFile, with the live `categories` list — kept
// separate from parseImportFile itself (which returns data only, no store/categories access)
// so "read the file" stays decoupled from "resolve against current app state".
export function resolveImportCategoryIds(records, categories) {
  const catIndex = new Map(categories.map((c) => [Utils.normSpace(c.name).toLowerCase(), c.id]));
  const chemPolyId = catIndex.get('chemical/polymer');
  if (chemPolyId) {
    for (const alias of CATEGORY_ALIASES_OF_CHEMPOLY) catIndex.set(alias, chemPolyId);
  }
  return records.map((r) => {
    const { category, ...rest } = r;
    return { ...rest, categoryId: catIndex.get(Utils.normSpace(category || '').toLowerCase()) || null };
  });
}

export async function parseImportFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  let imported = 0, skipped = 0;
  const newRecords = [];
  for (const row of rows) {
    const company = findImportField(row, IMPORT_ALIASES.company);
    if (!company || !String(company).trim()) { skipped++; continue; }
    newRecords.push({
      id: 'IMP-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      converted: normalizeImportConverted(findImportField(row, IMPORT_ALIASES.converted)),
      coordinator: normalizeImportCoordinator(findImportField(row, IMPORT_ALIASES.coordinator)),
      company: String(company).trim(),
      name: findImportField(row, IMPORT_ALIASES.name),
      phone: findImportField(row, IMPORT_ALIASES.phone) != null ? String(findImportField(row, IMPORT_ALIASES.phone)).trim() : null,
      product: findImportField(row, IMPORT_ALIASES.product),
      category: findImportField(row, IMPORT_ALIASES.category),
      source: findImportField(row, IMPORT_ALIASES.source),
      date: normalizeImportDate(findImportField(row, IMPORT_ALIASES.date)),
      price: findImportField(row, IMPORT_ALIASES.price) != null ? String(findImportField(row, IMPORT_ALIASES.price)).trim() : null,
      result: findImportField(row, IMPORT_ALIASES.result),
      priority: findImportField(row, IMPORT_ALIASES.priority),
      notes: findImportField(row, IMPORT_ALIASES.notes),
    });
    imported++;
  }
  return { imported, skipped, newRecords };
}

export function countDuplicates(existingRecords, newRecords) {
  const existingCompanies = new Set(existingRecords.map((r) => Utils.normSpace(r.company).toLowerCase()));
  return newRecords.filter((r) => existingCompanies.has(Utils.normSpace(r.company).toLowerCase())).length;
}
