'use client';
import { useMemo } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import { TrashIcon } from '../ui/Icon.jsx';
import { filterOptionsFrom, scopedCoordOptions, STATUS_OPTS } from '../../lib/filters.js';
import { useStore } from '../../lib/store.js';

const emptyFilters = { q: '', coordinator: '', category: '', source: '', product: '', status: '', dateFrom: '', dateTo: '' };

export default function LeadFilters({ records, filters, onChange, chartFilter, onClearChartFilter }) {
  const currentUser = useStore((s) => s.currentUser);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const opts = useMemo(() => filterOptionsFrom(records), [records]);
  const categoryOpts = useMemo(() => categories.map((c) => c.name).sort((a, b) => a.localeCompare(b)), [categories]);
  const productOpts = useMemo(() => products.map((p) => p.name).sort((a, b) => a.localeCompare(b)), [products]);
  const set = (k) => (v) => onChange({ ...filters, [k]: v });

  return (
    <div className="crm-section crm-collapsible-section">
      <div className="crm-section-title">فیلترها</div>
      <div className="crm-toolbar">
        <Dropdown value={filters.coordinator} onChange={set('coordinator')} options={scopedCoordOptions(currentUser)} placeholder="همه کارشناسان" />
        <Dropdown value={filters.category} onChange={set('category')} options={categoryOpts} placeholder="همه دسته‌ها" />
        <Dropdown value={filters.product} onChange={set('product')} options={productOpts} placeholder="همه محصولات" />
        <Dropdown value={filters.source} onChange={set('source')} options={opts.sources} placeholder="همه منابع سرنخ" />
        <Dropdown value={filters.status} onChange={set('status')} options={STATUS_OPTS} placeholder="همه وضعیت‌ها" />
        <div className="crm-date-range">
          <DateField className="crm-input crm-mono" value={filters.dateFrom} onChange={set('dateFrom')} />
          <span>تا</span>
          <DateField className="crm-input crm-mono" value={filters.dateTo} onChange={set('dateTo')} />
        </div>
        <button type="button" className="crm-suggest-clear-mini" title="پاک کردن" aria-label="پاک کردن" onClick={() => onChange(emptyFilters)}><TrashIcon /></button>
      </div>
      {chartFilter && (
        <div className="crm-active-chart-filter -show" id="crmChartFilterPill">
          <span>{chartFilter.label}</span>
          <button type="button" title="پاک کردن" aria-label="پاک کردن" onClick={onClearChartFilter}><TrashIcon /></button>
        </div>
      )}
    </div>
  );
}
