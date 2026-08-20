'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getFiltered, coordLabel, coordClass, badgeClass, statusBadgeInfo } from '../../lib/filters.js';
import Utils from '../../lib/utils.js';
import { PencilIcon, TrashIcon, DownloadIcon, PlusIcon, FlagIcon, ArrowsUpDownIcon } from '../ui/Icon.jsx';
import { useUiStore, setFilters as setUiFilters } from '../../lib/uiStore.js';
import { useLeadPrefs, toggleFlag, setManualOrder, getOrderIndex } from '../../lib/leadPrefs.js';
import { formatDisplayDate } from '../../lib/calendar.js';
import ImportExportBar from './ImportExportBar.jsx';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import Pagination, { paginate } from '../ui/Pagination.jsx';

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

export default function LeadTable({ records, filters, chartFilter, onEdit, onDelete, onImport, onToggleAdd, addOpen, onExport, onSearchChange, title = 'سرنخ‌ها', recordNoun = 'سرنخ', addLabel = 'افزودن سرنخ جدید' }) {
  const router = useRouter();
  const calendar = useUiStore((u) => u.calendar);
  const { order, flags } = useLeadPrefs();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState({ key: 'date', dir: -1 });
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

  const { pageItems, totalPages, safePage } = paginate(list, page, perPage);

  function toggleSort(key) {
    setSort((s) => (s && s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 }));
    setPage(1);
  }
  function changePerPage(v) {
    setPerPage(v);
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
        <div className="crm-section-title">{title}</div>
        <div className="crm-result-count" id="crmResultCount">
          {list.length === records.length
            ? `${records.length.toLocaleString('en-US')} ${recordNoun}`
            : `${list.length.toLocaleString('en-US')} نتیجه از ${records.length.toLocaleString('en-US')}`}
        </div>
      </div>
      <div className="crm-toolbar">
        <CompanySuggest
          records={records}
          className="crm-input"
          id="crmSearch"
          autoComplete="off"
          value={filters.q}
          onChange={(v) => (onSearchChange || setUiFilters)({ ...filters, q: v })}
          placeholder="جست‌وجو در نام شرکت، مخاطب، تلفن، محصول و یادداشت..."
        />
        <div className="crm-table-actions">
          <button type="button" className={`crm-manual-toggle${manual ? ' -on' : ''}`}
                  title={manual ? 'پایان ترتیب دستی' : 'ترتیب دستی'} onClick={manual ? exitManual : enterManual}>
            <ArrowsUpDownIcon/>
          </button>
          <ImportExportBar records={records} onImport={onImport}/>
          <span className="crm-header-divider"/>
          <button type="button" className="crm-export-btn" onClick={onExport}><DownloadIcon/>خروجی اکسل</button>
          <button type="button" className="crm-add-btn" onClick={onToggleAdd}>
            <PlusIcon/>{addOpen ? 'بستن فرم' : addLabel}</button>
        </div>
      </div>
      {manual && <div className="crm-manual-hint">ترتیب دستی فعال — ردیف‌ها را با کشیدن مرتب کنید</div>}
      <div className="crm-table-wrap">
        <table className={`crm-table${manual ? ' -manual' : ''}`}>
        <thead>
            <tr>
              {SORT_COLUMNS.map((c) => (
                <th key={c.key} onClick={manual ? undefined : () => toggleSort(c.key)}>
                  {c.label}
                  {!manual && (sort?.key === c.key
                    ? (sort.dir === 1 ? ' ▲' : ' ▼')
                    : <ArrowsUpDownIcon width={11} height={11} className="crm-sort-hint-icon" />)}
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
                    {r.company ? (
                      <span
                        className="crm-company-text crm-company-link"
                        title="مشاهده گزارش این شرکت"
                        onClick={(e) => { e.stopPropagation(); router.push(`/company-report?company=${encodeURIComponent(r.company)}`); }}
                      >{r.company}</span>
                    ) : (
                      <span className="crm-company-text">-</span>
                    )}
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
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} perPage={perPage} onPerPage={changePerPage} />
    </div>
  );
}