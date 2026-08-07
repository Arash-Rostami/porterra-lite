'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store.js';
import { listUsersAction, createUserAction, updateUserAction, setUserActiveAction, deleteUserAction } from '../../lib/apiClient.js';
import UsersPanel from '../../components/users/UsersPanel.jsx';
import UserFormModal from '../../components/users/UserFormModal.jsx';
import { toast } from '../../components/ui/Toast.jsx';

function isUnauthorized(err) {
  return err && (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN');
}
function cleanErr(err, fallback) {
  const m = err && err.message ? err.message : '';
  return m.startsWith('VALIDATION') ? m.replace('VALIDATION: ', '') : fallback;
}

export default function UsersPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const isElevated = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await listUsersAction();
      setUsers(res.users || []);
    } catch (err) {
      if (isUnauthorized(err)) { router.push('/login'); return; }
      toast('بارگذاری کاربران ناموفق بود');
    } finally {
      setLoaded(true);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(input) {
    try {
      await createUserAction(input);
      toast('کاربر جدید ثبت شد');
      setModalOpen(false);
      load();
    } catch (err) {
      if (isUnauthorized(err)) { router.push('/login'); return; }
      toast(cleanErr(err, 'ثبت ناموفق بود'));
    }
  }

  async function handleUpdate(id, patch) {
    try {
      await updateUserAction(id, patch);
      toast('کاربر به‌روز شد');
      setModalOpen(false);
      load();
    } catch (err) {
      if (isUnauthorized(err)) { router.push('/login'); return; }
      toast(cleanErr(err, 'به‌روزرسانی ناموفق بود'));
    }
  }

  async function handleToggle(user) {
    try {
      await setUserActiveAction(user.id, !user.active);
      toast(user.active ? 'کاربر غیرفعال شد' : 'کاربر فعال شد');
      load();
    } catch (err) {
      if (isUnauthorized(err)) { router.push('/login'); return; }
      toast('تغییر وضعیت ناموفق بود');
    }
  }

  async function handleDelete(user) {
    if (!confirm(`کاربر «${user.displayName || user.username}» برای همیشه حذف بشه؟`)) return;
    try {
      await deleteUserAction(user.id);
      toast('کاربر حذف شد');
      load();
    } catch (err) {
      if (isUnauthorized(err)) { router.push('/login'); return; }
      toast(err?.message === 'cannot delete self' ? 'حذف حساب خودتان ممکن نیست' : 'حذف ناموفق بود');
    }
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(user) { setEditing(user); setModalOpen(true); }

  return (
    <div className="crm-tab-panel" id="crmPanelUsers">
      <UsersPanel
        users={users}
        loaded={loaded}
        currentUserId={currentUser?.id}
        isElevated={isElevated}
        onAdd={openCreate}
        onEdit={openEdit}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      <UserFormModal
        open={modalOpen}
        user={editing}
        currentUserId={currentUser?.id}
        isElevated={isElevated}
        onSubmit={(payload) => (editing ? handleUpdate(editing.id, payload) : handleCreate(payload))}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}