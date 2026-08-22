'use client';
import { useStore, syncNow } from '../../lib/store';
import { ArrowsRightLeftIcon } from '../ui/Icon.jsx';

// badge surfaces pending changes (queueCount) or offline state even when nothing is queued
export default function SyncButton() {
  const queueCount = useStore((s) => s.queueCount);
  const offline = useStore((s) => s.offline);
  const syncing = useStore((s) => s.syncing);
  const showBadge = queueCount > 0 || offline;
  const title = offline
    ? (queueCount > 0 ? `حالت آفلاین — ${queueCount} تغییر در انتظار همگام‌سازی` : 'حالت آفلاین — پایگاه داده در دسترس نیست')
    : 'همگام‌سازی با پایگاه داده';
  return (
    <button type="button" className="crm-theme-toggle crm-sync-btn" onClick={syncNow} title={title} disabled={syncing}>
      <ArrowsRightLeftIcon className={syncing ? 'crm-icon-spin' : undefined} />
      {showBadge && <span className="crm-notif-badge">{queueCount > 0 ? (queueCount > 9 ? '9+' : queueCount) : ''}</span>}
    </button>
  );
}