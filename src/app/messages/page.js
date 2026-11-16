'use client';
import MessengerPanel from '../../components/messages/MessengerPanel.jsx';
import { useScopedData } from '../../lib/store.js';

export default function MessagesPage() {
    const { records } = useScopedData();

    return (
        <div className="crm-tab-panel" id="crmPanelMessages">
            <MessengerPanel records={records} />
        </div>
    );
}
