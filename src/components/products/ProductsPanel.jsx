'use client';
import { useMemo, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, DownloadIcon, ArrowsUpDownIcon } from '../ui/Icon.jsx';
import { badgeClass } from '../../lib/filters';
import { exportProductsToExcel } from '../../lib/excel';
import { toast } from '../ui/Toast.jsx';
import Utils from '../../lib/utils';
import { useUiStore } from '../../lib/uiStore';
import Pagination, { paginate } from '../ui/Pagination.jsx';

function Row({ p, isElevated, onEdit, onDelete }) {
  const calendar = useUiStore((u) => u.calendar);
  return (
    <tr>
      <td><span className="crm-company-text">{p.name}</span></td>
      <td><span className={`crm-badge ${badgeClass(p.category)}`}>{p.category || 'نامشخص'}</span></td>
      <td className="crm-mono">{p.createdAt ? Utils.formatTs(p.createdAt, calendar) : '—'}</td>
      <td>
        {isElevated && <button type="button" className="crm-edit-btn" onClick={() => onEdit(p)}><PencilIcon />ویرایش</button>}
        {isElevated && <button type="button" className="crm-delete-btn" onClick={() => onDelete(p)}><TrashIcon />حذف</button>}
      </td>
    </tr>
  );
}

export default function ProductsPanel({ products, loaded, isElevated, onAdd, onEdit, onDelete }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 });
  const filtered = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return products;
    return products.filter((p) => (p.name || '').toLowerCase().includes(query) || (p.category || '').toLowerCase().includes(query));
  }, [products, q]);
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

  function handleExport() {
    const res = exportProductsToExcel(products);
    toast(res.ok ? `${res.count.toLocaleString('en-US')} محصول در فایل اکسل ذخیره شد` : 'محصولی برای خروجی گرفتن نیست');
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">محصولات</div>
        <span className="crm-result-count">
          {filtered.length === products.length
            ? `${products.length.toLocaleString('en-US')} محصول`
            : `${filtered.length.toLocaleString('en-US')} نتیجه از ${products.length.toLocaleString('en-US')}`}
        </span>
      </div>
      <div className="crm-toolbar">
        <input className="crm-input crm-search-input" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی نام محصول یا دسته‌بندی..." />
        <div className="crm-table-actions">
          <button type="button" className="crm-export-btn" onClick={handleExport}><DownloadIcon />خروجی اکسل</button>
          <button type="button" className="crm-btn-primary" onClick={onAdd}><PlusIcon />افزودن محصول</button>
        </div>
      </div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>نام محصول</th>
              <th>دسته‌بندی</th>
              <th onClick={toggleSort}>
                تاریخ ثبت
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
            ) : !products.length ? (
              <tr><td colSpan={4}><div className="crm-empty">محصولی ثبت نشده است</div></td></tr>
            ) : !filtered.length ? (
              <tr><td colSpan={4}><div className="crm-empty">نتیجه‌ای پیدا نشد</div></td></tr>
            ) : pageItems.map((p) => <Row key={p.id} p={p} isElevated={isElevated} onEdit={onEdit} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} perPage={perPage} onPerPage={changePerPage} />
    </div>
  );
}
