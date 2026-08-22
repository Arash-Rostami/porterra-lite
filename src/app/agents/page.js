'use client';
import AgentsPanel from '../../components/agents/AgentsPanel.jsx';
import AgentReport from '../../components/agents/AgentReport.jsx';
import { useScopedData } from '../../lib/store';
import { useUiStore, setCoordinatorFilter, openAgentProfile } from '../../lib/uiStore';

export default function AgentsPage() {
    const { records } = useScopedData();
    const activeCoordinator = useUiStore((u) => u.filters.coordinator);

    return (
        <div className="crm-tab-panel" id="crmPanelAgents">
            <AgentsPanel records={records} activeCoordinator={activeCoordinator} onToggleCoordinator={setCoordinatorFilter} onOpenProfile={openAgentProfile} />
            <AgentReport records={records} />
        </div>
    );
}