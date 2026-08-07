'use client';
import { useRef, useState } from 'react';
import { downloadImportTemplate, parseImportFile, countDuplicates } from '../../lib/excel.js';
import { toast } from '../ui/Toast.jsx';
import { UploadIcon, DownloadIcon } from '../ui/Icon.jsx';

export default function ImportExportBar({ records, onImport }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { imported, skipped, newRecords } = await parseImportFile(file);
      if (!imported) { toast('هیچ ردیف معتبری در فایل پیدا نشد'); return; }
      const dupCount = countDuplicates(records, newRecords);
      onImport(newRecords);
      let msg = `${imported.toLocaleString('en-US')} مخاطب وارد شد`;
      if (skipped) msg += ` — ${skipped.toLocaleString('en-US')} ردیف بدون نام شرکت رد شد`;
      if (dupCount) msg += ` — ${dupCount.toLocaleString('en-US')} مورد تکراری به نظر می‌رسد`;
      toast(msg);
    } catch {
      toast('خواندن فایل اکسل ممکن نشد — فرمت فایل را بررسی کنید');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="crm-theme-toggle" title="دانلود قالب اکسل" onClick={downloadImportTemplate}><DownloadIcon /></button>
      <button type="button" className="crm-theme-toggle" title="وارد کردن از اکسل" disabled={busy} onClick={() => fileRef.current?.click()}><UploadIcon /></button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
    </>
  );
}
