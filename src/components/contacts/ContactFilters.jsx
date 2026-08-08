'use client';
import { useMemo } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import { TrashIcon } from '../ui/Icon.jsx';
import { filterOptionsFrom, STATUS_OPTS } from '../../lib/filters.js';

const emptyFilters = { q: '', coordinator: '', category: '', source: '', status: '', dateFrom: '', dateTo: '', showDeactivated: false };

export default function ContactFilters({ records, filters, onChange, chartFilter, onClearChartFilter }) {
  const opts = useMemo(() => filterOptionsFrom(records), [records]);
  const set = (k) => (v) => onChange({ ...filters, [k]: v });
  const setInput = (k) => (e) => onChange({ ...filters, [k]: e.target.value });

  return (
    <div className="crm-section crm-collapsible-section">
      <div className="crm-section-title">جست‌وجوی هوشمند و فیلتر</div>
      <div className="crm-section-desc">هم‌زمان در نام شرکت، نام مخاطب، تلفن، محصول و یادداشت‌ها جست‌وجو می‌کند</div>
      <div className="crm-toolbar">
        <CompanySuggest
          records={records}
          className="crm-input"
          id="crmSearch"
          autoComplete="off"
          value={filters.q}
          onChange={set('q')}
          placeholder="جست‌وجو کنید... مثلاً: پلیمر، پاسخ نداد، یا بخشی از شماره تلفن"
        />
        <Dropdown value={filters.coordinator} onChange={set('coordinator')} options={opts.coordinators} placeholder="همه کارشناسان" />
        <Dropdown value={filters.category} onChange={set('category')} options={opts.categories} placeholder="همه دسته‌ها" />
        <Dropdown value={filters.source} onChange={set('source')} options={opts.sources} placeholder="همه منابع" />
        <Dropdown value={filters.status} onChange={set('status')} options={STATUS_OPTS} placeholder="همه وضعیت‌ها" />
        <div className="crm-date-range">
          <input type="date" className="crm-input crm-mono" value={filters.dateFrom} onChange={setInput('dateFrom')} />
          <span>تا</span>
          <input type="date" className="crm-input crm-mono" value={filters.dateTo} onChange={setInput('dateTo')} />
        </div>
        <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => onChange(emptyFilters)}><TrashIcon /></button>
      </div>
      <label className="crm-toggle-label">
        <input type="checkbox" checked={!!filters.showDeactivated} onChange={(e) => onChange({ ...filters, showDeactivated: e.target.checked })} />
        <span>نمایش غیرفعال‌ها</span>
      </label>
      {chartFilter && (
        <div className="crm-active-chart-filter -show" id="crmChartFilterPill">
          <span>{chartFilter.label}</span>
          <button type="button" title="پاک کردن" aria-label="پاک کردن" onClick={onClearChartFilter}><TrashIcon /></button>
        </div>
      )}
    </div>
  );
}
