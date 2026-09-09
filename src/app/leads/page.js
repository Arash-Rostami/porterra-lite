'use client';
import { useMemo } from 'react';
import AddLeadForm from '../../components/leads/AddLeadForm.jsx';
import LeadFilters from '../../components/leads/LeadFilters.jsx';
import LeadTable from '../../components/leads/LeadTable.jsx';
import { addRecords, deleteRecordWithLog, updateRecord, addChangeLogEntry, custKey, useScopedData, EMPTY_RECORD_PATCH } from '../../lib/store.js';
import { useUiStore, setFilters, setAddFormOpen, clearChartFilter, openProfile } from '../../lib/uiStore.js';
import { exportToExcel } from '../../lib/excel.js';
import { getFiltered } from '../../lib/filters.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../../components/ui/Toast.jsx';

export default function LeadsPage() {
    const { records: allRecords, currentUser } = useScopedData();
    const records = useMemo(() => allRecords.filter((r) => !r.converted), [allRecords]);
    const filters = useUiStore((u) => u.filters);
    const chartFilter = useUiStore((u) => u.chartFilter);
    const addFormOpen = useUiStore((u) => u.addFormOpen);

    function handleExport() {
        const res = exportToExcel(getFiltered(records, filters, chartFilter));
        toast(res.ok ? `${res.count.toLocaleString('en-US')} رکورد در فایل اکسل ذخیره شد` : 'رکوردی برای خروجی گرفتن نیست');
    }

    function handleAddSubmit(rec) {
        addRecords([rec]);
        setAddFormOpen(false);
    }

    async function handleDelete(id) {
        const rec = records.find((r) => r.id === id);
        if (!rec) return;
        const k = custKey(rec.company);
        const remaining = allRecords.find((r) => r.id !== id && custKey(r.company) === k);
        const ok = await confirm({
            title: 'حذف تماس',
            message: remaining
                ? `این تماس با «${rec.company || '-'}» (تاریخ ${rec.date || '-'}) برای همیشه حذف بشه؟`
                : `این تنها تماسیه که از «${rec.company || '-'}» تو لیست شما مونده — با تأیید، فقط اطلاعات این تماس پاک میشه؛ خود شرکت تو لیست شما می‌مونه. ادامه بدید؟`,
            confirmText: 'حذف',
            cancelText: 'انصراف',
        });
        if (!ok) return;
        if (remaining) {
            deleteRecordWithLog(rec);
            toast('تماس حذف شد');
        } else {
            updateRecord(rec.id, EMPTY_RECORD_PATCH);
            addChangeLogEntry(k, 'آخرین تماس این شرکت پاک شد — شرکت در لیست باقی موند', currentUser?.displayName || currentUser?.username || null);
            toast(`اطلاعات آخرین تماس پاک شد — «${rec.company || '-'}» همچنان تو لیست شما هست`);
        }
    }

    return (
        <div className="crm-tab-panel" id="crmPanelLeads">
            <AddLeadForm open={addFormOpen} records={allRecords} defaultCoordinator={currentUser?.agentCode || ''} onSubmit={handleAddSubmit} onCancel={() => setAddFormOpen(false)} />
            <LeadFilters records={records} filters={filters} onChange={setFilters} chartFilter={chartFilter} onClearChartFilter={clearChartFilter} />
            <LeadTable
                records={records}
                filters={filters}
                chartFilter={chartFilter}
                onEdit={(id) => openProfile(id)}
                onDelete={handleDelete}
                onImport={addRecords}
                onToggleAdd={() => setAddFormOpen(!addFormOpen)}
                addOpen={addFormOpen}
                onExport={handleExport}
                onSearchChange={setFilters}
            />
        </div>
    );
}
