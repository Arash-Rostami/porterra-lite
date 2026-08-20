'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { setAddFormOpen } from '../../lib/uiStore.js';
import { PlusIcon, SearchIcon } from '../ui/Icon.jsx';

const LINK_GROUPS = [
  {
    label: null,
    links: [
      { href: '/dashboard', label: 'داشبورد', icon: <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /> },
    ],
  },
  {
    label: 'سرنخ‌ها و فروش',
    links: [
      { href: '/leads', label: 'سرنخ‌ها', icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></> },
      { href: '/customers', label: 'مشتریان', icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m22 21-3-3 3-3" /><path d="M15 18h7" /></> },
      { href: '/inquiries', label: 'استعلام‌ها', icon: <><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r="0.75" fill="currentColor" /></> },
      { href: '/suggestions', label: 'پیگیری‌ها', icon: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> },
    ],
  },
  {
    label: 'گزارش‌ها',
    links: [
      { href: '/agents', label: 'کارشناسان', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
      { href: '/company-report', label: 'شرکت‌ها', icon: <><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4M8 6h1M8 10h1M8 14h1M15 6h1M15 10h1M15 14h1" /></> },
      { href: '/report-builder', label: 'گزارش‌ساز', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></> },
    ],
  },
  {
    label: 'مدیریت',
    links: [
      { href: '/products', label: 'محصولات', icon: <><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></> },
      { href: '/categories', label: 'دسته‌بندی‌ها', icon: <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.5" /></> },
      { href: '/users', label: 'کاربران', icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
    ],
  },
];

const COLLAPSE_KEY = 'crm_sidebar_collapsed_v1';

function readCollapsedPref() {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

export default function Sidebar({ dark }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // SSR-safe: localStorage doesn't exist server-side, so initial state stays the server default
  // (false) and the real pref is only read client-side here — a lazy initializer would mismatch SSR.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCollapsed(readCollapsedPref()); }, []);

  const groups = LINK_GROUPS;

  function newLeadShortcut() {
    setAddFormOpen(true);
    router.push('/leads');
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }

  const collapseBtn = (
    <button type="button" className={`crm-sidebar-collapse-btn${collapsed ? ' -collapsed' : ''}`} onClick={toggleCollapsed} title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );

  return (
    <>
      <aside className={`crm-sidebar${collapsed ? ' -collapsed' : ''}${mobileOpen ? ' -mobile-open' : ''}`}>
        <div className="crm-sidebar-brand">
          <button type="button" className="crm-sidebar-hamburger-btn" onClick={() => setMobileOpen((o) => !o)} title="منو">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img className="crm-sidebar-logo" src={dark ? '/img/logos/logo-dark.png' : '/img/logos/logo-light.png'} alt="PorterrA-lite" />
          {/* always rendered so the mobile hamburger menu (reuses this markup) keeps its title */}
          <div className="crm-sidebar-title">PorterrA-lite</div>
          <span className="crm-sidebar-desktop-collapse-slot">{collapseBtn}</span>
        </div>

        <nav className="crm-sidebar-nav">
          {groups.map((group, i) => (
            <div className="crm-sidebar-group" key={group.label || `top-${i}`}>
              {group.label && <div className="crm-sidebar-group-label">{group.label}</div>}
              {group.links.map((l) => (
                <Link key={l.href} href={l.href} className={`crm-tab-link${pathname === l.href ? ' -active' : ''}`} onClick={() => setMobileOpen(false)}>
                  <svg className="crm-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{l.icon}</svg>
                  <span>{l.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {collapsed && collapseBtn}
      <div className="crm-side-shortcuts">
        <button type="button" className="crm-theme-toggle" title="ثبت تماس جدید" onClick={newLeadShortcut}><PlusIcon /></button>
        <Link href="/report-builder" className="crm-theme-toggle" title="گزارش‌ساز"><SearchIcon /></Link>
      </div>
    </>
  );
}
