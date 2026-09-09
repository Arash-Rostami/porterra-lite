'use client';
import { useState, useRef, useEffect } from 'react';

export default function Dropdown({ value, onChange, options, placeholder, multiple }) {
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
  const selected = multiple ? (Array.isArray(value) ? value : (value ? [value] : [])) : null;
  const isSel = (v) => (multiple ? selected.includes(v) : value === v);
  const noneSel = multiple ? !selected.length : !value;

  let label = placeholder;
  if (multiple) {
    if (selected.length === 1) label = (normalized.find((o) => o.value === selected[0]) || {}).label ?? selected[0];
    else if (selected.length > 1) label = `${selected.length} انتخاب شده`;
  } else if (value) {
    label = (normalized.find((o) => o.value === value) || {}).label ?? value;
  }

  function select(v) {
    if (multiple) {
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    } else {
      onChange(v);
      setOpen(false);
    }
  }

  function clearAll() {
    onChange(multiple ? [] : '');
    setOpen(false);
  }

  return (
    <div className={`crm-dd${open ? ' -open' : ''}`} ref={rootRef}>
      <button type="button" className="crm-dd-btn" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <span className="crm-dd-label">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="crm-dd-menu">
        <div className={`crm-dd-item${noneSel ? ' -sel' : ''}`} onClick={clearAll}>{placeholder}</div>
        {normalized.map((o) => (
          <div key={o.value} className={`crm-dd-item${isSel(o.value) ? ' -sel' : ''}`} onClick={() => select(o.value)}>{o.label}</div>
        ))}
      </div>
    </div>
  );
}
