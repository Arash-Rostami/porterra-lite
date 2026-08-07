'use client';
import { useStore, logout } from '../../lib/store.js';
import { useUiStore, setScope } from '../../lib/uiStore.js';
import { LogoutIcon } from '../ui/Icon.jsx';

export default function UserMenu() {
  const currentUser = useStore((s) => s.currentUser);
  const scope = useUiStore((u) => u.scope);
  if (!currentUser) return null;
  const canScope = !!currentUser.agentCode;
  return (
    <div className="crm-user-menu">
      {canScope && (
        <div className="crm-scope-toggle" role="group" aria-label="محدوده داده">
          <button
            type="button"
            className={`crm-scope-btn${scope === 'mine' ? ' -active' : ''}`}
            onClick={() => setScope('mine')}
          >
            اطلاعات من
          </button>
          <button
            type="button"
            className={`crm-scope-btn${scope === 'all' ? ' -active' : ''}`}
            onClick={() => setScope('all')}
          >
            همه
          </button>
        </div>
      )}
      <span className="crm-header-divider" />
      <button type="button" className="crm-theme-toggle crm-logout-btn" title="خروج" onClick={logout}>
        <LogoutIcon />
      </button>
    </div>
  );
}