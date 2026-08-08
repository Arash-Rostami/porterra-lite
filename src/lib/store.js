'use client';
import {useSyncExternalStore, useMemo} from 'react';
import Utils from './utils.js';
import {SEED_DATA} from '../data/seed.js';
import {toast} from '../components/ui/Toast.jsx';
import {initScopeForUser, useUiStore} from './uiStore.js';
import {setAgentDirectory} from './filters.js';
import {initContactPrefsForUser, resetContactPrefs} from './contactPrefs.js';
import {
    addChangeLog as addChangeLogAction,
    addComment as addCommentAction,
    addReminder as addReminderAction,
    announceQuotePrice as announceQuotePriceAction,
    createProduct as createProductAction,
    deleteActivity as deleteActivityAction,
    deleteContact as deleteContactAction,
    deleteProductAction,
    deleteReminder as deleteReminderAction,
    importRecords as importRecordsAction,
    loadAllData as loadAllDataAction,
    markReminderDone as markReminderDoneAction,
    resetToSeed as resetToSeedAction,
    resolveQuote as resolveQuoteAction,
    syncNow as syncNowAction,
    updateActivity as updateActivityAction,
    updateContact as updateContactAction,
    updateProductAction,
    updateReminder as updateReminderAction,
    logout as logoutAction,
} from './apiClient.js';

let state = {
    records: [],
    customerMeta: {},
    reminders: [],
    products: [],
    agents: [],
    currentUser: null,
    loaded: false,
    loading: false,
    offline: false,
    queueCount: 0,
    syncing: false,
    lastUpdated: 0
};
const listeners = new Set();

function emit() {
    state.lastUpdated = Date.now();
    for (const l of listeners) l();
}

function redirectToLogin() {
    if (typeof window !== 'undefined') window.location.assign('/login');
}

function isUnauthorized(err) {
    return err && (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN');
}

export function custKey(company) {
    return Utils.normSpace(company).toLowerCase();
}

function persist(rollback, actionFn) {
    Promise.resolve()
        .then(actionFn)
        .then((res) => {
            if (res && res.queued) {
                state.offline = true;
                state.queueCount = res.queueCount || state.queueCount + 1;
                emit();
                toast('ذخیره آفلاین — بعد از اتصال همگام‌سازی می‌شود');
            }
        })
        .catch((err) => {
            rollback();
            emit();
            if (isUnauthorized(err)) return redirectToLogin();
            toast('ذخیره ناموفق: ' + (err && err.message ? err.message : 'خطا'));
        });
}

export async function loadAll() {
    if (typeof window === 'undefined' || state.loaded || state.loading) return;
    state.loading = true;
    try {
        const res = await loadAllDataAction();
        if (res && res.unauthorized) return redirectToLogin();
        state.records = (res.data && res.data.records) || [];
        state.customerMeta = (res.data && res.data.customerMeta) || {};
        state.reminders = (res.data && res.data.reminders) || [];
        state.products = (res.data && res.data.products) || [];
        state.agents = (res.data && res.data.agents) || [];
        setAgentDirectory(state.agents);
        state.currentUser = res.currentUser || null;
        state.offline = !!res.offline;
        state.queueCount = res.queueCount || 0;
        state.loaded = true;
        if (state.currentUser) {
            initScopeForUser(state.currentUser.username);
            initContactPrefsForUser(state.currentUser.username);
        }
        emit();
        if (state.offline) toast('حالت آفلاین — پایگاه داده در دسترس نیست');
    } catch (err) {
        if (isUnauthorized(err)) return redirectToLogin();
        state.records = [];
        state.customerMeta = {};
        state.reminders = [];
        state.offline = true;
        state.loaded = true;
        emit();
        toast('اتصال به پایگاه داده ناموفق بود');
    } finally {
        state.loading = false;
    }
}

export async function logout() {
    try {
        await logoutAction();
    } catch {
    }
    state.records = [];
    state.customerMeta = {};
    state.reminders = [];
    state.products = [];
    state.agents = [];
    setAgentDirectory([]);
    state.currentUser = null;
    state.loaded = false;
    state.offline = false;
    state.queueCount = 0;
    resetContactPrefs();
    emit();
    redirectToLogin();
}

export async function syncNow() {
    if (state.syncing) return;
    state.syncing = true;
    emit();
    try {
        const res = await syncNowAction();
        if (res && res.error) {
            toast('همگام‌سازی ناموفق — دوباره تلاش کنید');
        } else {
            state.records = (res.data && res.data.records) || [];
            state.customerMeta = (res.data && res.data.customerMeta) || {};
            state.reminders = (res.data && res.data.reminders) || [];
            state.products = (res.data && res.data.products) || [];
            state.agents = (res.data && res.data.agents) || [];
            setAgentDirectory(state.agents);
            state.offline = false;
            state.queueCount = 0;
            emit();
            toast('همگام‌سازی شد' + (res.synced ? ` (${res.synced} مورد)` : ''));
        }
    } catch (err) {
        if (isUnauthorized(err)) return redirectToLogin();
        toast('همگام‌سازی ناموفق بود');
    } finally {
        state.syncing = false;
        emit();
    }
}

export function resetToSeed() {
    const prev = state.records;
    state.records = SEED_DATA.slice();
    emit();
    persist(() => {
        state.records = prev;
    }, () => resetToSeedAction());
}

export function addRecords(newRecords) {
    const prev = state.records;
    state.records = newRecords.concat(prev);
    emit();
    persist(() => {
        state.records = prev;
    }, () => importRecordsAction(newRecords));
}

export function updateRecord(id, patch) {
    const prev = state.records;
    state.records = prev.map((r) => (r.id === id ? {...r, ...patch} : r));
    emit();
    persist(() => {
        state.records = prev;
    }, () => updateContactAction(id, patch));
}

export function deleteRecordById(id) {
    const prev = state.records;
    state.records = prev.filter((r) => r.id !== id);
    emit();
    persist(() => {
        state.records = prev;
    }, () => deleteContactAction({id}));
}

export function deleteRecordWithLog(record) {
    const k = custKey(record.company);
    const prevRecords = state.records;
    const prevMeta = state.customerMeta;
    const existing = prevMeta[k] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'chg-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const text = `یک رکورد تماس (تاریخ ${record.date || '-'}) حذف شد`;
    const entry = {id, ts, text, author: null, type: 'change'};
    state.records = prevRecords.filter((r) => r.id !== record.id);
    // reassign to a NEW object: mutating the nested array in place leaves the ref unchanged and skips the update
    state.customerMeta = {...prevMeta, [k]: {comments: existing.comments, changeLog: [...existing.changeLog, entry]}};
    emit();
    persist(
        () => {
            state.records = prevRecords;
            state.customerMeta = prevMeta;
        },
        () => deleteContactAction({
            id: record.id,
            changeLogEntry: {id, companyKey: k, type: 'change', ts, author: null, text}
        }),
    );
}

export function addProduct(product) {
    const prev = state.products;
    state.products = prev.concat([product]);
    emit();
    persist(() => {
        state.products = prev;
    }, () => createProductAction(product));
}

export function updateProduct(id, patch) {
    const prev = state.products;
    state.products = prev.map((p) => (p.id === id ? {...p, ...patch} : p));
    emit();
    persist(() => {
        state.products = prev;
    }, () => updateProductAction(id, patch));
}

export function deleteProduct(id) {
    const prev = state.products;
    state.products = prev.filter((p) => p.id !== id);
    emit();
    persist(() => {
        state.products = prev;
    }, () => deleteProductAction(id));
}

export function announceQuotePrice(id, price, priceType, terms) {
    const prev = state.records;
    const quotePriceDate = Utils.todayDdMmYyyy();
    state.records = prev.map((r) => (r.id === id ? {...r, quotePrice: price, quotePriceType: priceType, quoteTerms: terms, quotePriceDate} : r));
    emit();
    persist(() => {
        state.records = prev;
    }, () => announceQuotePriceAction(id, price, priceType, terms));
}

export function resolveQuote(id, result, failReason) {
    const prev = state.records;
    const quoteResultDate = Utils.todayDdMmYyyy();
    state.records = prev.map((r) => (r.id === id ? {
        ...r, quoteResult: result, quoteResultDate,
        quoteFailReason: result === 'ناموفق' ? (failReason || null) : null,
        converted: result === 'موفق' ? true : r.converted,
    } : r));
    emit();
    persist(() => {
        state.records = prev;
    }, () => resolveQuoteAction(id, result, failReason));
}

const EMPTY_META = Object.freeze({comments: [], changeLog: []});
export function getCustomerMeta(key) {
    return state.customerMeta[key] || EMPTY_META;
}

export function addChangeLogEntry(key, text, author) {
    const prevMeta = state.customerMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'chg-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const entry = {id, ts, text, author: author || null, type: 'change'};
    state.customerMeta = {...prevMeta, [key]: {comments: existing.comments, changeLog: [...existing.changeLog, entry]}};
    emit();
    persist(
        () => {
            state.customerMeta = prevMeta;
        },
        () => addChangeLogAction({id, companyKey: key, type: 'change', ts, author: author || null, text}),
    );
}

export function addComment(key, text, author) {
    const prevMeta = state.customerMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'cmt-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const entry = {id, ts, text, author: author || null, type: 'comment'};
    state.customerMeta = {...prevMeta, [key]: {comments: [...existing.comments, entry], changeLog: existing.changeLog}};
    emit();
    persist(
        () => {
            state.customerMeta = prevMeta;
        },
        () => addCommentAction({id, companyKey: key, type: 'comment', ts, author, text}),
    );
}

// no UI calls these yet — kept for a complete client CRUD surface matching the server actions
export function updateComment(key, id, patch) {
    const prevMeta = state.customerMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    state.customerMeta = {
        ...prevMeta,
        [key]: {
            comments: existing.comments.map((c) => (c.id === id ? {...c, ...patch} : c)),
            changeLog: existing.changeLog,
        },
    };
    emit();
    persist(() => {
        state.customerMeta = prevMeta;
    }, () => updateActivityAction(id, patch));
}

export function deleteComment(key, id) {
    const prevMeta = state.customerMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    state.customerMeta = {
        ...prevMeta,
        [key]: {comments: existing.comments.filter((c) => c.id !== id), changeLog: existing.changeLog},
    };
    emit();
    persist(() => {
        state.customerMeta = prevMeta;
    }, () => deleteActivityAction(id));
}

export function getUnifiedFeed(key) {
    const meta = getCustomerMeta(key);
    return meta.comments.concat(meta.changeLog).sort((a, b) => b.ts - a.ts);
}

export function useStore(selector) {
    return useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => selector(state),
        () => selector(state),
    );
}

export function getDueReminders(reminders) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return reminders.filter((rm) => {
        if (rm.done) return false;
        const dt = Utils.parseDate(rm.dueDate);
        return dt && dt <= now;
    }).sort((a, b) => Utils.parseDate(a.dueDate) - Utils.parseDate(b.dueDate));
}

export function markReminderDone(id) {
    const prev = state.reminders;
    state.reminders = prev.map((r) => (r.id === id ? {...r, done: true} : r));
    emit();
    persist(() => {
        state.reminders = prev;
    }, () => markReminderDoneAction(id));
}

export function addReminder(reminder) {
    const prev = state.reminders;
    state.reminders = prev.concat([reminder]);
    emit();
    persist(() => {
        state.reminders = prev;
    }, () => addReminderAction(reminder));
}

export function updateReminder(id, patch) {
    const prev = state.reminders;
    state.reminders = prev.map((r) => (r.id === id ? {...r, ...patch} : r));
    emit();
    persist(() => {
        state.reminders = prev;
    }, () => updateReminderAction(id, patch));
}

export function deleteReminder(id) {
    const prev = state.reminders;
    state.reminders = prev.filter((r) => r.id !== id);
    emit();
    persist(() => {
        state.reminders = prev;
    }, () => deleteReminderAction(id));
}

export function findLatestComment(customerMeta, records) {
    let latest = null, latestKey = null;
    for (const key in customerMeta) {
        for (const c of customerMeta[key].comments) {
            if (!latest || c.ts > latest.ts) {
                latest = c;
                latestKey = key;
            }
        }
    }
    if (!latest) return null;
    const rec = records.find((r) => custKey(r.company) === latestKey);
    return {comment: latest, record: rec || null, companyLabel: rec ? rec.company : latestKey};
}

export function useScopedData() {
    const records = useStore((s) => s.records);
    const reminders = useStore((s) => s.reminders);
    const customerMeta = useStore((s) => s.customerMeta);
    const currentUser = useStore((s) => s.currentUser);
    const scope = useUiStore((u) => u.scope);

    return useMemo(() => {
        const agentCode = currentUser?.agentCode || null;
        if (scope !== 'mine' || !agentCode) {
            return {records, reminders, customerMeta, scope, currentUser};
        }
        const scopedRecords = records.filter((r) => r.coordinator === agentCode);
        const scopedReminders = reminders.filter((rm) => rm.forAgent === agentCode);
        const scopedMeta = {};
        for (const r of scopedRecords) {
            const k = custKey(r.company);
            if (customerMeta[k] && !scopedMeta[k]) scopedMeta[k] = customerMeta[k];
        }
        return {records: scopedRecords, reminders: scopedReminders, customerMeta: scopedMeta, scope, currentUser};
    }, [records, reminders, customerMeta, currentUser, scope]);
}