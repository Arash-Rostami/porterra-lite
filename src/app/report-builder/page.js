'use client';
import ReportBuilder from '../../components/reports/ReportBuilder.jsx';
import { useScopedData } from '../../lib/store.js';

export default function ReportBuilderPage() {
    const { records } = useScopedData();

    return (
        <div className="crm-tab-panel" id="crmPanelReportBuilder">
            <ReportBuilder records={records} />
        </div>
    );
}
