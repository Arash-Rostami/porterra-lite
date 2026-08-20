'use client';
import { useMemo, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, ArrowsUpDownIcon } from '../ui/Icon.jsx';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';
import Pagination, { paginate } from '../ui/Pagination.jsx';

function Row({ c, isElevated, onEdit, onDelete }) {
  const calendar = useUiStore((u) => u.calendar);
  return (
    <tr>
      <td><span className="crm-company-text">{c.name}</span></td>
      <td><span className={`crm-status-badge ${c.isCustom ? '-success' : '-none'}`}>{c.isCustom ? 'سفارشی' : 'پایه'}</span></td>
      <td className="crm-mono">{c.createdAt ? Utils.formatTs(c.createdAt, calendar) : '—'}</td>
      <td>
        {isElevated && <button type="button" className="crm-edit-btn" onClick={() => onEdit(c)}><PencilIcon />ویرایش</button>}
        {isElevated && <button type="button" className="crm-delete-btn" onClick={() => onDelete(c)}><TrashIcon />حذف</button>}
      </td>
    </tr>
  );
}

export default function CategoriesPanel({ categories, loaded, isElevated, onAdd, onEdit, onDelete }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 });
  const filtered = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return categories;
    return categories.filter((c) => (c.name || '').toLowerCase().includes(query));
  }, [categories, q]);
  const sorted = useMemo(() => {
    if (sort.key !== 'createdAt') return filtered;
    return filtered.slice().sort((a, b) => ((a.createdAt || 0) - (b.createdAt || 0)) * sort.dir);
  }, [filtered, sort]);
  const { pageItems, totalPages, safePage } = paginate(sorted, page, perPage);

  function changeQuery(v) {
    setQ(v);
    setPage(1);
  }
  function changePerPage(v) {
    setPerPage(v);
    setPage(1);
  }
  function toggleSort() {
    setSort((s) => (s.key === 'createdAt' ? { key: 'createdAt', dir: s.dir * -1 } : { key: 'createdAt', dir: -1 }));
    setPage(1);
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">دسته‌بندی‌ها</div>
        <span className="crm-result-count">
          {filtered.length === categories.length
            ? `${categories.length.toLocaleString('en-US')} دسته‌بندی`
            : `${filtered.length.toLocaleString('en-US')} نتیجه از ${categories.length.toLocaleString('en-US')}`}
        </span>
      </div>
      <div className="crm-toolbar">
        <input className="crm-input crm-search-input" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی نام دسته‌بندی..." />
        <div className="crm-table-actions">
          <button type="button" className="crm-btn-primary" onClick={onAdd}><PlusIcon />افزودن دسته‌بندی</button>
        </div>
      </div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>نوع</th>
              <th onClick={toggleSort}>
                تاریخ ایجاد
                {sort.key === 'createdAt'
                  ? (sort.dir === 1 ? ' ▲' : ' ▼')
                  : <ArrowsUpDownIcon width={11} height={11} className="crm-sort-hint-icon" />}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loaded ? (
              <tr><td colSpan={4}><div className="crm-empty">در حال بارگذاری…</div></td></tr>
            ) : !categories.length ? (
              <tr><td colSpan={4}><div className="crm-empty">دسته‌بندی ثبت نشده است</div></td></tr>
            ) : !filtered.length ? (
              <tr><td colSpan={4}><div className="crm-empty">نتیجه‌ای پیدا نشد</div></td></tr>
            ) : pageItems.map((c) => <Row key={c.id} c={c} isElevated={isElevated} onEdit={onEdit} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} perPage={perPage} onPerPage={changePerPage} />
    </div>
  );
}