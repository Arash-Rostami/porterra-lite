'use client';
import { useEffect, useState } from 'react';

// dir="ltr" because the wordmark + eyebrow are Latin even though the app is RTL
const APP_NAME = 'PorterrA-lite';
const SESSION_KEY = 'porterra_loaded';
const DURATION = 2900;
const EXIT = 700;

export default function BootLoader() {
  const [showing, setShowing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setShowing(true);
    const exit = setTimeout(() => setLeaving(true), DURATION);
    const unmount = setTimeout(() => {
      setShowing(false);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, DURATION + EXIT);
    return () => { clearTimeout(exit); clearTimeout(unmount); };
  }, []);

  if (!showing) return null;

  return (
    <div className={`loader-overlay${leaving ? ' -leaving' : ''}`} dir="ltr">
      <div className="ldr-grid" />
      <div className="ldr-scan" />
      <div className="ldr-glow" />
      <div className="ldr-c ldr-c-tl" />
      <div className="ldr-c ldr-c-tr" />
      <div className="ldr-c ldr-c-bl" />
      <div className="ldr-c ldr-c-br" />

      <div className="ldr-body">
        <div className="ldr-eyebrow">Trade <span className="ldr-slogan-hard">hard</span> <span className="ldr-slogan-smart">smart</span></div>
        <div className="ldr-mark">
          <img src="/img/logos/logo-light.png" alt={APP_NAME} className="ldr-mark-img ldr-mark-light" />
          <img src="/img/logos/logo-dark.png" alt={APP_NAME} className="ldr-mark-img ldr-mark-dark" />
        </div>
        <div className="ldr-logo">
          {Array.from(APP_NAME).map((ch, i) => (
            <span key={i} className="ldr-letter" style={{ '--i': String(i) }}>{ch}</span>
          ))}
        </div>
        <div className="ldr-divider" />
        <div className="ldr-progress">
          <div className="ldr-track">
            <div className="ldr-fill" />
          </div>
          <div className="ldr-status">
            <svg className="ldr-status-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Loading Resources
          </div>
        </div>
      </div>
    </div>
  );
}