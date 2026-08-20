'use client';
import { useStore, logout } from '../../lib/store.js';
import { LogoutIcon } from '../ui/Icon.jsx';

export default function UserMenu() {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return null;
  return (
    <div className="crm-user-menu">
      <button type="button" className="crm-theme-toggle crm-logout-btn" title="خروج" onClick={logout}>
        <LogoutIcon />
      </button>
    </div>
  );
}