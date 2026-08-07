'use client';
import ThemeToggle from './ThemeToggle.jsx';
import NotificationsBell from './NotificationsBell.jsx';
import SyncButton from './SyncButton.jsx';
import LastUpdatedLabel from './LastUpdatedLabel.jsx';
import UserMenu from './UserMenu.jsx';
import DateTime from './DateTime.jsx';
import { CalendarIcon, PlusIcon, MinusIcon } from '../ui/Icon.jsx';
import { useStore } from '../../lib/store.js';
import { useUiStore, toggleCalendar, increaseFontScale, decreaseFontScale } from '../../lib/uiStore.js';

export default function Header({ recordCount, dark, onToggleTheme }) {
  const calendar = useUiStore((u) => u.calendar);
  const currentUser = useStore((s) => s.currentUser);

  return (
    <div className="crm-header">
      <div className="crm-header-top">
        <div>
          <div className="crm-title">پنل مشتریان</div>
          <div className="crm-subtitle">
            {currentUser && <span className="crm-header-greeting">سلام، {currentUser.displayName} 👋</span>}
            <span className="crm-header-chip">{recordCount.toLocaleString('en-US')} رکورد</span>
            <LastUpdatedLabel className="crm-header-chip" />
          </div>
        </div>
        <div className="crm-header-actions">
          <div className="crm-font-scale-group">
            <button type="button" className="crm-theme-toggle" onClick={decreaseFontScale} title="کوچک‌تر کردن متن"><MinusIcon /></button>
            <button type="button" className="crm-theme-toggle" onClick={increaseFontScale} title="بزرگ‌تر کردن متن"><PlusIcon /></button>
          </div>
          <span className="crm-header-divider" />
          <div className="crm-header-actions-group">
            <button type="button" className="crm-theme-toggle" onClick={toggleCalendar} title={calendar === 'jalali' ? 'تقویم شمسی — کلیک برای میلادی' : 'تقویم میلادی — کلیک برای شمسی'}>
              <CalendarIcon />
            </button>
            <ThemeToggle dark={dark} onToggle={onToggleTheme} />
            <SyncButton />
            <NotificationsBell />
          </div>
          <span className="crm-header-divider" />
          <UserMenu />
        </div>
      </div>
      <div className="crm-header-datetime">
        <DateTime />
      </div>
    </div>
  );
}
