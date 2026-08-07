'use client';
import CompanyReport from '../../components/customer/CompanyReport.jsx';
import { useScopedData } from '../../lib/store.js';
import { openProfile } from '../../lib/uiStore.js';

export default function CompanyReportPage() {
    const { records } = useScopedData();

    return (
        <div className="crm-tab-panel" id="crmPanelCompany">
            <CompanyReport records={records} onOpenRecord={openProfile} />
        </div>
    );
}