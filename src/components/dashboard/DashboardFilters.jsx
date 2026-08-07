'use client';
import { useMemo } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import { TrashIcon } from '../ui/Icon.jsx';
import { filterOptionsFrom } from '../../lib/filters.js';

export const emptyDashboardFilters = { coordinator: '', dateFrom: '', dateTo: '' };

export default function DashboardFilters({ filters, onChange, records }) {
  const opts = useMemo(() => filterOptionsFrom(records), [records]);
  const set = (k) => (v) => onChange({ ...filters, [k]: v });
  const setInput = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const active = filters.coordinator || filters.dateFrom || filters.dateTo;

  return (
    <div className="crm-section">
      <div className="crm-toolbar">
        <Dropdown value={filters.coordinator} onChange={set('coordinator')} options={opts.coordinators} placeholder="همه کارشناسان" />
        <div className="crm-date-range">
          <input type="date" className="crm-input crm-mono" value={filters.dateFrom} onChange={setInput('dateFrom')} />
          <span>تا</span>
          <input type="date" className="crm-input crm-mono" value={filters.dateTo} onChange={setInput('dateTo')} />
        </div>
        {active && (
          <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => onChange(emptyDashboardFilters)}>
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}