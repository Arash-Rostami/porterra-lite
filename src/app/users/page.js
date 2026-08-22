'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { listUsersAction, createUserAction, updateUserAction, setUserActiveAction, deleteUserAction, listDepartmentsAction } from '../../lib/apiClient';
import UsersPanel from '../../components/users/UsersPanel.jsx';
import UserFormModal from '../../components/users/UserFormModal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { confirm } from '../../lib/confirm';

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
  const [departments, setDepartments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await listDepartmentsAction();
      setDepartments(res.departments || []);
    } catch {
    }
  }, []);

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

  // Standard fetch-on-mount — no non-effect alternative for loading data from a REST API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); loadDepartments(); }, [load, loadDepartments]);

  async function handleCreate(input) {
    try {
      await createUserAction(input);
      toast('کاربر جدید ثبت شد');
      setModalOpen(false);
      load();
      loadDepartments();
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
      loadDepartments();
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
    const ok = await confirm({
      title: 'حذف کاربر',
      message: `کاربر «${user.displayName || user.username}» برای همیشه حذف بشه؟`,
      confirmText: 'حذف',
    });
    if (!ok) return;
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
        departments={departments}
        onSubmit={(payload) => (editing ? handleUpdate(editing.id, payload) : handleCreate(payload))}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}