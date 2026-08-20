'use client';
import { useSearchParams } from 'next/navigation';
import CompanyReport from '../../components/customer/CompanyReport.jsx';
import { useScopedData } from '../../lib/store.js';
import { openProfile } from '../../lib/uiStore.js';

export default function CompanyReportPage() {
    const { records } = useScopedData();
    const searchParams = useSearchParams();
    const initialCompany = searchParams.get('company') || '';

    return (
        <div className="crm-tab-panel" id="crmPanelCompany">
            <CompanyReport records={records} onOpenRecord={openProfile} initialCompany={initialCompany} />
        </div>
    );
}
