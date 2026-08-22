'use client';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import { TrashIcon } from '../ui/Icon.jsx';
import { scopedCoordOptions } from '../../lib/filters';
import { useStore } from '../../lib/store';

export const emptyDashboardFilters = { coordinator: '', dateFrom: '', dateTo: '' };

export default function DashboardFilters({ filters, onChange }) {
  const currentUser = useStore((s) => s.currentUser);
  const set = (k) => (v) => onChange({ ...filters, [k]: v });
  const setInput = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const active = filters.coordinator || filters.dateFrom || filters.dateTo;

  return (
    <div className="crm-section">
      <div className="crm-toolbar">
        <Dropdown value={filters.coordinator} onChange={set('coordinator')} options={scopedCoordOptions(currentUser)} placeholder="همه کارشناسان" />
        <div className="crm-date-range">
          <DateField className="crm-input crm-mono" value={filters.dateFrom} onChange={set('dateFrom')} />
          <span>تا</span>
          <DateField className="crm-input crm-mono" value={filters.dateTo} onChange={set('dateTo')} />
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