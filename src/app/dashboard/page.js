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
import { applyCategoryFilter, applySourceFilter, applyMonthFilter, applyDayFilter, applyLeadFilter } from '../../lib/uiStore.js';
import { getFiltered } from '../../lib/filters.js';

export default function DashboardPage() {
    const { records } = useScopedData();
    const { dark } = useTheme();
    const router = useRouter();
    const [filters, setFilters] = useState(emptyDashboardFilters);

    const filtered = useMemo(() => getFiltered(records, filters, null), [records, filters]);

    function goToLeads() {
        router.push('/leads');
    }

    function openKpi(target) {
        applyLeadFilter({ ...filters, ...target.filters });
        router.push(target.href);
    }

    return (
        <div className="crm-tab-panel" id="crmPanelDashboard">
            <DashboardFilters filters={filters} onChange={setFilters} />
            <KpiCards records={records} callFilters={filters} onSelectKpi={openKpi} />
            <FunnelChart records={records} callFilters={filters} />
            <div className="crm-charts">
                <TrendChart records={filtered} dark={dark} onSelectMonth={(dateFrom, dateTo, label) => { applyMonthFilter(dateFrom, dateTo, label); goToLeads(); }} />
                <DailyAgentChart records={filtered} dark={dark} onSelectDay={(date, agent, label) => { applyDayFilter(date, agent, label); goToLeads(); }} />
            </div>
            <div className="crm-charts">
                <CategoryChart records={filtered} dark={dark} onSelectCategory={(cat) => { applyCategoryFilter(cat); goToLeads(); }} />
                <SourceChart records={filtered} dark={dark} onSelectSource={(src, top) => { applySourceFilter(src, top); goToLeads(); }} />
            </div>
        </div>
    );
}