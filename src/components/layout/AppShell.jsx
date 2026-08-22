'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import BootLoader from './BootLoader.jsx';
import { Toast } from '../ui/Toast.jsx';
import LeadProfileModal from '../leads/LeadProfileModal.jsx';
import AgentProfileModal from '../agents/AgentProfileModal.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { useStore, loadAll, syncNow } from '../../lib/store';
import { useUiStore, closeProfile, closeAgentProfile, openProfile } from '../../lib/uiStore';
import { useTheme } from '../../lib/theme';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAuth = pathname === '/login';
  const records = useStore((s) => s.records);
  const companyMeta = useStore((s) => s.companyMeta);
  const loaded = useStore((s) => s.loaded);
  const offline = useStore((s) => s.offline);
  const queueCount = useStore((s) => s.queueCount);
  const profileId = useUiStore((u) => u.profileId);
  const agentProfile = useUiStore((u) => u.agentProfile);
  const fontScale = useUiStore((u) => u.fontScale);
  const { dark, toggleTheme } = useTheme();
  const offlineRef = useRef(offline);
  useEffect(() => { offlineRef.current = offline; }, [offline]);

  useEffect(() => { if (!isAuth && !loaded) loadAll(); }, [loaded, isAuth]);

  useEffect(() => {
    if (isAuth || !offline) return;
    const retry = () => { if (offlineRef.current) syncNow(); };
    const id = setInterval(retry, 20000);
    const onOnline = () => retry();
    window.addEventListener('online', onOnline);
    return () => { clearInterval(id); window.removeEventListener('online', onOnline); };
  }, [offline, isAuth]);

  if (isAuth) {
    return <div className={`crm-root${dark ? ' -dark' : ''}`}>{children}</div>;
  }

  return (
    <div className={`crm-root${dark ? ' -dark' : ''}`} id="crmRoot" style={{ zoom: String(fontScale) }}>
      <BootLoader />
      <Sidebar dark={dark} />
      <div className="crm-main">
        {offline && (
          <div className="crm-offline-banner">
            حالت آفلاین — {queueCount.toLocaleString('en-US')} تغییر در صف محلی — به‌محض برقراری اتصال، خودکار همگام‌سازی می‌شود
          </div>
        )}
        <Header leadCount={records.filter((r) => !r.converted).length} customerCount={records.filter((r) => r.converted).length} dark={dark} onToggleTheme={toggleTheme} />
        {loaded && children}
        {loaded && <Footer />}
      </div>

      {profileId && (
        <LeadProfileModal
          key={profileId}
          recordId={profileId}
          records={records}
          companyMeta={companyMeta}
          onClose={closeProfile}
          onOpenRecord={(id) => openProfile(id)}
        />
      )}
      {agentProfile && (
        <AgentProfileModal
          key={agentProfile}
          agent={agentProfile}
          records={records}
          onClose={closeAgentProfile}
          onOpenRecord={(id) => openProfile(id)}
        />
      )}
      <Toast />
      <ConfirmDialog />
    </div>
  );
}