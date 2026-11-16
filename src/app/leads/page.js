'use client';
import { useMemo, useEffect } from 'react';
import AddLeadForm from '../../components/leads/AddLeadForm.jsx';
import LeadFilters from '../../components/leads/LeadFilters.jsx';
import LeadTable from '../../components/leads/LeadTable.jsx';
import { addRecord, addRecords, deleteRecordWithLog, deleteCompany, custKey, useScopedData } from '../../lib/store.js';
import { useUiStore, setFilters, setAddFormOpen, clearChartFilter, openProfile, hydrateFiltersFromUrl } from '../../lib/uiStore.js';
import { exportToExcel } from '../../lib/excel.js';
import { leadList, isCall } from '../../lib/companies.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../../components/ui/Toast.jsx';

export default function LeadsPage() {
    const { records: allRecords, currentUser } = useScopedData();
    const records = useMemo(() => allRecords.filter((r) => !r.converted), [allRecords]);
    const filters = useUiStore((u) => u.filters);
    const chartFilter = useUiStore((u) => u.chartFilter);
    const addFormOpen = useUiStore((u) => u.addFormOpen);

    useEffect(() => { hydrateFiltersFromUrl(); }, []);

    async function handleExport() {
        const res = await exportToExcel(leadList(allRecords, filters, 'lead', chartFilter));
        toast(res.ok ? `${res.count.toLocaleString('en-US')} رکورد در فایل اکسل ذخیره شد` : 'رکوردی برای خروجی گرفتن نیست');
    }

    async function handleAddSubmit(rec) {
        const ok = await addRecord(rec);
        if (ok) setAddFormOpen(false);
        return ok;
    }

    async function handleDelete(id) {
        const rec = allRecords.find((r) => r.id === id);
        if (!rec) return;
        const k = custKey(rec.company);
        const remaining = allRecords.find((r) => r.id !== id && isCall(r) && custKey(r.company) === k);
        const ok = await confirm({
            title: 'حذف تماس',
            message: remaining
                ? `این تماس با «${rec.company || '-'}» (تاریخ ${rec.date || '-'}) برای همیشه حذف بشه؟`
                : `این آخرین تماس «${rec.company || '-'}» است — با تأیید، خود شرکت و یادآوری‌ها و اعلان‌هایش هم حذف می‌شود. ادامه بدید؟`,
            confirmText: 'حذف',
            cancelText: 'انصراف',
        });
        if (!ok) return;
        if (remaining) {
            deleteRecordWithLog(rec);
            toast('تماس حذف شد');
        } else {
            if (await deleteCompany(rec.company)) toast(`«${rec.company || '-'}» با آخرین تماسش حذف شد`);
        }
    }

    return (
        <div className="crm-tab-panel" id="crmPanelLeads">
            <AddLeadForm open={addFormOpen} records={allRecords} defaultCoordinator={currentUser?.agentCode || ''} onSubmit={handleAddSubmit} onCancel={() => setAddFormOpen(false)} />
            <LeadFilters records={allRecords} filters={filters} onChange={setFilters} chartFilter={chartFilter} onClearChartFilter={clearChartFilter} />
            <LeadTable
                records={records}
                segment="lead"
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
