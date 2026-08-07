'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import KpiCards from '../../components/dashboard/KpiCards.jsx';
import FunnelChart from '../../components/dashboard/FunnelChart.jsx';
import TrendChart from '../../components/dashboard/TrendChart.jsx';
import DailyAgentChart from '../../components/dashboard/DailyAgentChart.jsx';
import CategoryChart from '../../components/dashboard/CategoryChart.jsx';
import SourceChart from '../../components/dashboard/SourceChart.jsx';
import DashboardFilters, { emptyDashboardFilters } from '../../components/dashboard/DashboardFilters.jsx';
import { useScopedData } from '../../lib/store.js';
import { useTheme } from '../../lib/theme.js';
import { applyCategoryFilter, applySourceFilter, applyMonthFilter, applyDayFilter } from '../../lib/uiStore.js';
import Utils from '../../lib/utils.js';

export default function DashboardPage() {
    const { records } = useScopedData();
    const { dark } = useTheme();
    const router = useRouter();
    const [filters, setFilters] = useState(emptyDashboardFilters);

    const filtered = useMemo(() => {
        const fromDt = filters.dateFrom ? Utils.parseDate(Utils.fromISODate(filters.dateFrom)) : null;
        const toDt = filters.dateTo ? Utils.parseDate(Utils.fromISODate(filters.dateTo)) : null;
        return records.filter((r) => {
            if (filters.coordinator && r.coordinator !== filters.coordinator) return false;
            if (fromDt || toDt) {
                const dt = Utils.parseDate(r.date);
                if (!dt) return false;
                if (fromDt && dt < fromDt) return false;
                if (toDt && dt > toDt) return false;
            }
            return true;
        });
    }, [records, filters]);

    function goToContacts() {
        router.push('/contacts');
    }

    return (
        <div className="crm-tab-panel" id="crmPanelDashboard">
            <DashboardFilters filters={filters} onChange={setFilters} records={records} />
            <KpiCards records={filtered} />
            <FunnelChart records={filtered} />
            <div className="crm-charts">
                <TrendChart records={filtered} dark={dark} onSelectMonth={(y, m, label) => { applyMonthFilter(y, m, label); goToContacts(); }} />
                <DailyAgentChart records={filtered} dark={dark} onSelectDay={(y, m, day, agent, label) => { applyDayFilter(y, m, day, agent, label); goToContacts(); }} />
            </div>
            <div className="crm-charts">
                <CategoryChart records={filtered} dark={dark} onSelectCategory={(cat) => { applyCategoryFilter(cat); goToContacts(); }} />
                <SourceChart records={filtered} dark={dark} onSelectSource={(src, top) => { applySourceFilter(src, top); goToContacts(); }} />
            </div>
        </div>
    );
}