'use client';
import { useState, useRef } from 'react';
import Utils from '../../lib/utils';

// live company typeahead; the text field still works identically without the dropdown
export default function CompanySuggest({ records, value, onChange, onSelect, ...inputProps }) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  const q = Utils.normSpace(value).toLowerCase();
  let matches = [];
  if (q) {
    const companyCounts = {};
    for (const r of records) {
      const c = Utils.normSpace(r.company);
      if (!c || c.toLowerCase().indexOf(q) === -1) continue;
      companyCounts[c] = (companyCounts[c] || 0) + 1;
    }
    matches = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  function select(name) {
    clearTimeout(blurTimer.current);
    setOpen(false);
    (onSelect || onChange)(name);
  }

  return (
    <div className="crm-search-wrap">
      <input
        {...inputProps}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
      />
      <div className={`crm-suggest-dropdown${open && matches.length ? ' -open' : ''}`}>
        {matches.map(([name, count]) => (
          <div key={name} className="crm-suggest-dd-item" onMouseDown={(e) => e.preventDefault()} onClick={() => select(name)}>
            <span>{name}</span>
            <span className="crm-suggest-dd-meta">{count.toLocaleString('en-US')} رکورد</span>
          </div>
        ))}
      </div>
    </div>
  );
}
