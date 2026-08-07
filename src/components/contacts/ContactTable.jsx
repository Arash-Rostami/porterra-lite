'use client';
import { useState, useMemo } from 'react';
import { getFiltered, coordLabel, coordClass, badgeClass, statusBadgeInfo } from '../../lib/filters.js';
import Utils from '../../lib/utils.js';
import Dropdown from '../ui/Dropdown.jsx';
import { PencilIcon, TrashIcon, DownloadIcon, PlusIcon, FlagIcon, ArrowsUpDownIcon } from '../ui/Icon.jsx';
import { useUiStore } from '../../lib/uiStore.js';
import { useContactPrefs, toggleFlag, setManualOrder, getOrderIndex } from '../../lib/contactPrefs.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import ImportExportBar from './ImportExportBar.jsx';

const PAGE_SIZE_OPTS = ['10', '20', '50', '100'];
const SORT_COLUMNS = [
  { key: 'coordinator', label: 'کارشناس' },
  { key: 'company', label: 'شرکت' },
  { key: 'product', label: 'محصول' },
  { key: 'category', label: 'دسته' },
  { key: 'source', label: 'منبع' },
  { key: 'date', label: 'تاریخ' },
  { key: 'result', label: 'وضعیت' },
  { key: 'notes', label: 'یادداشت' },
];

function StatusBadge({ r }) {
  const { text, className } = statusBadgeInfo(r);
  return <span className={`crm-status-badge ${className}`}>{text}</span>;
}

export default function ContactTable({ records, filters, chartFilter, onEdit, onDelete, onImport, onToggleAdd, addOpen, onExport }) {
  const calendar = useUiStore((u) => u.calendar);
  const { order, flags } = useContactPrefs();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState(null);
  const [sortMode, setSortMode] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const flagSet = useMemo(() => new Set(flags), [flags]);

  const list = useMemo(() => {
    const base = getFiltered(records, filters, chartFilter, sortMode === 'manual' ? null : sort);
    if (sortMode !== 'manual') return base;
    const idx = getOrderIndex(order);
    const ranked = [];
    const unranked = [];
    for (const r of base) (idx.has(r.id) ? ranked : unranked).push(r);
    ranked.sort((a, b) => idx.get(a.id) - idx.get(b.id));
    return ranked.concat(unranked);
  }, [records, filters, chartFilter, sort, sortMode, order]);

  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageItems = list.slice(startIdx, startIdx + perPage);

  function toggleSort(key) {
    setSort((s) => (s && s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 }));
  }
  function changePerPage(v) {
    setPerPage(parseInt(v, 10) || 20);
    setPage(1);
  }
  function enterManual() {
    if (!order.length) setManualOrder(getFiltered(records, filters, chartFilter, null).map((r) => r.id));
    setSortMode('manual');
  }
  function exitManual() {
    setSortMode(null);
    setDragId(null);
    setDragOver(null);
  }

  function onDragStart(e, r) {
    setDragId(r.id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', r.id); } catch {}
  }
  function onDragOver(e, r) {
    if (sortMode !== 'manual' || !dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOver({ id: r.id, before: e.clientY - rect.top < rect.height / 2 });
  }
  function onDrop(e, r) {
    e.preventDefault();
    if (sortMode !== 'manual' || !dragId || dragId === r.id) { setDragId(null); setDragOver(null); return; }
    const before = dragOver && dragOver.id === r.id ? dragOver.before : true;
    let next = order.length ? order.slice() : list.map((x) => x.id);
    if (!next.includes(dragId)) next.push(dragId);
    if (!next.includes(r.id)) next.push(r.id);
    next = next.filter((id) => id !== dragId);
    const ti = next.indexOf(r.id);
    next.splice(before ? ti : ti + 1, 0, dragId);
    setManualOrder(next);
    setDragId(null);
    setDragOver(null);
  }
  function onDragEnd() {
    setDragId(null);
    setDragOver(null);
  }

  function rowClass(r) {
    const parts = [];
    if (flagSet.has(r.id)) parts.push('crm-row-flagged');
    if (dragId === r.id) parts.push('crm-row-dragging');
    if (dragOver && dragOver.id === r.id) {
      parts.push('crm-row-dragover', dragOver.before ? '-drop-before' : '-drop-after');
    }
    return parts.join(' ');
  }

  const manual = sortMode === 'manual';

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">مخاطبین</div>
        <div className="crm-result-count" id="crmResultCount">
          {list.length.toLocaleString('en-US')} نتیجه از {records.length.toLocaleString('en-US')}
        </div>
        <div className="crm-table-actions">
          <button type="button" className={`crm-manual-toggle${manual ? ' -on' : ''}`}
                  title={manual ? 'پایان ترتیب دستی' : 'ترتیب دستی'} onClick={manual ? exitManual : enterManual}>
            <ArrowsUpDownIcon/>
          </button>
          <ImportExportBar records={records} onImport={onImport}/>
          <span className="crm-header-divider"/>
          <button type="button" className="crm-export-btn" onClick={onExport}><DownloadIcon/>خروجی اکسل</button>
          <button type="button" className="crm-add-btn" onClick={onToggleAdd}>
            <PlusIcon/>{addOpen ? 'بستن فرم' : 'افزودن مشتری جدید'}</button>
        </div>
      </div>
      {manual && <div className="crm-manual-hint">ترتیب دستی فعال — ردیف‌ها را با کشیدن مرتب کنید</div>}
      <div className="crm-table-wrap">
        <table className={`crm-table${manual ? ' -manual' : ''}`}>
        <thead>
            <tr>
              {SORT_COLUMNS.map((c) => (
                <th key={c.key} onClick={manual ? undefined : () => toggleSort(c.key)}>
                  {c.label}{!manual && sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody id="crmTableBody">
            {pageItems.length
              ? pageItems.map((r) => (
                <tr
                  key={r.id}
                  className={rowClass(r)}
                  draggable={manual}
                  onDragStart={(e) => onDragStart(e, r)}
                  onDragOver={(e) => onDragOver(e, r)}
                  onDrop={(e) => onDrop(e, r)}
                  onDragEnd={onDragEnd}
                >
                  <td><span className={`crm-coord-tag ${coordClass(r.coordinator)}`}>{r.coordinator ? coordLabel(r.coordinator) : '-'}</span></td>
                  <td>
                    {r.converted && <span className="crm-customer-badge">مشتری</span>}
                    <span className="crm-company-text">{r.company || '-'}</span>
                  </td>
                  <td className="crm-product-text">{r.product || '-'}</td>
                  <td><span className={`crm-badge ${badgeClass(r.category)}`}>{r.category || 'نامشخص'}</span></td>
                  <td className="crm-source-text">{Utils.normSpace(r.source) || '-'}</td>
                  <td className="crm-mono crm-date-text">{formatDisplayDate(r.date, calendar) || '-'}</td>
                  <td className="crm-status-holder"><StatusBadge r={r} /></td>
                  <td className="crm-notes-cell">
                    <div className="crm-notes-text" onClick={(e) => e.currentTarget.classList.toggle('-expanded')}>{r.notes || '-'}</div>
                  </td>
                  <td>
                    <button type="button" className={`crm-flag-btn${flagSet.has(r.id) ? ' -on' : ''}`} title="علامت‌گذاری مهم" onClick={() => toggleFlag(r.id)}><FlagIcon /></button>
                    <button type="button" className="crm-edit-btn" onClick={() => onEdit(r.id)}><PencilIcon />ویرایش</button>
                    <button type="button" className="crm-delete-btn" title="حذف این تماس" onClick={() => onDelete(r.id)}><TrashIcon />حذف</button>
                  </td>
                </tr>
              ))
              : <tr><td colSpan={9}><div className="crm-empty">نتیجه‌ای پیدا نشد — عبارت جست‌وجو یا فیلترها را تغییر دهید</div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="crm-pagination-row">
        <div className="crm-page-size">
          <span>تعداد نمایش در صفحه:</span>
          <Dropdown value={String(perPage)} onChange={changePerPage} options={PAGE_SIZE_OPTS} placeholder="20" />
        </div>
        <div className="crm-pagination" id="crmPagination">
          <button className="crm-page-btn" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</button>
          <span className="crm-page-info">صفحه {safePage} از {totalPages}</span>
          <button className="crm-page-btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</button>
        </div>
      </div>
    </div>
  );
}