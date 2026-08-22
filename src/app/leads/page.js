'use client';
import { useMemo } from 'react';
import AddLeadForm from '../../components/leads/AddLeadForm.jsx';
import LeadFilters from '../../components/leads/LeadFilters.jsx';
import LeadTable from '../../components/leads/LeadTable.jsx';
import { addRecords, deleteRecordWithLog, useScopedData } from '../../lib/store';
import { useUiStore, setFilters, setAddFormOpen, clearChartFilter, openProfile } from '../../lib/uiStore';
import { exportToExcel } from '../../lib/excel';
import { getFiltered } from '../../lib/filters';
import { confirm } from '../../lib/confirm';
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
        const ok = await confirm({
            title: 'حذف تماس',
            message: `این تماس با «${rec.company || '-'}» (تاریخ ${rec.date || '-'}) برای همیشه حذف بشه؟`,
            confirmText: 'حذف',
            cancelText: 'انصراف',
        });
        if (!ok) return;
        deleteRecordWithLog(rec);
        toast('تماس حذف شد');
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
