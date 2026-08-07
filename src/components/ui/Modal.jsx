'use client';
import { useEffect } from 'react';
import { XIcon } from './Icon.jsx';

const WIDTHS = {
  xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem',
  '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem',
};

let openCount = 0;
function lockScroll() {
  openCount += 1;
  if (openCount === 1 && typeof document !== 'undefined') document.documentElement.classList.add('crm-modal-open');
}
function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0 && typeof document !== 'undefined') document.documentElement.classList.remove('crm-modal-open');
}

export default function Modal({ open, onClose, title, description, width = '3xl', actions, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);
  if (!open) return null;
  return (
    <div className="crm-modal-overlay -open" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`crm-modal ${className}`} style={{ maxWidth: WIDTHS[width] || WIDTHS['3xl'] }}>
        <div className="crm-modal-head">
          <div>
            <div className="crm-modal-title">{title}</div>
            {description && <div className="crm-modal-description">{description}</div>}
          </div>
          <button type="button" className="crm-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="crm-modal-body">{children}</div>
        {actions && <div className="crm-modal-actions">{actions}</div>}
      </div>
    </div>
  );
}