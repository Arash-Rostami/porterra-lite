'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import CompanySuggest from '../ui/CompanySuggest.jsx';
import { toast } from '../ui/Toast.jsx';
import { CheckIcon, XCircleIcon } from '../ui/Icon.jsx';
import { getMessages, sendMessage } from '../../lib/apiClient.js';
import { addComment, custKey, useStore } from '../../lib/store.js';
import { useUiStore } from '../../lib/uiStore.js';
import Utils from '../../lib/utils.js';

const POLL_MS = 20000;
const OVERLAP_MS = 10000;

export default function MessengerPanel({ records }) {
  const calendar = useUiStore((u) => u.calendar);
  const currentUser = useStore((s) => s.currentUser);
  const agents = useStore((s) => s.agents);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [moveId, setMoveId] = useState(null);
  const [moveCompany, setMoveCompany] = useState('');
  const sinceRef = useRef(0);
  const listRef = useRef(null);
  const author = currentUser?.displayName || currentUser?.username || null;

  const load = useCallback(async () => {
    try {
      const res = await getMessages(Math.max(0, sinceRef.current - OVERLAP_MS));
      const fresh = (res && res.messages) || [];
      if (!fresh.length) return;
      sinceRef.current = Math.max(sinceRef.current, fresh[fresh.length - 1].ts);
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const added = fresh.filter((m) => !seen.has(m.id));
        return added.length ? prev.concat(added).sort((a, b) => a.ts - b.ts) : prev;
      });
    } catch {
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await sendMessage(body);
      if (!res || !res.message) {
        toast('ارسال نشد — ارتباط با پایگاه داده برقرار نیست');
        return;
      }
      sinceRef.current = Math.max(sinceRef.current, res.message.ts);
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : prev.concat([res.message])));
      setText('');
    } catch (err) {
      toast('ارسال ناموفق: ' + (err && err.message ? err.message.replace(/^VALIDATION:\s*/, '') : 'خطا'));
    } finally {
      setSending(false);
    }
  }

  function mention(name) {
    setText((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}@${name} `);
  }

  function moveToLead(message) {
    const company = moveCompany.trim();
    if (!company || !records.some((r) => custKey(r.company) === custKey(company))) { toast('شرکت را از فهرست شرکت‌ها انتخاب کنید'); return; }
    addComment(custKey(company), `«پیام‌رسان» ${message.author}: ${message.text}`, author);
    setMoveId(null);
    setMoveCompany('');
    toast('پیام به مکاتبات سرنخ منتقل شد');
  }

  return (
    <div className="crm-section">
      <div className="crm-section-title">پیام‌رسان داخلی</div>
      <div className="crm-feed-list -scroll" ref={listRef}>
        {!messages.length ? <div className="crm-feed-empty">هنوز پیامی نیست</div> : messages.map((m) => (
          <div className="crm-feed-item -comment" key={m.id}>
            <div className="crm-feed-item-head"><b>{m.author}</b><span>{Utils.formatTs(m.ts, calendar)}</span></div>
            <div className="crm-feed-text">{m.text}</div>
            {moveId === m.id ? (
              <div className="crm-quickcall-actions">
                <CompanySuggest records={records} className="crm-input" value={moveCompany} onChange={setMoveCompany} placeholder="شرکت" />
                <button type="button" className="crm-btn-primary" onClick={() => moveToLead(m)}><CheckIcon />انتقال</button>
                <button type="button" className="crm-btn-ghost" onClick={() => setMoveId(null)}><XCircleIcon />انصراف</button>
              </div>
            ) : (
              <div className="crm-quickcall-actions">
                <button type="button" className="crm-btn-ghost" onClick={() => { setMoveId(m.id); setMoveCompany(''); }}>انتقال به مکاتبات سرنخ</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="crm-badge-row">
        {agents.map((a) => (
          <button key={a.agentCode} type="button" className="crm-badge -clickable" onClick={() => mention(a.displayName)}>@{a.displayName}</button>
        ))}
      </div>
      <div className="crm-comment-form">
        <textarea className="crm-textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام برای همه… با @نام کسی را نام ببرید" maxLength={5000}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }} />
        <button type="button" className="crm-btn-primary" disabled={sending} onClick={submit}><CheckIcon />ارسال</button>
      </div>
    </div>
  );
}
