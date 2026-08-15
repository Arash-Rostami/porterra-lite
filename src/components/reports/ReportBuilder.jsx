'use client';
import {useMemo, useState} from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import {effectiveResult, filterOptionsFrom, getFiltered, STATUS_OPTS} from '../../lib/filters.js';
import {toast} from '../ui/Toast.jsx';
import {DownloadIcon} from '../ui/Icon.jsx';
import PhoneLink from '../ui/PhoneLink.jsx';

function ChevronIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="crm-cols-toggle-chevron">
            <path d="M15 6l-6 6 6 6" />
        </svg>
    );
}

const REPORT_COLUMNS = [
    {key: 'coordinator', label: 'کارشناس'},
    {key: 'company', label: 'شرکت'},
    {key: 'name', label: 'مخاطب'},
    {key: 'phone', label: 'تلفن'},
    {key: 'product', label: 'محصول'},
    {key: 'category', label: 'دسته محصول'},
    {key: 'source', label: 'منبع سرنخ'},
    {key: 'date', label: 'تاریخ تماس'},
    {key: 'price', label: 'آخرین قیمت اعلامی'},
    {key: 'result', label: 'نتیجه'},
    {key: 'priority', label: 'اولویت'},
    {key: 'converted', label: 'سرنخ تبدیل‌شده'},
];
const DEFAULT_COLS = ['coordinator', 'company', 'product', 'date', 'result'];
const PREVIEW_CAP = 200;

function cellValue(r, key) {
    if (key === 'converted') return r.converted ? 'بله' : 'خیر';
    if (key === 'result') return effectiveResult(r) || 'بدون وضعیت';
    return r[key] || '-';
}

export default function ReportBuilder({records}) {
    const opts = useMemo(() => filterOptionsFrom(records), [records]);
    const [cols, setCols] = useState(DEFAULT_COLS);
    const [colsOpen, setColsOpen] = useState(false);
    const [filters, setFilters] = useState({
        coordinator: '',
        category: '',
        source: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    });
    const set = (k) => (v) => setFilters((s) => ({...s, [k]: v}));
    const setInput = (k) => (e) => setFilters((s) => ({...s, [k]: e.target.value}));

    const result = useMemo(
        () => getFiltered(records, {...filters, q: '', showDeactivated: true}, null, null),
        [records, filters],
    );
    const activeCols = REPORT_COLUMNS.filter((c) => cols.includes(c.key));

    function toggleCol(key) {
        setCols((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
    }

    async function exportExcel() {
        if (!result.length) {
            toast('چیزی برای خروجی وجود ندارد');
            return;
        }
        const XLSX = await import('xlsx');
        const rows = result.map((r) => {
            const row = {};
            for (const c of activeCols) row[c.label] = cellValue(r, c.key);
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'گزارش');
        const today = new Date();
        XLSX.writeFile(wb, 'گزارش-سفارشی-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '.xlsx');
    }

    return (
        <>
            <div className="crm-section">
                <div className="crm-section-title">فیلترها</div>
                <div className="crm-toolbar">
                    <Dropdown value={filters.coordinator} onChange={set('coordinator')} options={opts.coordinators}
                              placeholder="همه کارشناسان"/>
                    <Dropdown value={filters.category} onChange={set('category')} options={opts.categories}
                              placeholder="همه دسته‌ها"/>
                    <Dropdown value={filters.source} onChange={set('source')} options={opts.sources}
                              placeholder="همه منابع سرنخ"/>
                    <Dropdown value={filters.status} onChange={set('status')} options={STATUS_OPTS}
                              placeholder="همه وضعیت‌ها"/>
                    <div className="crm-date-range">
                        <DateField className="crm-input crm-mono" value={filters.dateFrom} onChange={set('dateFrom')}/>
                        <span>تا</span>
                        <DateField className="crm-input crm-mono" value={filters.dateTo} onChange={set('dateTo')}/>
                    </div>

                    <button type="button" className={`crm-cols-toggle${colsOpen ? ' -open' : ''}`} onClick={() => setColsOpen((s) => !s)}>
                        <ChevronIcon />
                        ستون‌های گزارش
                        {cols.length !== REPORT_COLUMNS.length && <span className="crm-cols-toggle-count">{cols.length}</span>}
                    </button>
                </div>

                <div className={`crm-quickcall-form${colsOpen ? ' -open' : ''}`}>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px 20px'}}>
                        {REPORT_COLUMNS.map((c) => (
                            <label key={c.key} className="crm-toggle-label" style={{padding: '4px 0'}}>
                                <input type="checkbox" checked={cols.includes(c.key)}
                                       onChange={() => toggleCol(c.key)}/>
                                <span>{c.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="crm-section">
                <div className="crm-section-title-row">
                    <div className="crm-section-title">نتیجه <span style={{
                        color: 'var(--muted)',
                        fontWeight: 400
                    }}>({result.length.toLocaleString('en-US')} مورد)</span></div>
                    <div className="crm-table-actions">
                        <button type="button" className="crm-export-btn" onClick={exportExcel}><DownloadIcon/>خروجی اکسل
                        </button>
                    </div>
                </div>
                {result.length > PREVIEW_CAP && (
                    <div style={{fontSize: 12, color: 'var(--muted)', margin: '6px 0'}}>
                        فقط {PREVIEW_CAP.toLocaleString('en-US')} ردیف اول نمایش داده می‌شود — خروجی اکسل شامل
                        همه‌ی {result.length.toLocaleString('en-US')} ردیف است.
                    </div>
                )}
                <div className="crm-table-wrap">
                    <table className="crm-table">
                        <thead>
                        <tr>{activeCols.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
                        </thead>
                        <tbody>
                        {result.slice(0, PREVIEW_CAP).map((r) => (
                            <tr key={r.id}>{activeCols.map((c) => <td key={c.key}>{c.key === 'phone' ? <PhoneLink phone={r.phone} /> : cellValue(r, c.key)}</td>)}</tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
