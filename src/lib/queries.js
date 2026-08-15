import {query, withTransaction} from './db.js';
import {
    ACTIVITY_COLS,
    activityToRow,
    CATEGORY_COLS,
    categoryToRow,
    LEAD_COLS,
    leadToRow,
    PRODUCT_COLS,
    productToRow,
    REMINDER_COLS,
    reminderToRow,
    rowsToCompanyMeta,
    rowToActivity,
    rowToCategory,
    rowToLead,
    rowToProduct,
    rowToReminder,
    rowToUser,
    USER_COLS,
    USER_SAFE_COLS,
} from './mappers.js';

const ph = (n) => Array(n).fill('?').join(',');
const exec = async (conn, sql, params) => (conn ? (await conn.query(sql, params))[0] : query(sql, params));
const selectCols = (cols) => cols.map((c) => `\`${c}\``).join(',');

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
];
const USER_SET = USER_COLS.filter((c) => c !== 'id' && c !== 'username' && c !== 'created_at');

const USER_SELECT = selectCols(USER_COLS);
const USER_SAFE_SELECT = selectCols(USER_SAFE_COLS);
const LEAD_SELECT = selectCols(LEAD_COLS);
const ACTIVITY_SELECT = selectCols(ACTIVITY_COLS);
const REMINDER_SELECT = selectCols(REMINDER_COLS);
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
    const rows = await exec(conn, `SELECT ${LEAD_SELECT} FROM \`contacts\` WHERE LOWER(\`company\`)=LOWER(?)`, [company]);
    return (rows || []).map(rowToLead);
}
export async function createLead(c, conn) {
    const row = leadToRow(c);
    const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`)
                 VALUES (${ph(LEAD_COLS.length)})
                 ON DUPLICATE KEY UPDATE ${LEAD_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')}`;
    await exec(conn, sql, LEAD_COLS.map((c2) => row[c2]));
}
async function upsertLeads(records, conn) {
    const onDup = LEAD_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',');
    for (let i = 0; i < records.length; i += 250) {
        const rows = records.slice(i, i + 250).map(leadToRow);
        const sql = `INSERT INTO \`contacts\` (\`${LEAD_COLS.join('`,`')}\`)
                     VALUES ` + rows.map((r) => `(${ph(LEAD_COLS.length)})`).join(',') + ` ON DUPLICATE KEY UPDATE ${onDup}`;
        await exec(conn, sql, rows.flatMap((r) => LEAD_COLS.map((c) => r[c])));
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
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`contacts\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteLead(id, conn) {
    await exec(conn, 'DELETE FROM `contacts` WHERE `id`=?', [id]);
}

export async function listActivity(conn) {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\``);
    return (rows || []).map(rowToActivity);
}
export async function getActivityById(id, conn) {
    const rows = await exec(conn, `SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToActivity(rows[0]) : null;
}
export async function createActivity(a, conn) {
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

export async function loadAllFromDb() {
    const [leadRows, activityRows, reminderRows, productRows, categoryRows, agents] = await Promise.all([
        query(`SELECT ${LEAD_SELECT} FROM \`contacts\``),
        query(`SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\``),
        query(`SELECT ${REMINDER_SELECT} FROM \`reminders\``),
        query(`SELECT ${PRODUCT_SELECT} FROM \`products\``),
        query(`SELECT ${CATEGORY_SELECT} FROM \`categories\` ORDER BY \`name\``),
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

export async function listActiveAgents(conn) {
    const rows = await exec(conn, 'SELECT `agent_code`,`display_name` FROM `users` WHERE `agent_code` IS NOT NULL AND `active`=1 ORDER BY `display_name`');
    return (rows || []).map((r) => ({agentCode: r.agent_code, displayName: r.display_name}));
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
    const sql = `INSERT INTO \`products\` (\`${PRODUCT_COLS.join('`,`')}\`) VALUES (${ph(PRODUCT_COLS.length)})`;
    await exec(conn, sql, PRODUCT_COLS.map((c) => row[c]));
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
    await exec(conn, sql, CATEGORY_COLS.map((col) => row[col]));
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
    params.push(id);
    await exec(conn, `UPDATE \`categories\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteCategory(id, conn) {
    await exec(conn, 'DELETE FROM `categories` WHERE `id`=?', [id]);
}

export async function reseedLeads(seedRecords) {
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
export async function upsertUser(row, conn) {
    const sql = `INSERT INTO \`users\` (\`${USER_COLS.join('`,`')}\`)
                 VALUES (${ph(USER_COLS.length)})
                 ON DUPLICATE KEY UPDATE ${USER_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')}`;
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
        case 'addComment':
            return createActivity({...payload.activity, type: 'comment'}, conn);
        case 'addReminder':
            return createReminder(payload.reminder, conn);
        case 'markReminderDone':
            return exec(conn, 'UPDATE `reminders` SET `done`=1 WHERE `id`=?', [payload.id]);
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