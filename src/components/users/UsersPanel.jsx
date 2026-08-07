'use client';
import { PencilIcon, TrashIcon, PlusIcon, PowerIcon } from '../ui/Icon.jsx';
import { coordLabel } from '../../lib/filters.js';
import Utils from '../../lib/utils.js';
import { useUiStore } from '../../lib/uiStore.js';

const ROLE_LABELS = { admin: 'مدیر', developer: 'توسعه‌دهنده', agent: 'کارشناس' };

function RoleBadge({ role }) {
  return <span className={`crm-user-role -${role}`}>{ROLE_LABELS[role] || role}</span>;
}

function Row({ u, currentUserId, isElevated, onEdit, onToggle, onDelete }) {
  const isSelf = u.id === currentUserId;
  const canEdit = isElevated || isSelf;
  const calendar = useUiStore((u) => u.calendar);
  return (
    <tr>
      <td><span className="crm-company-text">{u.displayName || '-'}</span></td>
      <td><span className="crm-mono crm-user-username">{u.username}</span></td>
      <td className="crm-mono">{u.email || '—'}</td>
      <td>{u.agentCode ? coordLabel(u.agentCode) : '—'}</td>
      <td><RoleBadge role={u.role} /></td>
      <td><span className={`crm-status-badge ${u.active ? '-success' : '-none'}`}>{u.active ? 'فعال' : 'غیرفعال'}</span></td>
      <td className="crm-mono">{u.lastLogin ? Utils.formatTs(u.lastLogin, calendar) : '—'}</td>
      <td>
        {canEdit && <button type="button" className="crm-edit-btn" onClick={() => onEdit(u)}><PencilIcon />ویرایش</button>}
        {isElevated && <button type="button" className="crm-edit-btn" disabled={isSelf} onClick={() => onToggle(u)}><PowerIcon />{u.active ? 'غیرفعال‌کردن' : 'فعال‌کردن'}</button>}
        {isElevated && <button type="button" className="crm-delete-btn" disabled={isSelf} title={isSelf ? 'حذف حساب خودتان ممکن نیست' : 'حذف کاربر'} onClick={() => onDelete(u)}><TrashIcon />حذف</button>}
      </td>
    </tr>
  );
}

export default function UsersPanel({ users, loaded, currentUserId, isElevated, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">کاربران</div>
        <span className="crm-result-count">{users.length.toLocaleString('en-US')} کاربر</span>
        {isElevated && <button type="button" className="crm-btn-primary" style={{ marginInlineStart: 'auto' }} onClick={onAdd}><PlusIcon />افزودن کاربر</button>}
      </div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>نام نمایشی</th>
              <th>نام کاربری</th>
              <th>ایمیل</th>
              <th>کارشناس</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th>آخرین ورود</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loaded && users.length
              ? users.map((u) => <Row key={u.id} u={u} currentUserId={currentUserId} isElevated={isElevated} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />)
              : <tr><td colSpan={8}><div className="crm-empty">{loaded ? 'کاربری ثبت نشده است' : 'در حال بارگذاری…'}</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}