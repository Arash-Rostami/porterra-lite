'use client';
import {useSyncExternalStore, useMemo} from 'react';
import Utils from './utils';
import {SEED_DATA} from '../data/seed.js';
import {toast, toastShownRecently} from '../components/ui/Toast.jsx';
import {setAgentDirectory} from './filters';
import {initLeadPrefsForUser, resetLeadPrefs} from './leadPrefs';
import {
    addChangeLog as addChangeLogAction,
    addComment as addCommentAction,
    addReminder as addReminderAction,
    announceQuotePrice as announceQuotePriceAction,
    createProduct as createProductAction,
    deleteLead as deleteLeadAction,
    deleteProductAction,
    createCategory as createCategoryAction,
    updateCategoryAction,
    deleteCategoryAction,
    deleteReminder as deleteReminderAction,
    importRecords as importRecordsAction,
    loadAllData as loadAllDataAction,
    markReminderDone as markReminderDoneAction,
    resetToSeed as resetToSeedAction,
    resolveQuote as resolveQuoteAction,
    syncNow as syncNowAction,
    updateLead as updateLeadAction,
    updateProductAction,
    updateReminder as updateReminderAction,
    logout as logoutAction,
} from './apiClient';

let state = {
    records: [],
    companyMeta: {},
    reminders: [],
    products: [],
    categories: [],
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

function categoryNameById(id) {
    if (!id) return null;
    const c = state.categories.find((x) => x.id === id);
    return c ? c.name : null;
}

function hydrateAllCategoryNames() {
    state.records = state.records.map((r) => ({...r, category: r.categoryId != null ? categoryNameById(r.categoryId) : (r.category ?? null)}));
    state.products = state.products.map((p) => ({...p, category: p.categoryId != null ? categoryNameById(p.categoryId) : (p.category ?? null)}));
}

function persist(rollback, actionFn) {
    Promise.resolve()
        .then(actionFn)
        .then((res) => {
            if (res && res.queued) {
                state.offline = true;
                state.queueCount = res.queueCount || state.queueCount + 1;
                emit();
                if (!toastShownRecently(600)) toast('ذخیره آفلاین — بعد از اتصال همگام‌سازی می‌شود');
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
        state.companyMeta = (res.data && res.data.companyMeta) || {};
        state.reminders = (res.data && res.data.reminders) || [];
        state.products = (res.data && res.data.products) || [];
        state.categories = (res.data && res.data.categories) || [];
        hydrateAllCategoryNames();
        state.agents = (res.data && res.data.agents) || [];
        setAgentDirectory(state.agents);
        state.currentUser = res.currentUser || null;
        state.offline = !!res.offline;
        state.queueCount = res.queueCount || 0;
        state.loaded = true;
        if (state.currentUser) {
            initLeadPrefsForUser(state.currentUser.username);
        }
        emit();
        if (state.offline) toast('حالت آفلاین — پایگاه داده در دسترس نیست');
    } catch (err) {
        if (isUnauthorized(err)) return redirectToLogin();
        state.records = [];
        state.companyMeta = {};
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
    state.companyMeta = {};
    state.reminders = [];
    state.products = [];
    state.categories = [];
    state.agents = [];
    setAgentDirectory([]);
    state.currentUser = null;
    state.loaded = false;
    state.offline = false;
    state.queueCount = 0;
    resetLeadPrefs();
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
            state.companyMeta = (res.data && res.data.companyMeta) || {};
            state.reminders = (res.data && res.data.reminders) || [];
            state.products = (res.data && res.data.products) || [];
            state.categories = (res.data && res.data.categories) || [];
            hydrateAllCategoryNames();
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
    state.records = newRecords.map((r) => ({...r, category: categoryNameById(r.categoryId)})).concat(prev);
    emit();
    persist(() => {
        state.records = prev;
    }, () => importRecordsAction(newRecords));
}

export function updateRecord(id, patch) {
    const prev = state.records;
    state.records = prev.map((r) => {
        if (r.id !== id) return r;
        const merged = {...r, ...patch};
        if (patch.categoryId !== undefined) merged.category = categoryNameById(patch.categoryId);
        return merged;
    });
    emit();
    persist(() => {
        state.records = prev;
    }, () => updateLeadAction(id, patch));
}

export function deleteRecordWithLog(record) {
    const k = custKey(record.company);
    const prevRecords = state.records;
    const prevMeta = state.companyMeta;
    const existing = prevMeta[k] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'chg-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const text = `یک رکورد تماس (تاریخ ${record.date || '-'}) حذف شد`;
    const entry = {id, ts, text, author: null, type: 'change'};
    state.records = prevRecords.filter((r) => r.id !== record.id);
    // reassign to a NEW object: mutating the nested array in place leaves the ref unchanged and skips the update
    state.companyMeta = {...prevMeta, [k]: {comments: existing.comments, changeLog: [...existing.changeLog, entry]}};
    emit();
    persist(
        () => {
            state.records = prevRecords;
            state.companyMeta = prevMeta;
        },
        () => deleteLeadAction({
            id: record.id,
            changeLogEntry: {id, companyKey: k, type: 'change', ts, author: null, text}
        }),
    );
}

export function addProduct(product) {
    const prev = state.products;
    state.products = prev.concat([{...product, category: categoryNameById(product.categoryId)}]);
    emit();
    persist(() => {
        state.products = prev;
    }, () => createProductAction(product));
}

export function updateProduct(id, patch) {
    const prev = state.products;
    state.products = prev.map((p) => {
        if (p.id !== id) return p;
        const merged = {...p, ...patch};
        if (patch.categoryId !== undefined) merged.category = categoryNameById(patch.categoryId);
        return merged;
    });
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

export function addCategory(category) {
    const prev = state.categories;
    state.categories = prev.concat([category]);
    emit();
    persist(() => {
        state.categories = prev;
    }, () => createCategoryAction(category));
}

export function updateCategory(id, patch) {
    const prev = state.categories;
    const prevRecords = state.records;
    const prevProducts = state.products;
    state.categories = prev.map((c) => (c.id === id ? {...c, ...patch} : c));
    hydrateAllCategoryNames();
    emit();
    persist(() => {
        state.categories = prev;
        state.records = prevRecords;
        state.products = prevProducts;
    }, () => updateCategoryAction(id, patch));
}

export function deleteCategory(id) {
    const prev = state.categories;
    state.categories = prev.filter((c) => c.id !== id);
    emit();
    persist(() => {
        state.categories = prev;
    }, () => deleteCategoryAction(id));
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
export function getCompanyMeta(key) {
    return state.companyMeta[key] || EMPTY_META;
}

export function addChangeLogEntry(key, text, author) {
    const prevMeta = state.companyMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'chg-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const entry = {id, ts, text, author: author || null, type: 'change'};
    state.companyMeta = {...prevMeta, [key]: {comments: existing.comments, changeLog: [...existing.changeLog, entry]}};
    emit();
    persist(
        () => {
            state.companyMeta = prevMeta;
        },
        () => addChangeLogAction({id, companyKey: key, type: 'change', ts, author: author || null, text}),
    );
}

export function addComment(key, text, author) {
    const prevMeta = state.companyMeta;
    const existing = prevMeta[key] || {comments: [], changeLog: []};
    const ts = Date.now();
    const id = 'cmt-' + ts + '-' + Math.random().toString(36).slice(2, 6);
    const entry = {id, ts, text, author: author || null, type: 'comment'};
    state.companyMeta = {...prevMeta, [key]: {comments: [...existing.comments, entry], changeLog: existing.changeLog}};
    emit();
    persist(
        () => {
            state.companyMeta = prevMeta;
        },
        () => addCommentAction({id, companyKey: key, type: 'comment', ts, author, text}),
    );
}

export function getUnifiedFeed(key) {
    const meta = getCompanyMeta(key);
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
    const parseDue = (rm) => Utils.parseDate(Utils.fromISODate(rm.dueDate));
    return reminders.filter((rm) => {
        if (rm.done) return false;
        const dt = parseDue(rm);
        return dt && dt <= now;
    }).sort((a, b) => parseDue(a) - parseDue(b));
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

export function findLatestComment(companyMeta, records) {
    let latest = null, latestKey = null;
    for (const key in companyMeta) {
        for (const c of companyMeta[key].comments) {
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
    const companyMeta = useStore((s) => s.companyMeta);
    const currentUser = useStore((s) => s.currentUser);

    return useMemo(() => {
        const agentCode = currentUser?.role === 'agent' ? (currentUser?.agentCode || null) : null;
        if (!agentCode) {
            return {records, reminders, companyMeta, currentUser};
        }
        const scopedRecords = records.filter((r) => r.coordinator === agentCode);
        const scopedReminders = reminders.filter((rm) => rm.forAgent === agentCode);
        const scopedMeta = {};
        for (const r of scopedRecords) {
            const k = custKey(r.company);
            if (companyMeta[k] && !scopedMeta[k]) scopedMeta[k] = companyMeta[k];
        }
        return {records: scopedRecords, reminders: scopedReminders, companyMeta: scopedMeta, currentUser};
    }, [records, reminders, companyMeta, currentUser]);
}