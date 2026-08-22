'use client';
import { ReminderBanner, CommentBanner } from '../../components/suggestions/ReminderBanner.jsx';
import RemindersList from '../../components/suggestions/RemindersList.jsx';
import SuggestionsPanel from '../../components/suggestions/SuggestionsPanel.jsx';
import { markReminderDone, useScopedData } from '../../lib/store';
import { computeSuggestions } from '../../lib/suggestions';
import { openProfile } from '../../lib/uiStore';
import { toast } from '../../components/ui/Toast.jsx';

export default function SuggestionsPage() {
    const { records, reminders, companyMeta } = useScopedData();
    const byAgent = computeSuggestions(records);

    function handleMarkDone(id) {
        markReminderDone(id);
        toast('یادآوری به‌عنوان انجام‌شده علامت خورد');
    }

    return (
        <div className="crm-tab-panel" id="crmPanelSuggestions">
            <ReminderBanner byAgent={byAgent} />
            <CommentBanner companyMeta={companyMeta} records={records} onOpenProfile={openProfile} />
            <RemindersList reminders={reminders} records={records} onMarkDone={handleMarkDone} onOpenProfile={openProfile} />
            <SuggestionsPanel byAgent={byAgent} onOpenProfile={openProfile} />
        </div>
    );
}