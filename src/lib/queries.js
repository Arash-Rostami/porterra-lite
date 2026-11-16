import {query, withTransaction} from './db.js';
import Utils from './utils.js';
import {companyKey} from './companies.js';
import {
    ACTIVITY_COLS,
    activityToRow,
    CATEGORY_COLS,
    categoryToRow,
    LEAD_COLS,
    leadToRow,
    NOTIFICATION_COLS,
    notificationToRow,
    PRODUCT_COLS,
    productToRow,
    REMINDER_COLS,
    reminderToRow,
    rowsToCompanyMeta,
    rowToActivity,
    rowToCategory,
    rowToLead,
    rowToNotification,
    rowToProduct,
    rowToReminder,
    rowToUser,
    USER_COLS,
    USER_SAFE_COLS,
} from './mappers.js';

const ph = (n) => Array(n).fill('?').join(',');
const exec = async (conn, sql, params) => (conn ? (await conn.query(sql, params))[0] : query(sql, params));
const selectCols = (cols) => cols.map((c) => `\`${c}\``).join(',');
const CATEGORY_NAME_SUBQUERY = '(SELECT `name` FROM `categories` WHERE `id`=?)';

const LEAD_SET = LEAD_COLS.filter((c) => c !== 'id');
const REMINDER_SET = REMINDER_COLS.filter((c) => c !== 'id');
const NOTIFICATION_SET = NOTIFICATION_COLS.filter((c) => c !== 'id');
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
    {k: 'temperature', col: 'temperature'},
];

const USER_SELECT = selectCols(USER_COLS);
const USER_SAFE_SELECT = selectCols(USER_SAFE_COLS);
const LEAD_SELECT = selectCols(LEAD_COLS);
const ACTIVITY_SELECT = selectCols(ACTIVITY_COLS);
const REMINDER_SELECT = selectCols(REMINDER_COLS);
const NOTIFICATION_SELECT = selectCols(NOTIFICATION_COLS);
const PRODUCT_SELECT = selectCols(PRODUCT_COLS);
const CATEGORY_SELECT = selectCols(CATEGORY_COLS);

export async function listLeads(conn) {
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\``);
    return (rows || []).map(rowToLead);
}
export async function getLeadById(id, conn) {
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToLead(rows[0]) : null;
}
export async function findLeadsByCompany(company, conn) {
    const ids = (await findLeadRefsByKey(companyKey(company), conn)).map((r) => r.id);
    if (!ids.length) return [];
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\` WHERE \`id\` IN (?)`, [ids]);
    return (rows || []).map(rowToLead);
}
export async function findExistingLeadIds(ids, conn) {
    if (!ids.length) return [];
    const rows = await exec(conn, 'SELECT `id` FROM `contacts` WHERE `id` IN (?)', [ids]);
    return (rows || []).map((r) => r.id);
}
const FOLDED_COMPANY = 'REPLACE(REPLACE(REPLACE(LOWER(`company`), ?, ?), ?, ?), ?, ?)';
const FOLD_PARAMS = [0x64A, 0x6CC, 0x649, 0x6CC, 0x643, 0x6A9].map((c) => String.fromCharCode(c));
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

async function companyRowsByKey(columns, key, conn) {
    if (!key) return [];
    const pattern = '%' + key.split(' ').filter(Boolean).map(escapeLike).join('%') + '%';
    const rows = await exec(conn, `SELECT ${columns} FROM \`contacts\` WHERE ${FOLDED_COMPANY} LIKE ?`, [...FOLD_PARAMS, pattern]);
    return (rows || []).filter((r) => companyKey(r.company) === key);
}
export function findLeadRefsByKey(key, conn) {
    return companyRowsByKey('`id`,`company`,`coordinator`', key, conn);
}
function assertRefsInScope(refs, scope) {
    if (scope && scope.type === 'all') return;
    const covers = (code) => !!scope && (scope.type === 'own' ? scope.agentCode != null && code === scope.agentCode : (scope.agentCodes || []).includes(code));
    if (!refs.every((r) => covers(r.coordinator))) {
        throw Object.assign(new Error('VALIDATION: این شرکت تماس‌هایی از کارشناس دیگری دارد و شما اجازه تغییر آن را ندارید'), { code: 'VALIDATION' });
    }
}
export async function renameCompany(oldKey, newName, conn, allowMerge = false, scope = null) {
    const newKey = companyKey(newName);
    if (!allowMerge && oldKey !== newKey && (await findLeadRefsByKey(newKey, conn)).length) {
        throw Object.assign(new Error('VALIDATION: این نام برای شرکت دیگری ثبت شده؛ ادغام فقط توسط مدیر انجام می‌شود'), { code: 'VALIDATION' });
    }
    const refs = await findLeadRefsByKey(oldKey, conn);
    assertRefsInScope(refs, scope);
    const ids = refs.map((r) => r.id);
    if (ids.length) await exec(conn, 'UPDATE `contacts` SET `company`=? WHERE `id` IN (?)', [newName, ids]);
    await exec(conn, "UPDATE `customer_activity` SET `company_key`=? WHERE `company_key`=? AND `type`<>'message'", [newKey, oldKey]);
    await exec(conn, 'UPDATE `reminders` SET `cust_key`=?, `company`=? WHERE `cust_key`=?', [newKey, newName, oldKey]);
    await exec(conn, 'UPDATE `notifications` SET `cust_key`=?, `company`=? WHERE `cust_key`=?', [newKey, newName, oldKey]);
}
export async function deleteCompany(key, conn, scope = null) {
    const refs = await findLeadRefsByKey(key, conn);
    assertRefsInScope(refs, scope);
    const ids = refs.map((r) => r.id);
    if (ids.length) await exec(conn, 'DELETE FROM `contacts` WHERE `id` IN (?)', [ids]);
    await exec(conn, "DELETE FROM `customer_activity` WHERE `company_key`=? AND `type`<>'message'", [key]);
    await exec(conn, 'DELETE FROM `reminders` WHERE `cust_key`=?', [key]);
    await exec(conn, 'DELETE FROM `notifications` WHERE `cust_key`=?', [key]);
}
export async function findLatestLeadByCompany(company, conn) {
    const matches = await findLeadsByCompany(company, conn);
    return matches.reduce((best, r) => {
        if (!best) return r;
        const dt = Utils.parseDate(r.date);
        const bestDt = Utils.parseDate(best.date);
        return dt && (!bestDt || dt > bestDt) ? r : best;
    }, null);
}
export async function createLead(c, conn) {
    const row = leadToRow(c);
    const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`,\`category\`)
                 VALUES (${ph(LEAD_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})
                 ON DUPLICATE KEY UPDATE \`id\`=\`id\``;
    await exec(conn, sql, [...LEAD_COLS.map((c2) => row[c2]), row.category_id]);
}
async function upsertLeads(records, conn) {
    for (let i = 0; i < records.length; i += 250) {
        const rows = records.slice(i, i + 250).map(leadToRow);
        const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`,\`category\`)
                     VALUES ` + rows.map(() => `(${ph(LEAD_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})`).join(',') + ' ON DUPLICATE KEY UPDATE `id`=`id`';
        await exec(conn, sql, rows.flatMap((r) => [...LEAD_COLS.map((c) => r[c]), r.category_id]));
    }
}
export async function updateLead(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of LEAD_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'converted' ? (patch[k] ? 1 : 0) : (patch[k] === '' ? null : patch[k]));
    }
    if (patch.categoryId !== undefined) {
        sets.push(`\`category\`=${CATEGORY_NAME_SUBQUERY}`);
        params.push(patch.categoryId);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`contacts\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteLead(id, conn) {
    await exec(conn, 'DELETE FROM `contacts` WHERE `id`=?', [id]);
}

export async function listActivity(conn) {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`type\`<>'message'`);
    return (rows || []).map(rowToActivity);
}
export async function listMessages(since, conn) {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`type\`='message' AND \`ts\`>? ORDER BY \`ts\` DESC LIMIT 200`, [since]);
    return (rows || []).map(rowToActivity).reverse();
}
export async function getActivityById(id, conn) {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToActivity(rows[0]) : null;
}
export async function createActivity(a, conn) {
    const row = activityToRow(a);
    const sql = `INSERT INTO \`customer_activity\` (\`${ACTIVITY_COLS.join('`,`')}\`)
                 VALUES (${ph(ACTIVITY_COLS.length)})
                 ON DUPLICATE KEY UPDATE \`id\`=\`id\``;
    await exec(conn, sql, ACTIVITY_COLS.map((c) => row[c]));
}
const ACTIVITY_UPDATE = [
    {k: 'text', col: 'text'},
];
export async function updateActivity(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of ACTIVITY_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(patch[k] === '' ? null : patch[k]);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`customer_activity\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteActivity(id, conn) {
    await exec(conn, 'DELETE FROM `customer_activity` WHERE `id`=?', [id]);
}

export async function listReminders(conn) {
    const rows = await exec(conn, `SELECT ${REMINDER_SELECT} FROM \`reminders\``);
    return (rows || []).map(rowToReminder);
}
export async function getReminderById(id, conn) {
    const rows = await exec(conn, `SELECT ${REMINDER_SELECT} FROM \`reminders\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToReminder(rows[0]) : null;
}
export async function createReminder(r, conn) {
    const row = reminderToRow(r);
    const sql = `INSERT INTO \`reminders\` (\`${REMINDER_COLS.join('`,`')}\`)
                 VALUES (${ph(REMINDER_COLS.length)})
                 ON DUPLICATE KEY UPDATE \`id\`=\`id\``;
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
];
export async function updateReminder(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of REMINDER_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'done' ? (patch[k] ? 1 : 0) : (patch[k] === '' ? null : patch[k]));
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`reminders\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteReminder(id, conn) {
    await exec(conn, 'DELETE FROM `reminders` WHERE `id`=?', [id]);
}

export async function listNotifications(conn) {
    const rows = await exec(conn, `SELECT ${NOTIFICATION_SELECT} FROM \`notifications\``);
    return (rows || []).map(rowToNotification);
}
export async function listNotificationsFor(forAgent, conn) {
    const rows = await exec(conn, `SELECT ${NOTIFICATION_SELECT} FROM \`notifications\` WHERE \`for_agent\`=?`, [forAgent]);
    return (rows || []).map(rowToNotification);
}
export async function createNotification(notif, conn) {
    const row = notificationToRow(notif);
    const sql = `INSERT INTO \`notifications\` (\`${NOTIFICATION_COLS.join('`,`')}\`)
                 VALUES (${ph(NOTIFICATION_COLS.length)})
                 ON DUPLICATE KEY UPDATE ${NOTIFICATION_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')}`;
    await exec(conn, sql, NOTIFICATION_COLS.map((c) => row[c]));
}
export async function markNotificationRead(id, forAgent, conn) {
    await exec(conn, 'UPDATE `notifications` SET `is_read`=1 WHERE `id`=? AND `for_agent`=?', [id, forAgent]);
}
export async function markAllNotificationsRead(forAgent, conn) {
    await exec(conn, 'UPDATE `notifications` SET `is_read`=1 WHERE `for_agent`=? AND `is_read`=0', [forAgent]);
}
export async function findCompanyOwnerByCustKey(key, conn) {
    const rows = await companyRowsByKey('`coordinator`,`company`,`contact_date`', key, conn);
    let best = null;
    for (const r of rows) {
        if (!best || (r.contact_date && (!best.contact_date || r.contact_date > best.contact_date))) best = r;
    }
    return best ? { coordinator: best.coordinator, company: best.company } : null;
}

export async function loadAllFromDb() {
    const [leadRows, activityRows, reminderRows, notificationRows, productRows, categoryRows, agents] = await Promise.all([
        query(`SELECT ${LEAD_SELECT} FROM \`contacts\``),
        query(`SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`type\`<>'message'`),
        query(`SELECT ${REMINDER_SELECT} FROM \`reminders\``),
        query(`SELECT ${NOTIFICATION_SELECT} FROM \`notifications\``),
        query(`SELECT ${PRODUCT_SELECT} FROM \`products\``),
        query(`SELECT ${CATEGORY_SELECT} FROM \`categories\` ORDER BY \`name\``),
        listActiveAgents(),
    ]);
    return {
        records: leadRows.map(rowToLead),
        companyMeta: rowsToCompanyMeta(activityRows),
        reminders: reminderRows.map(rowToReminder),
        notifications: notificationRows.map(rowToNotification),
        products: productRows.map(rowToProduct),
        categories: categoryRows.map(rowToCategory),
        agents,
    };
}

export async function listActiveAgents(conn) {
    const rows = await exec(conn, 'SELECT `agent_code`,`display_name`,`department` FROM `users` WHERE `agent_code` IS NOT NULL AND `active`=1 ORDER BY `display_name`');
    return (rows || []).map((r) => ({agentCode: r.agent_code, displayName: r.display_name, department: r.department || null}));
}

export async function listProducts(conn) {
    const rows = await exec(conn, `SELECT ${PRODUCT_SELECT} FROM \`products\``);
    return (rows || []).map(rowToProduct);
}
export async function getProductById(id, conn) {
    const rows = await exec(conn, `SELECT ${PRODUCT_SELECT} FROM \`products\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToProduct(rows[0]) : null;
}
export async function createProduct(p, conn) {
    const row = productToRow(p);
    const sql = `INSERT INTO \`products\` (\`${PRODUCT_COLS.join('`,`')}\`,\`category\`)
                 VALUES (${ph(PRODUCT_COLS.length)}, ${CATEGORY_NAME_SUBQUERY})`;
    try {
        await exec(conn, sql, [...PRODUCT_COLS.map((c) => row[c]), row.category_id]);
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY' && await getProductById(p.id, conn)) return;
        throw err;
    }
}
const PRODUCT_UPDATE = [
    {k: 'name', col: 'name'},
    {k: 'categoryId', col: 'category_id'},
];
export async function updateProduct(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of PRODUCT_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(patch[k]);
    }
    if (patch.categoryId !== undefined) {
        sets.push(`\`category\`=${CATEGORY_NAME_SUBQUERY}`);
        params.push(patch.categoryId);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`products\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteProduct(id, conn) {
    await exec(conn, 'DELETE FROM `products` WHERE `id`=?', [id]);
}

export async function listCategories(conn) {
    const rows = await exec(conn, `SELECT ${CATEGORY_SELECT} FROM \`categories\` ORDER BY \`name\``);
    return (rows || []).map(rowToCategory);
}
export async function getCategoryById(id, conn) {
    const rows = await exec(conn, `SELECT ${CATEGORY_SELECT} FROM \`categories\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToCategory(rows[0]) : null;
}
export async function createCategory(c, conn) {
    const row = categoryToRow(c);
    const sql = `INSERT INTO \`categories\` (\`${CATEGORY_COLS.join('`,`')}\`) VALUES (${ph(CATEGORY_COLS.length)})`;
    try {
        await exec(conn, sql, CATEGORY_COLS.map((col) => row[col]));
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY' && await getCategoryById(c.id, conn)) return;
        throw err;
    }
}
const CATEGORY_UPDATE = [
    {k: 'name', col: 'name'},
    {k: 'isCustom', col: 'is_custom'},
];
export async function updateCategory(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of CATEGORY_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'isCustom' ? (patch[k] ? 1 : 0) : patch[k]);
    }
    if (!sets.length) return;
    const run = async (c) => {
        await exec(c, `UPDATE \`categories\` SET ${sets.join(',')} WHERE \`id\`=?`, [...params, id]);
        if (patch.name !== undefined) {
            await exec(c, 'UPDATE `contacts` SET `category`=? WHERE `category_id`=?', [patch.name, id]);
            await exec(c, 'UPDATE `products` SET `category`=? WHERE `category_id`=?', [patch.name, id]);
        }
    };
    return conn ? run(conn) : withTransaction(run);
}
export async function deleteCategory(id, conn) {
    await exec(conn, 'DELETE FROM `categories` WHERE `id`=?', [id]);
}

export async function listUsers(conn) {
    const rows = await exec(conn, `SELECT ${USER_SAFE_SELECT} FROM \`users\` ORDER BY \`username\``);
    return (rows || []).map(rowToUser);
}
export async function listUsersRaw(conn) {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` ORDER BY \`username\``);
    return rows || [];
}
export async function getUserById(id, conn) {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rows[0] : null;
}
export async function findUserByUsername(username, conn) {
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`username\`=? LIMIT 1`, [username]);
    return rows && rows[0] ? rows[0] : null;
}
export async function findUserByEmail(email, conn) {
    if (!email) return null;
    const rows = await exec(conn, `SELECT ${USER_SELECT} FROM \`users\` WHERE \`email\`=? LIMIT 1`, [email]);
    return rows && rows[0] ? rows[0] : null;
}
export async function createUser(row, conn) {
    const sql = `INSERT INTO \`users\` (\`${USER_COLS.join('`,`')}\`) VALUES (${ph(USER_COLS.length)})`;
    await exec(conn, sql, USER_COLS.map((c) => row[c]));
}
export async function updateUserLastLogin(id, ts, conn) {
    await exec(conn, 'UPDATE `users` SET `last_login`=? WHERE `id`=?', [ts, id]);
}
export async function setUserActive(id, active, conn) {
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
];
export async function updateUser(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const {k, col} of USER_UPDATE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${col}\`=?`);
        params.push(k === 'active' ? (patch[k] ? 1 : 0) : patch[k]);
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`users\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function listDepartmentNames(conn) {
    const rows = await exec(conn, 'SELECT DISTINCT `department` FROM `users` WHERE `department` IS NOT NULL ORDER BY `department`');
    return (rows || []).map((r) => r.department);
}
export async function findDepartmentByNormalizedName(name, conn) {
    if (!name) return null;
    const rows = await exec(conn, 'SELECT DISTINCT `department` FROM `users` WHERE `department` IS NOT NULL');
    const norm = Utils.normSpace(name).toLowerCase();
    const match = (rows || []).find((r) => Utils.normSpace(r.department).toLowerCase() === norm);
    return match ? match.department : null;
}
export async function listAgentCodesByDepartment(department, conn) {
    if (!department) return [];
    const rows = await exec(conn, 'SELECT `agent_code` FROM `users` WHERE `department`=? AND `agent_code` IS NOT NULL', [department]);
    return (rows || []).map((r) => r.agent_code);
}
export async function deleteUser(id, conn) {
    await exec(conn, 'DELETE FROM `users` WHERE `id`=?', [id]);
}

export async function applyOp(op, payload, conn) {
    switch (op) {
        case 'createLead':
            return createLead(payload.rec, conn);
        case 'importRecords':
            return upsertLeads(payload.records, conn);
        case 'updateLead':
            return updateLead(payload.id, payload.patch, conn);
        case 'addChangeLog':
            return createActivity({...payload.activity, type: 'change'}, conn);
        case 'addComment': {
            if (!payload.notification) return createActivity({...payload.activity, type: 'comment'}, conn);
            const run = async (c) => {
                await createActivity({...payload.activity, type: 'comment'}, c);
                await createNotification(payload.notification, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        case 'addReminder':
            return createReminder(payload.reminder, conn);
        case 'markReminderDone':
            return exec(conn, 'UPDATE `reminders` SET `done`=1 WHERE `id`=?', [payload.id]);
        case 'markNotificationRead':
            return markNotificationRead(payload.id, payload.forAgent ?? null, conn);
        case 'markAllNotificationsRead':
            return markAllNotificationsRead(payload.forAgent ?? null, conn);
        case 'updateLeadWithNotification': {
            const run = async (c) => {
                await updateLead(payload.id, payload.patch, c);
                await createNotification(payload.notification, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        case 'updateActivity':
            return updateActivity(payload.id, payload.patch, conn);
        case 'deleteActivity':
            return deleteActivity(payload.id, conn);
        case 'updateReminder':
            return updateReminder(payload.id, payload.patch, conn);
        case 'deleteReminder':
            return deleteReminder(payload.id, conn);
        case 'createProduct':
            return createProduct(payload.product, conn);
        case 'updateProduct':
            return updateProduct(payload.id, payload.patch, conn);
        case 'deleteProduct':
            return deleteProduct(payload.id, conn);
        case 'createCategory':
            return createCategory(payload.category, conn);
        case 'updateCategory':
            return updateCategory(payload.id, payload.patch, conn);
        case 'deleteCategory':
            return deleteCategory(payload.id, conn);
        case 'renameCompany': {
            const run = async (c) => {
                await renameCompany(payload.oldKey, payload.newName, c, payload.allowMerge === true, payload.scope);
                if (payload.changeLogEntry) await createActivity(payload.changeLogEntry, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        case 'addMessage': {
            const run = async (c) => {
                await createActivity(payload.activity, c);
                for (const n of payload.notifications || []) await createNotification(n, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        case 'deleteCompany': {
            const run = (c) => deleteCompany(payload.key, c, payload.scope);
            return conn ? run(conn) : withTransaction(run);
        }
        case 'deleteLead': {
            const run = async (c) => {
                await deleteLead(payload.id, c);
                if (payload.changeLogEntry) await createActivity(payload.changeLogEntry, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        default:
            throw new Error('Unknown op: ' + op);
    }
}