import {query, withTransaction} from './db.js';
import {
    ACTIVITY_COLS,
    activityToRow,
    CONTACT_COLS,
    contactToRow,
    REMINDER_COLS,
    reminderToRow,
    rowsToCustomerMeta,
    rowToActivity,
    rowToContact,
    rowToReminder,
    rowToUser,
    USER_COLS,
    USER_SAFE_COLS,
} from './mappers.js';

const ph = (n) => Array(n).fill('?').join(',');
const exec = async (conn, sql, params) => (conn ? (await conn.query(sql, params))[0] : query(sql, params));
const selectCols = (cols) => cols.map((c) => `\`${c}\``).join(',');

const CONTACT_SET = CONTACT_COLS.filter((c) => c !== 'id');
const REMINDER_SET = REMINDER_COLS.filter((c) => c !== 'id');
const UPDATEABLE = ['converted', 'company', 'coordinator', 'name', 'phone', 'product', 'category', 'source', 'date', 'price', 'result', 'priority', 'notes'];
const USER_SET = USER_COLS.filter((c) => c !== 'id' && c !== 'username' && c !== 'created_at');

const USER_SELECT = selectCols(USER_COLS);
const USER_SAFE_SELECT = selectCols(USER_SAFE_COLS);
const CONTACT_SELECT = selectCols(CONTACT_COLS);
const ACTIVITY_SELECT = selectCols(ACTIVITY_COLS);
const REMINDER_SELECT = selectCols(REMINDER_COLS);

export async function listContacts(conn) {
    const rows = await exec(conn, `SELECT ${CONTACT_SELECT} FROM \`contacts\``);
    return (rows || []).map(rowToContact);
}
export async function getContactById(id, conn) {
    const rows = await exec(conn, `SELECT ${CONTACT_SELECT} FROM \`contacts\` WHERE \`id\`=? LIMIT 1`, [id]);
    return rows && rows[0] ? rowToContact(rows[0]) : null;
}
export async function createContact(c, conn) {
    const row = contactToRow(c);
    const sql = `INSERT INTO \`contacts\` (\`${CONTACT_COLS.join('`,`')}\`)
                 VALUES (${ph(CONTACT_COLS.length)})
                 ON DUPLICATE KEY UPDATE ${CONTACT_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',')}`;
    await exec(conn, sql, CONTACT_COLS.map((c2) => row[c2]));
}
async function upsertContacts(records, conn) {
    const onDup = CONTACT_SET.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(',');
    for (let i = 0; i < records.length; i += 250) {
        const rows = records.slice(i, i + 250).map(contactToRow);
        const sql = `INSERT INTO \`contacts\` (\`${CONTACT_COLS.join('`,`')}\`)
                     VALUES ` + rows.map((r) => `(${ph(CONTACT_COLS.length)})`).join(',') + ` ON DUPLICATE KEY UPDATE ${onDup}`;
        await exec(conn, sql, rows.flatMap((r) => CONTACT_COLS.map((c) => r[c])));
    }
}
export async function updateContact(id, patch, conn) {
    const sets = [];
    const params = [];
    for (const k of UPDATEABLE) {
        if (patch[k] === undefined) continue;
        sets.push(`\`${k}\`=?`);
        params.push(k === 'converted' ? (patch[k] ? 1 : 0) : (patch[k] === '' ? null : patch[k]));
    }
    if (!sets.length) return;
    params.push(id);
    await exec(conn, `UPDATE \`contacts\` SET ${sets.join(',')} WHERE \`id\`=?`, params);
}
export async function deleteContact(id, conn) {
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
    const [contactsRows, activityRows, reminderRows] = await Promise.all([
        query(`SELECT ${CONTACT_SELECT} FROM \`contacts\``),
        query(`SELECT ${ACTIVITY_SELECT} FROM \`customer_activity\``),
        query(`SELECT ${REMINDER_SELECT} FROM \`reminders\``),
    ]);
    return {
        records: contactsRows.map(rowToContact),
        customerMeta: rowsToCustomerMeta(activityRows),
        reminders: reminderRows.map(rowToReminder),
    };
}

export async function reseedContacts(seedRecords) {
    await withTransaction(async (conn) => {
        await exec(conn, 'DELETE FROM `contacts`');
        for (let i = 0; i < seedRecords.length; i += 250) {
            const rows = seedRecords.slice(i, i + 250).map(contactToRow);
            const sql = `INSERT INTO \`contacts\` (\`${CONTACT_COLS.join('`,`')}\`)
                         VALUES ` + rows.map((r) => `(${ph(CONTACT_COLS.length)})`).join(',');
            await exec(conn, sql, rows.flatMap((r) => CONTACT_COLS.map((c) => r[c])));
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
        case 'createContact':
            return createContact(payload.rec, conn);
        case 'importRecords':
            return upsertContacts(payload.records, conn);
        case 'updateContact':
            return updateContact(payload.id, payload.patch, conn);
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
        case 'deleteContact': {
            const run = async (c) => {
                await deleteContact(payload.id, c);
                if (payload.changeLogEntry) await createActivity(payload.changeLogEntry, c);
            };
            return conn ? run(conn) : withTransaction(run);
        }
        default:
            throw new Error('Unknown op: ' + op);
    }
}