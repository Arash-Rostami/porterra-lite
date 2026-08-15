'use client';
import { PencilIcon, TrashIcon, PlusIcon } from '../ui/Icon.jsx';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';

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
  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">دسته‌بندی‌ها</div>
        <span className="crm-result-count">{categories.length.toLocaleString('en-US')} دسته‌بندی</span>
        <button type="button" className="crm-btn-primary" style={{ marginInlineStart: 'auto' }} onClick={onAdd}><PlusIcon />افزودن دسته‌بندی</button>
      </div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>نوع</th>
              <th>تاریخ ایجاد</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loaded && categories.length
              ? categories.map((c) => <Row key={c.id} c={c} isElevated={isElevated} onEdit={onEdit} onDelete={onDelete} />)
              : <tr><td colSpan={4}><div className="crm-empty">{loaded ? 'دسته‌بندی ثبت نشده است' : 'در حال بارگذاری…'}</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}