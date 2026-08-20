'use client';
import { useMemo, useState } from 'react';
import AddLeadForm from '../../components/leads/AddLeadForm.jsx';
import LeadFilters from '../../components/leads/LeadFilters.jsx';
import LeadTable from '../../components/leads/LeadTable.jsx';
import { addRecords, deleteRecordWithLog, useScopedData } from '../../lib/store.js';
import { openProfile, DEFAULT_FILTERS } from '../../lib/uiStore.js';
import { exportToExcel } from '../../lib/excel.js';
import { getFiltered } from '../../lib/filters.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../../components/ui/Toast.jsx';

export default function CustomersPage() {
    const { records: allRecords, currentUser } = useScopedData();
    const records = useMemo(() => allRecords.filter((r) => r.converted), [allRecords]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [addFormOpen, setAddFormOpen] = useState(false);

    function handleExport() {
        const res = exportToExcel(getFiltered(records, filters, null));
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
        <div className="crm-tab-panel" id="crmPanelCustomers">
            <AddLeadForm open={addFormOpen} records={allRecords} defaultCoordinator={currentUser?.agentCode || ''} onSubmit={handleAddSubmit} onCancel={() => setAddFormOpen(false)} />
            <LeadFilters records={records} filters={filters} onChange={setFilters} chartFilter={null} onClearChartFilter={() => {}} />
            <LeadTable
                records={records}
                filters={filters}
                chartFilter={null}
                onEdit={(id) => openProfile(id)}
                onDelete={handleDelete}
                onImport={addRecords}
                onToggleAdd={() => setAddFormOpen((o) => !o)}
                addOpen={addFormOpen}
                onExport={handleExport}
                onSearchChange={setFilters}
                title="مشتریان"
                recordNoun="مشتری"
            />
        </div>
    );
}
