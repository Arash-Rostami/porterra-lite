'use client';
import AddContactForm from '../../components/contacts/AddContactForm.jsx';
import ContactFilters from '../../components/contacts/ContactFilters.jsx';
import ContactTable from '../../components/contacts/ContactTable.jsx';
import { addRecords, deleteRecordWithLog, useScopedData } from '../../lib/store.js';
import { useUiStore, setFilters, setAddFormOpen, clearChartFilter, openProfile } from '../../lib/uiStore.js';
import { exportToExcel } from '../../lib/excel.js';
import { confirm } from '../../lib/confirm.js';
import { toast } from '../../components/ui/Toast.jsx';

export default function ContactsPage() {
    const { records, currentUser } = useScopedData();
    const filters = useUiStore((u) => u.filters);
    const chartFilter = useUiStore((u) => u.chartFilter);
    const addFormOpen = useUiStore((u) => u.addFormOpen);

    function handleExport() {
        const res = exportToExcel(records);
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
        <div className="crm-tab-panel" id="crmPanelContacts">
            <AddContactForm open={addFormOpen} records={records} defaultCoordinator={currentUser?.agentCode || ''} onSubmit={handleAddSubmit} onCancel={() => setAddFormOpen(false)} />
            <ContactFilters records={records} filters={filters} onChange={setFilters} chartFilter={chartFilter} onClearChartFilter={clearChartFilter} />
            <ContactTable
                records={records}
                filters={filters}
                chartFilter={chartFilter}
                onEdit={(id) => openProfile(id)}
                onDelete={handleDelete}
                onImport={addRecords}
                onToggleAdd={() => setAddFormOpen(!addFormOpen)}
                addOpen={addFormOpen}
                onExport={handleExport}
            />
        </div>
    );
}