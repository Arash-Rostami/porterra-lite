'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'داشبورد', icon: <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /> },
  { href: '/agents', label: 'کارشناسان', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { href: '/company-report', label: 'شرکت‌ها', icon: <><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4M8 6h1M8 10h1M8 14h1M15 6h1M15 10h1M15 14h1" /></> },
  { href: '/contacts', label: 'مخاطبین', icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></> },
  { href: '/suggestions', label: 'پیگیری‌ها', icon: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> },
  { href: '/users', label: 'کاربران', icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
];

const COLLAPSE_KEY = 'crm_sidebar_collapsed_v1';

function readCollapsedPref() {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

export default function Sidebar({ dark }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setCollapsed(readCollapsedPref()); }, []);

  const links = LINKS;

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
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`crm-tab-link${pathname === l.href ? ' -active' : ''}`} onClick={() => setMobileOpen(false)}>
              <svg className="crm-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{l.icon}</svg>
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      {collapsed && collapseBtn}
    </>
  );
}
