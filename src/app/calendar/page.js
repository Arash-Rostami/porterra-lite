'use client';
import CalendarPanel from '../../components/calendar/CalendarPanel.jsx';
import { useScopedData } from '../../lib/store.js';

export default function CalendarPage() {
    const { records, reminders } = useScopedData();

    return (
        <div className="crm-tab-panel" id="crmPanelCalendar">
            <CalendarPanel records={records} reminders={reminders} />
        </div>
    );
}
