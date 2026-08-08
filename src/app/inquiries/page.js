'use client';
import QuotesPanel from '../../components/inquiries/QuotesPanel.jsx';
import { useScopedData } from '../../lib/store.js';
import { openProfile } from '../../lib/uiStore.js';

export default function InquiriesPage() {
    const { records } = useScopedData();

    return (
        <div className="crm-tab-panel" id="crmPanelInquiries">
            <QuotesPanel records={records} onOpenRecord={openProfile} />
        </div>
    );
}
