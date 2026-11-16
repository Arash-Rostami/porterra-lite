'use client';
import { useMemo, useState } from 'react';
import Dropdown from '../ui/Dropdown.jsx';
import DateField from '../ui/DateField.jsx';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import { toast } from '../ui/Toast.jsx';
import { PlusIcon } from '../ui/Icon.jsx';
import { buildDayIndex, periodOf, stepCursor, cellLabel, monthKeyOf, isoOf } from '../../lib/calendarEvents.js';
import { JALALI_MONTHS, FA_MONTHS, gregorianToJalali, formatDisplayDate } from '../../lib/calendar.js';
import { coordLabel, scopedCoordOptions } from '../../lib/filters.js';
import { custKey, addReminder, addChangeLogEntry, useStore } from '../../lib/store.js';
import { useUiStore, openProfile } from '../../lib/uiStore.js';

const VIEWS = [{ key: 'month', label: 'ماه' }, { key: 'week', label: 'هفته' }, { key: 'day', label: 'روز' }];
const DOW = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const MAX_CHIPS = 2;
const MAX_DAY_CALLS = 50;

function titleOf(cursor, view, jalali) {
  const [jy, jm, jd] = gregorianToJalali(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  const base = jalali ? `${JALALI_MONTHS[jm - 1]} ${jy}` : `${FA_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  return view === 'day' ? `${jalali ? jd : cursor.getDate()} ${base}` : base;
}

export default function CalendarPanel({ records, reminders }) {
  const calendar = useUiStore((u) => u.calendar);
  const currentUser = useStore((s) => s.currentUser);
  const jalali = calendar === 'jalali';
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState('month');
  const [agent, setAgent] = useState('');
  const [selected, setSelected] = useState(() => isoOf(new Date()));
  const [form, setForm] = useState({ company: '', time: '', text: '', date: '' });

  const index = useMemo(() => buildDayIndex(records, reminders, agent), [records, reminders, agent]);
  const period = useMemo(() => periodOf(cursor, view, jalali), [cursor, view, jalali]);
  const todayIso = isoOf(new Date());
  const day = index.get(selected) || { reminders: [], calls: [] };

  function openCompany(name) {
    const rec = records.find((r) => custKey(r.company) === custKey(name));
    if (rec) openProfile(rec.id);
    else toast('سرنخ این شرکت پیدا نشد');
  }

  function go(next) {
    setCursor(next);
    setSelected(isoOf(next));
  }

  function submitReminder() {
    const company = form.company.trim();
    if (!company || !records.some((r) => custKey(r.company) === custKey(company))) { toast('شرکت را از فهرست شرکت‌ها انتخاب کنید'); return; }
    const dueDate = form.date || selected;
    const key = custKey(company);
    const picked = Array.isArray(agent) ? (agent.length === 1 ? agent[0] : '') : agent;
    const forAgent = picked || currentUser?.agentCode || null;
    if (!forAgent) { toast('کارشناس مربوط به این یادآوری را در فیلتر بالا انتخاب کنید'); return; }
    addReminder({
      id: 'REM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      custKey: key, company, dueDate, dueTime: form.time || null,
      forAgent, text: form.text.trim() || null, createdAt: Date.now(), done: false,
    });
    addChangeLogEntry(key, `یادآوری برای ${dueDate}${form.time ? ' ساعت ' + form.time : ''} ثبت شد`, currentUser?.displayName || currentUser?.username || null);
    setForm({ company: '', time: '', text: '', date: '' });
    toast('یادآوری ثبت شد');
  }

  return (
    <>
    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">افزودن یادآوری</div>
        <span className="crm-reminder-meta">پیش‌فرض تاریخ: {formatDisplayDate(selected.split('-').reverse().join('.'), calendar)}</span>
      </div>
      <div className="crm-reminder-block -visible">
        <div className="crm-reminder-fields">
          <div className="crm-field"><label>شرکت</label><CompanySuggest records={records} className="crm-input" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="نام شرکت را جستجو کنید" /></div>
          <div className="crm-field"><label>تاریخ</label><DateField className="crm-input crm-mono" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
          <div className="crm-field"><label>ساعت</label><input type="time" className="crm-input crm-mono" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          <div className="crm-field"><label>متن یادآوری</label><input type="text" className="crm-input" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') submitReminder(); }} placeholder="مثلاً: پیگیری قیمت" /></div>
        </div>
        <div className="crm-quickcall-actions">
          <button type="button" className="crm-btn-primary" onClick={submitReminder}><PlusIcon />ثبت یادآوری</button>
        </div>
      </div>
    </div>

    <div className="crm-section">
      <div className="crm-section-title-row">
        <div className="crm-section-title">{titleOf(cursor, view, jalali)}</div>
        <div className="crm-sort-toggle-group">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" className={`crm-sort-toggle${view === v.key ? ' -active' : ''}`} onClick={() => setView(v.key)}>{v.label}</button>
          ))}
        </div>
      </div>
      <div className="crm-toolbar">
        <button type="button" className="crm-btn-ghost" onClick={() => go(stepCursor(cursor, view, jalali, -1))}>قبلی</button>
        <button type="button" className="crm-btn-ghost" onClick={() => go(new Date())}>امروز</button>
        <button type="button" className="crm-btn-ghost" onClick={() => go(stepCursor(cursor, view, jalali, 1))}>بعدی</button>
        <Dropdown multiple value={agent} onChange={setAgent} options={scopedCoordOptions(currentUser)} placeholder="همه کارشناسان" />
        <span className="crm-cal-legend"><span className="crm-status-badge -warn">یادآوری</span> <span className="crm-status-badge -progress">تماس</span></span>
      </div>

      <div className={`crm-cal-grid${view === 'day' ? ' -day' : ''}`}>
        {view !== 'day' && DOW.map((d) => <div className="crm-cal-dow" key={d}>{d}</div>)}
        {period.cells.map((date) => {
          const iso = isoOf(date);
          const ev = index.get(iso);
          const out = view === 'month' && monthKeyOf(date, jalali) !== period.monthKey;
          return (
            <div
              key={iso}
              className={`crm-cal-cell${out ? ' -out' : ''}${iso === todayIso ? ' -today' : ''}${iso === selected ? ' -selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={iso === selected}
              aria-label={`${formatDisplayDate(iso.split('-').reverse().join('.'), calendar)} — ${((ev && ev.reminders.length + ev.calls.length) || 0).toLocaleString('en-US')} رویداد`}
              onClick={() => setSelected(iso)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(iso); } }}
            >
              <div className="crm-cal-day">{cellLabel(date, jalali)}</div>
              {ev && ev.reminders.slice(0, MAX_CHIPS).map((rm) => <div key={rm.id} className="crm-status-badge -warn crm-cal-chip">{rm.company || rm.text}</div>)}
              {ev && ev.reminders.length > MAX_CHIPS && <div className="crm-cal-more">+{(ev.reminders.length - MAX_CHIPS).toLocaleString('en-US')}</div>}
              {ev && ev.calls.length > 0 && <div className="crm-status-badge -progress crm-cal-chip">{ev.calls.length.toLocaleString('en-US')} تماس</div>}
            </div>
          );
        })}
      </div>

      <div className="crm-profile-block">
        <div className="crm-profile-block-head"><div className="crm-profile-block-title">{formatDisplayDate(selected.split('-').reverse().join('.'), calendar)}</div></div>
        <div className="crm-reminders-list">
          {!day.reminders.length && !day.calls.length && <div className="crm-feed-empty">رویدادی برای این روز نیست</div>}
          {day.reminders.map((rm) => (
            <div className="crm-reminder-row crm-cal-event" key={rm.id} role="button" tabIndex={0} onClick={() => openCompany(rm.company)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCompany(rm.company); } }}>
              <div className="crm-reminder-main"><b>{rm.company}</b>{rm.text && <div className="crm-reminder-text">{rm.text}</div>}</div>
              <span className="crm-reminder-meta">{rm.dueTime || ''}{rm.forAgent ? ' — ' + coordLabel(rm.forAgent) : ''}</span>
            </div>
          ))}
          {day.calls.slice(0, MAX_DAY_CALLS).map((r) => (
            <div className="crm-reminder-row crm-cal-event" key={r.id} role="button" tabIndex={0} onClick={() => openProfile(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(r.id); } }}>
              <div className="crm-reminder-main"><b>{r.company}</b>{r.notes && <div className="crm-reminder-text">{r.notes}</div>}</div>
              <span className="crm-reminder-meta">{coordLabel(r.coordinator)}</span>
            </div>
          ))}
          {day.calls.length > MAX_DAY_CALLS && <div className="crm-feed-empty">+{(day.calls.length - MAX_DAY_CALLS).toLocaleString('en-US')} تماس دیگر</div>}
        </div>
      </div>
    </div>
    </>
  );
}
