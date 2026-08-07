'use client';
import { useState, useRef, useEffect } from 'react';

export default function Dropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const normalized = options.map((o) => (o && typeof o === 'object' ? o : { value: o, label: o }));
  const found = value ? normalized.find((o) => o.value === value) : null;
  const label = value ? (found ? found.label : value) : placeholder;

  function select(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className={`crm-dd${open ? ' -open' : ''}`} ref={rootRef}>
      <button type="button" className="crm-dd-btn" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <span className="crm-dd-label">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="crm-dd-menu">
        <div className={`crm-dd-item${!value ? ' -sel' : ''}`} onClick={() => select('')}>{placeholder}</div>
        {normalized.map((o) => (
          <div key={o.value} className={`crm-dd-item${value === o.value ? ' -sel' : ''}`} onClick={() => select(o.value)}>{o.label}</div>
        ))}
      </div>
    </div>
  );
}
