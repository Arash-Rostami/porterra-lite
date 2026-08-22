import type { PoolConnection } from 'mysql2/promise';
import type { z } from 'zod';
import { query, withTransaction } from './db.js';
import Utils from './utils.js';
import {
    ACTIVITY_COLS, activityToRow, CATEGORY_COLS, categoryToRow, LEAD_COLS, leadToRow, PRODUCT_COLS, productToRow,
    REMINDER_COLS, reminderToRow, rowsToCompanyMeta, rowToActivity, rowToCategory, rowToLead, rowToProduct,
    rowToReminder, rowToUser, USER_COLS, USER_SAFE_COLS,
} from './mappers.js';
import type { LeadRow, ProductRow, CategoryRow, ActivityRow, ReminderRow, UserRow } from './mappers.js';
import type { Lead } from '../types/lead.js';
import type { Product } from '../types/product.js';
import type { Category } from '../types/category.js';
import type { Activity } from '../types/activity.js';
import type { Reminder } from '../types/reminder.js';
import type { User } from '../types/user.js';
import type { CompanyMeta } from '../types/activity.js';
import type { LeadCreate, LeadUpdate, ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate, Activity as ActivitySchema, ActivityUpdate, Reminder as ReminderSchema, ReminderUpdate, UserUpdate } from './models.js';

export type Conn = PoolConnection | undefined;
export type LeadPatch = z.infer<typeof LeadUpdate>;
export type ProductPatch = z.infer<typeof ProductUpdate>;
export type CategoryPatch = z.infer<typeof CategoryUpdate>;
export type ActivityPatch = z.infer<typeof ActivityUpdate>;
export type ReminderPatch = z.infer<typeof ReminderUpdate>;
export type UserPatch = z.infer<typeof UserUpdate> & { passwordCipher?: string };

const ph = (n: number) => Array(n).fill('?').join(',');
const exec = async (conn: Conn, sql: string, params?: unknown[]): Promise<unknown> => (conn ? (await conn.query(sql, params))[0] : query(sql, params));
const selectCols = (cols: string[]) => cols.map((c) => `\`${c}\``).join(',');
const CATEGORY_NAME_SUBQUERY = '(SELECT `name` FROM `categories` WHERE `id`=?)';

const LEAD_SET = LEAD_COLS.filter((c) => c !== 'id');
const REMINDER_SET = REMINDER_COLS.filter((c) => c !== 'id');
const LEAD_UPDATE = [
    {k: 'converted', col: 'converted'},
    {k: 'company', col: 'company'},
    {k: 'coordinator', col: 'coordinator'},
    {k: 'name', col: 'name'},
    {k: 'phone', col: 'phone'},
    {k: 'product', col: 'product'},
    {k: 'categoryId', col: 'category_id'},
    {k: 'source', col: 'source'},
    {k: 'date', col: 'date'},
    {k: 'price', col: 'price'},
    {k: 'result', col: 'result'},
    {k: 'priority', col: 'priority'},
    {k: 'notes', col: 'notes'},
    {k: 'deactivateReason', col: 'deactivate_reason'},
    {k: 'quotePrice', col: 'quote_price'},
    {k: 'quotePriceType', col: 'quote_price_type'},
    {k: 'quoteTerms', col: 'quote_terms'},
    {k: 'quotePriceDate', col: 'quote_price_date'},
    {k: 'quoteResult', col: 'quote_result'},
    {k: 'quoteResultDate', col: 'quote_result_date'},
    {k: 'quoteFailReason', col: 'quote_fail_reason'},
] as const;

const USER_SELECT = selectCols(USER_COLS);
const USER_SAFE_SELECT = selectCols(USER_SAFE_COLS);
const LEAD_SELECT = selectCols(LEAD_COLS);
const ACTIVITY_SELECT = selectCols(ACTIVITY_COLS);
const REMINDER_SELECT = selectCols(REMINDER_COLS);
const PRODUCT_SELECT = selectCols(PRODUCT_COLS);
const CATEGORY_SELECT = selectCols(CATEGORY_COLS);

export async function listLeads(conn?: Conn): Promise<Lead[]> {
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\``) as LeadRow[];
    return (rows || []).map(rowToLead);
}
export async function getLeadById(id: string, conn?: Conn): Promise<Lead | null> {
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\` WHERE \`id\`=? LIMIT 1`, [id]) as LeadRow[];
    return rows && rows[0] ? rowToLead(rows[0]) : null;
}
export async function findLeadsByCompany(company: string, conn?: Conn): Promise<Lead[]> {
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\` WHERE LOWER(\`company\`)=LOWER(?)`, [company]) as LeadRow[];
    return (rows || []).map(rowToLead);
}
export async function findLatestLeadByCompany(company: string, conn?: Conn): Promise<Lead | null> {
    const matches = await findLeadsByCompany(company, conn);
    return matches.reduce((best: Lead | null, r) => {
        if (!best) return r;
        const dt = Utils.parseDate(r.date);
        const bestDt = Utils.parseDate(best.date);
        return dt && (!bestDt || dt > bestDt) ? r : best;
    }, null);
}
export async function createLead(c: z.infer<typeof LeadCreate>, conn?: Conn): Promise<void> {
    const row = leadToRow(c);
    const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`,\`category\`)
                 VALUES (${ph(LEAD_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})
                 ON DUPLICATE KEY UPDATE ${LEAD_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')},\`category\`=VALUES(\`category\`)`;
    await exec(conn, sql, [...LEAD_COLS.map((c2) => row[c2]), row.category_id]);
}
async function upsertLeads(records: z.infer<typeof LeadCreate>[], conn?: Conn): Promise<void> {
    const onDup = LEAD_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',') + ',`category`=VALUES(`category`)';
    for (let i = 0; i < records.length; i += 250) {
        const rows = records.slice(i, i + 250).map(leadToRow);
        const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`,\`category\`)
                     VALUES ` + rows.map(() => `(${ph(LEAD_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})`).join(',') + ` ON DUPLICATE KEY UPDATE ${onDup}`;
        await exec(conn, sql, rows.flatMap((r) => [...LEAD_COLS.map((c) => r[c]), r.category_id]));
    }
}
export async function updateLead(id: string, patch: LeadPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of LEAD_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'converted' ? (val ? 1 : 0) : (val === '' ? null : val));
    }
    if (patch.categoryId !== undefined) {
        sets.push(`\`category\`=${CATEGORY_NAME_SUBQUERY}`);
        params.push(patch.categoryId);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`contacts\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteLead(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `contacts` WHERE `id`=?', [id]);
}

export async function listActivity(conn?: Conn): Promise<Activity[]> {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\``) as ActivityRow[];
    return (rows || []).map(rowToActivity);
}
export async function getActivityById(id: string, conn?: Conn): Promise<Activity | null> {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`id\`=? LIMIT 1`, [id]) as ActivityRow[];
    return rows && rows[0] ? rowToActivity(rows[0]) : null;
}
export async function createActivity(a: z.infer<typeof ActivitySchema>, conn?: Conn): Promise<void> {
    const row = activityToRow(a);
    const sql = `INSERT INTO \`customer_activity\` (\`${ACTIVITY_COLS.join('`,`')}\`)
                 VALUES (${ph(ACTIVITY_COLS.length)})
                 ON DUPLICATE KEY UPDATE \`type\`=VALUES(\`type\`),
                                         \`ts\`=VALUES(\`ts\`),
                                         \`author\`=VALUES(\`author\`),
                                         \`text\`=VALUES(\`text\`)`;
    await exec(conn, sql, ACTIVITY_COLS.map((c) => row[c]));
}
const ACTIVITY_UPDATE = [
    {k: 'companyKey', col: 'company_key'},
    {k: 'type', col: 'type'},
    {k: 'ts', col: 'ts'},
    {k: 'author', col: 'author'},
    {k: 'text', col: 'text'},
] as const;
export async function updateActivity(id: string, patch: ActivityPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of ACTIVITY_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(val === '' ? null : val);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`customer_activity\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteActivity(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `customer_activity` WHERE `id`=?', [id]);
}

export async function listReminders(conn?: Conn): Promise<Reminder[]> {
    const rows = await exec(conn, `SELECT ${REMINDER_SELECT} FROM \`reminders\``) as ReminderRow[];
    return (rows || []).map(rowToReminder);
}
export async function getReminderById(id: string, conn?: Conn): Promise<Reminder | null> {
    const rows = await exec(conn, `SELECT ${REMINDER_SELECT} FROM \`reminders\` WHERE \`id\`=? LIMIT 1`, [id]) as ReminderRow[];
    return rows && rows[0] ? rowToReminder(rows[0]) : null;
}
export async function createReminder(r: z.infer<typeof ReminderSchema>, conn?: Conn): Promise<void> {
    const row = reminderToRow(r);
    const sql = `INSERT INTO \`reminders\` (\`${REMINDER_COLS.join('`,`')}\`)
                 VALUES (${ph(REMINDER_COLS.length)})
                 ON DUPLICATE KEY UPDATE ${REMINDER_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')}`;
    await exec(conn, sql, REMINDER_COLS.map((c) => row[c]));
}
const REMINDER_UPDATE = [
    {k: 'custKey', col: 'cust_key'},
    {k: 'company', col: 'company'},
    {k: 'dueDate', col: 'due_date'},
    {k: 'dueTime', col: 'due_time'},
    {k: 'forAgent', col: 'for_agent'},
    {k: 'text', col: 'text'},
    {k: 'createdAt', col: 'created_at'},
    {k: 'done', col: 'done'},
] as const;
export async function updateReminder(id: string, patch: ReminderPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of REMINDER_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'done' ? (val ? 1 : 0) : (val === '' ? null : val));
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`reminders\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteReminder(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `reminders` WHERE `id`=?', [id]);
}

export interface BootAgent { agentCode: string; displayName: string; department: string | null }
export interface BootData { records: Lead[]; companyMeta: CompanyMeta; reminders: Reminder[]; products: Product[]; categories: Category[]; agents: BootAgent[] }

export async function loadAllFromDb(): Promise<BootData> {
    const [leadRows, activityRows, reminderRows, productRows, categoryRows, agents] = await Promise.all([
        query<LeadRow>(`SELECT ${LEAD_SELECT} FROM \`contacts\``),
        query<ActivityRow>(`SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\``),
        query<ReminderRow>(`SELECT ${REMINDER_SELECT} FROM \`reminders\``),
        query<ProductRow>(`SELECT ${PRODUCT_SELECT} FROM \`products\``),
        query<CategoryRow>(`SELECT ${CATEGORY_SELECT} FROM \`categories\` ORDER BY \`name\``),
        listActiveAgents(),
    ]);
    return {
        records: leadRows.map(rowToLead),
        companyMeta: rowsToCompanyMeta(activityRows),
        reminders: reminderRows.map(rowToReminder),
        products: productRows.map(rowToProduct),
        categories: categoryRows.map(rowToCategory),
        agents,
    };
}

export async function listActiveAgents(conn?: Conn): Promise<BootAgent[]> {
    const rows = await exec(conn, 'SELECT `agent_code`,`display_name`,`department` FROM `users` WHERE `agent_code` IS NOT NULL AND `active`=1 ORDER BY `display_name`') as UserRow[];
    return (rows || []).map((r) => ({agentCode: r.agent_code as string, displayName: r.display_name as string, department: r.department || null}));
}

export async function listProducts(conn?: Conn): Promise<Product[]> {
    const rows = await exec(conn, `SELECT ${PRODUCT_SELECT} FROM \`products\``) as ProductRow[];
    return (rows || []).map(rowToProduct);
}
export async function getProductById(id: string, conn?: Conn): Promise<Product | null> {
    const rows = await exec(conn, `SELECT ${PRODUCT_SELECT} FROM \`products\` WHERE \`id\`=? LIMIT 1`, [id]) as ProductRow[];
    return rows && rows[0] ? rowToProduct(rows[0]) : null;
}
export async function createProduct(p: z.infer<typeof ProductCreate>, conn?: Conn): Promise<void> {
    const row = productToRow(p);
    const sql = `INSERT INTO \`products\` (\`${PRODUCT_COLS.join('`,`')}\`,\`category\`)
                 VALUES (${ph(PRODUCT_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})`;
    await exec(conn, sql, [...PRODUCT_COLS.map((c) => row[c]), row.category_id]);
}
const PRODUCT_UPDATE = [
    {k: 'name', col: 'name'},
    {k: 'categoryId', col: 'category_id'},
] as const;
export async function updateProduct(id: string, patch: ProductPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of PRODUCT_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(val);
    }
    if (patch.categoryId !== undefined) {
        sets.push(`\`category\`=${CATEGORY_NAME_SUBQUERY}`);
        params.push(patch.categoryId);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`products\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteProduct(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `products` WHERE `id`=?', [id]);
}

export async function listCategories(conn?: Conn): Promise<Category[]> {
    const rows = await exec(conn, `SELECT ${CATEGORY_SELECT} FROM \`categories\` ORDER BY \`name\``) as CategoryRow[];
    return (rows || []).map(rowToCategory);
}
export async function getCategoryById(id: string, conn?: Conn): Promise<Category | null> {
    const rows = await exec(conn, `SELECT ${CATEGORY_SELECT} FROM \`categories\` WHERE \`id\`=? LIMIT 1`, [id]) as CategoryRow[];
    return rows && rows[0] ? rowToCategory(rows[0]) : null;
}
export async function createCategory(c: z.infer<typeof CategoryCreate>, conn?: Conn): Promise<void> {
    const row = categoryToRow(c);
    const sql = `INSERT INTO \`categories\` (\`${CATEGORY_COLS.join('`,`')}\`) VALUES (${ph(CATEGORY_COLS.length)})`;
    await exec(conn, sql, CATEGORY_COLS.map((col) => row[col]));
}
const CATEGORY_UPDATE = [
    {k: 'name', col: 'name'},
    {k: 'isCustom', col: 'is_custom'},
] as const;
export async function updateCategory(id: string, patch: CategoryPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of CATEGORY_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'isCustom' ? (val ? 1 : 0) : val);
    }
    if (!sets.length) return;
    const run = async (c: PoolConnection) => {
        await exec(c, `UPDATE \`categories\` SET ${sets.join(',')} WHERE \`id\`=?`, [...params, id]);
        if (patch.name !== undefined) {
            await exec(c, 'UPDATE `contacts` SET `category`=? WHERE `category_id`=?', [patch.name, id]);
            await exec(c, 'UPDATE `products` SET `category`=? WHERE `category_id`=?', [patch.name, id]);
        }
    };
    return conn ? run(conn) : withTransaction(run);
}
export async function deleteCategory(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `categories` WHERE `id`=?', [id]);
}

export async function reseedLeads(seedRecords: z.infer<typeof LeadCreate>[]): Promise<void> {
    await withTransaction(async (conn) => {
        await exec(conn, 'DELETE FROM `contacts`');
        for (let i = 0; i < seedRecords.length; i += 250) {
            const rows = seedRecords.slice(i, i + 250).map(leadToRow);
            const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`)
                         VALUES ` + rows.map((r) => `(${ph(LEAD_COLS.length)})`).join(',');
            await exec(conn, sql, rows.flatMap((r) => LEAD_COLS.map((c) => r[c])));
        }
    });
}

export async function listUsers(conn?: Conn): Promise<User[]> {
    const rows = await exec(conn, `SELECT ${USER_SAFE_SELECT} FROM \`users\` ORDER BY \`username\``) as UserRow[];
    return (rows || []).map(rowToUser);
}
export async function listUsersRaw(conn?: Conn): Promise<UserRow[]> {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` ORDER BY \`username\``) as UserRow[];
    return rows || [];
}
export async function getUserById(id: string, conn?: Conn): Promise<UserRow | null> {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`id\`=? LIMIT 1`, [id]) as UserRow[];
    return rows && rows[0] ? rows[0] : null;
}
export async function findUserByUsername(username: string, conn?: Conn): Promise<UserRow | null> {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`username\`=? LIMIT 1`, [username]) as UserRow[];
    return rows && rows[0] ? rows[0] : null;
}
export async function findUserByEmail(email: string | null | undefined, conn?: Conn): Promise<UserRow | null> {
    if (!email) return null;
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`email\`=? LIMIT 1`, [email]) as UserRow[];
    return rows && rows[0] ? rows[0] : null;
}
export async function createUser(row: Record<string, unknown>, conn?: Conn): Promise<void> {
    const sql = `INSERT INTO \`users\` (\`${USER_COLS.join('`,`')}\`) VALUES (${ph(USER_COLS.length)})`;
    await exec(conn, sql, USER_COLS.map((c) => row[c]));
}
export async function updateUserLastLogin(id: string, ts: number, conn?: Conn): Promise<void> {
    await exec(conn, 'UPDATE `users` SET `last_login`=? WHERE `id`=?', [ts, id]);
}
export async function setUserActive(id: string, active: boolean, conn?: Conn): Promise<void> {
    await exec(conn, 'UPDATE `users` SET `active`=? WHERE `id`=?', [active ? 1 : 0, id]);
}
const USER_UPDATE = [
    {k: 'displayName', col: 'display_name'},
    {k: 'email', col: 'email'},
    {k: 'agentCode', col: 'agent_code'},
    {k: 'department', col: 'department'},
    {k: 'role', col: 'role'},
    {k: 'passwordCipher', col: 'password_cipher'},
    {k: 'active', col: 'active'},
] as const;
export async function updateUser(id: string, patch: UserPatch, conn?: Conn): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const {k, col} of USER_UPDATE) {
        const val = (patch as Record<string, unknown>)[k];
        if (val === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'active' ? (val ? 1 : 0) : val);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`users\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function listDepartmentNames(conn?: Conn): Promise<string[]> {
    const rows = await exec(conn, 'SELECT DISTINCT `department` FROM `users` WHERE `department` IS NOT NULL ORDER BY `department`') as UserRow[];
    return (rows || []).map((r) => r.department as string);
}
export async function findDepartmentByNormalizedName(name: string | null | undefined, conn?: Conn): Promise<string | null> {
    if (!name) return null;
    const rows = await exec(conn, 'SELECT DISTINCT `department` FROM `users` WHERE `department` IS NOT NULL') as UserRow[];
    const norm = Utils.normSpace(name).toLowerCase();
    const match = (rows || []).find((r) => Utils.normSpace(r.department).toLowerCase() === norm);
    return match ? match.department : null;
}
export async function listAgentCodesByDepartment(department: string | null | undefined, conn?: Conn): Promise<string[]> {
    if (!department) return [];
    const rows = await exec(conn, 'SELECT `agent_code` FROM `users` WHERE `department`=? AND `agent_code` IS NOT NULL', [department]) as UserRow[];
    return (rows || []).map((r) => r.agent_code as string);
}
export async function deleteUser(id: string, conn?: Conn): Promise<void> {
    await exec(conn, 'DELETE FROM `users` WHERE `id`=?', [id]);
}

export async function applyOp(op: string, payload: Record<string, unknown>, conn?: Conn): Promise<unknown> {
    switch (op) {
        case 'createLead':
            return createLead(payload.rec as z.infer<typeof LeadCreate>, conn);
        case 'importRecords':
            return upsertLeads(payload.records as z.infer<typeof LeadCreate>[], conn);
        case 'updateLead':
            return updateLead(payload.id as string, payload.patch as LeadPatch, conn);
        case 'addChangeLog':
            return createActivity({...(payload.activity as z.infer<typeof ActivitySchema>), type: 'change'}, conn);
        case 'addComment':
            return createActivity({...(payload.activity as z.infer<typeof ActivitySchema>), type: 'comment'}, conn);
        case 'addReminder':
            return createReminder(payload.reminder as z.infer<typeof ReminderSchema>, conn);
        case 'markReminderDone':
            return exec(conn, 'UPDATE `reminders` SET `done`=1 WHERE `id`=?', [payload.id]);
        case 'updateActivity':
            return updateActivity(payload.id as string, payload.patch as ActivityPatch, conn);
        case 'deleteActivity':
            return deleteActivity(payload.id as string, conn);
        case 'updateReminder':
            return updateReminder(payload.id as string, payload.patch as ReminderPatch, conn);
        case 'deleteReminder':
            return deleteReminder(payload.id as string, conn);
        case 'createProduct':
            return createProduct(payload.product as z.infer<typeof ProductCreate>, conn);
        case 'updateProduct':
            return updateProduct(payload.id as string, payload.patch as ProductPatch, conn);
        case 'deleteProduct':
            return deleteProduct(payload.id as string, conn);
        case 'createCategory':
            return createCategory(payload.category as z.infer<typeof CategoryCreate>, conn);
        case 'updateCategory':
            return updateCategory(payload.id as string, payload.patch as CategoryPatch, conn);
        case 'deleteCategory':
            return deleteCategory(payload.id as string, conn);
        case 'deleteLead': {
            const run = async (c: Conn) => {
                await deleteLead(payload.id as string, c);
                if (payload.changeLogEntry) await createActivity(payload.changeLogEntry as z.infer<typeof ActivitySchema>, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        default:
            throw new Error('Unknown op: ' + op);
    }
}
