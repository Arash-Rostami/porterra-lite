'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/apiClient';
import { useTheme } from '../../lib/theme';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

export default function LoginPage() {
  const router = useRouter();
  const { dark, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    setPending(true);
    try {
      const res = await login(email, password);
      setPending(false);
      if (res?.user) return router.replace('/dashboard');
      setError(res?.error || 'invalid');
    } catch {
      setPending(false);
      setError('invalid');
    }
  }

  const errorMsg = error === 'inactive'
    ? 'حساب کاربری غیرفعال است. با مدیر تماس بگیرید.'
    : 'ایمیل یا گذرواژه نادرست است.';

  return (
    <div className="crm-auth-wrap">
      <div className="crm-auth-theme-toggle">
        <ThemeToggle dark={dark} onToggle={toggleTheme} />
      </div>
      <div className="crm-auth-card">
        <img src={dark ? '/img/logos/logo-dark.png' : '/img/logos/logo-light.png'} alt="PorterrA-lite" className="crm-auth-logo" />
        <h1 className="crm-auth-title">پنل سرنخ‌ها</h1>
        <p className="crm-auth-sub">برای ادامه وارد شوید</p>
        <form onSubmit={onSubmit}>
          <div className="crm-auth-field">
            <label className="crm-auth-label" htmlFor="email">ایمیل</label>
            <div className="crm-auth-input-wrp" dir="ltr">
              <span className="crm-auth-input-affix crm-auth-input-prefix" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="crm-auth-input"
                defaultValue=""
              />
            </div>
          </div>
          <div className="crm-auth-field">
            <label className="crm-auth-label" htmlFor="password">گذرواژه</label>
            <div className="crm-auth-input-wrp" dir="ltr">
              <span className="crm-auth-input-affix crm-auth-input-prefix" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="15.5" r="5.5" />
                  <path d="m21 2-9.6 9.6" />
                  <path d="m15.5 7.5 3 3L22 7l-3-3" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="crm-auth-input"
                defaultValue=""
              />
              <button
                type="button"
                className="crm-auth-input-affix crm-auth-input-suffix crm-auth-pw-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'}
                aria-pressed={showPassword}
                title={showPassword ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" className="crm-auth-btn" disabled={pending}>
            {pending ? 'در حال ورود…' : 'ورود'}
          </button>
          {error && <div className="crm-auth-error">{errorMsg}</div>}
        </form>
      </div>
    </div>
  );
}