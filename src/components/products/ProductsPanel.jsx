'use client';
import { PencilIcon, TrashIcon, PlusIcon, DownloadIcon } from '../ui/Icon.jsx';
import { badgeClass } from '../../lib/filters.js';
import { exportProductsToExcel } from '../../lib/excel.js';
import { toast } from '../ui/Toast.jsx';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';

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
  function handleExport() {
    const res = exportProductsToExcel(products);
    toast(res.ok ? `${res.count.toLocaleString('en-US')} محصول در فایل اکسل ذخیره شد` : 'محصولی برای خروجی گرفتن نیست');
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">محصولات</div>
        <span className="crm-result-count">{products.length.toLocaleString('en-US')} محصول</span>
        <div className="crm-table-actions" style={{ marginInlineStart: 'auto' }}>
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
              <th>تاریخ ثبت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loaded && products.length
              ? products.map((p) => <Row key={p.id} p={p} isElevated={isElevated} onEdit={onEdit} onDelete={onDelete} />)
              : <tr><td colSpan={4}><div className="crm-empty">{loaded ? 'محصولی ثبت نشده است' : 'در حال بارگذاری…'}</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
