'use client';
import { useMemo, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, PowerIcon, ArrowsUpDownIcon } from '../ui/Icon.jsx';
import { coordLabel } from '../../lib/filters';
import Utils from '../../lib/utils';
import { useUiStore } from '../../lib/uiStore';
import Pagination, { paginate } from '../ui/Pagination.jsx';

const ROLE_LABELS = { admin: 'مدیر', developer: 'توسعه‌دهنده', manager: 'سرپرست بخش', agent: 'کارشناس' };

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
      <td>{u.department || '—'}</td>
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
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState({ key: 'lastLogin', dir: -1 });
  const filtered = useMemo(() => {
    const query = Utils.normSpace(q).toLowerCase();
    if (!query) return users;
    return users.filter((u) => [u.displayName, u.username, u.email].some((v) => (v || '').toLowerCase().includes(query)));
  }, [users, q]);
  const sorted = useMemo(() => {
    if (sort.key !== 'lastLogin') return filtered;
    return filtered.slice().sort((a, b) => ((a.lastLogin || 0) - (b.lastLogin || 0)) * sort.dir);
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
    setSort((s) => (s.key === 'lastLogin' ? { key: 'lastLogin', dir: s.dir * -1 } : { key: 'lastLogin', dir: -1 }));
    setPage(1);
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">کاربران</div>
        <span className="crm-result-count">
          {filtered.length === users.length
            ? `${users.length.toLocaleString('en-US')} کاربر`
            : `${filtered.length.toLocaleString('en-US')} نتیجه از ${users.length.toLocaleString('en-US')}`}
        </span>
      </div>
      <div className="crm-toolbar">
        <input className="crm-input crm-search-input" value={q} onChange={(e) => changeQuery(e.target.value)} placeholder="جست‌وجوی نام، نام کاربری یا ایمیل..." />
        {isElevated && (
          <div className="crm-table-actions">
            <button type="button" className="crm-btn-primary" onClick={onAdd}><PlusIcon />افزودن کاربر</button>
          </div>
        )}
      </div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>نام نمایشی</th>
              <th>نام کاربری</th>
              <th>ایمیل</th>
              <th>کارشناس</th>
              <th>بخش</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th onClick={toggleSort}>
                آخرین ورود
                {sort.key === 'lastLogin'
                  ? (sort.dir === 1 ? ' ▲' : ' ▼')
                  : <ArrowsUpDownIcon width={11} height={11} className="crm-sort-hint-icon" />}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loaded ? (
              <tr><td colSpan={9}><div className="crm-empty">در حال بارگذاری…</div></td></tr>
            ) : !users.length ? (
              <tr><td colSpan={9}><div className="crm-empty">کاربری ثبت نشده است</div></td></tr>
            ) : !filtered.length ? (
              <tr><td colSpan={9}><div className="crm-empty">نتیجه‌ای پیدا نشد</div></td></tr>
            ) : pageItems.map((u) => <Row key={u.id} u={u} currentUserId={currentUserId} isElevated={isElevated} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} onPage={setPage} perPage={perPage} onPerPage={changePerPage} />
    </div>
  );
}