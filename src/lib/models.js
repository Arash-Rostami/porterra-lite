// Server-only Zod schemas — every Server Action validates with one of these before any SQL runs
import {z} from 'zod';

// '' / undefined -> null, so empty client strings become SQL NULL (not '').
const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

const optStr = (max) => z.preprocess(emptyToNull, z.string().max(max).nullable());
const reqStr = (max) => z.string().min(1).max(max);

// A standalone row/object id (contacts, activity, reminders all share VARCHAR(40) PKs).
export const Id = reqStr(40);

// dd.mm.yyyy — the app's canonical date format (never Date objects in stored data).
const dateField = z.preprocess(emptyToNull, z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'date must be dd.mm.yyyy').nullable());

// yyyy-mm-dd / hh:mm — come straight from <input type="date"> / <input type="time">.
const isoDateField = z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be yyyy-mm-dd').nullable());
const timeField = z.preprocess(emptyToNull, z.string().regex(/^\d{2}:\d{2}$/, 'dueTime must be hh:mm').nullable());

// Accept boolean or 0/1 (DB TINYINT); reject truthy strings like "false" being coerced to true.
const boolField = z.preprocess((v) => v === true || v === 1 || v === '1' || v === 'true', z.boolean());

export const ContactCreate = z.object({
    id: reqStr(40),
    converted: boolField.default(false),
    company: reqStr(255),
    coordinator: optStr(32),
    name: optStr(255),
    phone: optStr(128),
    product: optStr(5000),
    category: optStr(64),
    source: optStr(64),
    date: dateField.optional(),
    price: optStr(64),
    result: optStr(64),
    priority: optStr(32),
    notes: optStr(10000),
});

// partial UPDATE patch (id passed separately): absent keys stay undefined so SQL skips them; present '' becomes NULL
export const ContactUpdate = z.object({
    converted: boolField.optional(),
    company: reqStr(255).optional(),
    coordinator: optStr(32).optional(),
    name: optStr(255).optional(),
    phone: optStr(128).optional(),
    product: optStr(5000).optional(),
    category: optStr(64).optional(),
    source: optStr(64).optional(),
    date: dateField.optional(),
    price: optStr(64).optional(),
    result: optStr(64).optional(),
    priority: optStr(32).optional(),
    notes: optStr(10000).optional(),
});

export const Activity = z.object({
    id: reqStr(40),
    companyKey: reqStr(255),
    type: z.enum(['comment', 'change']),
    ts: z.number().int().nonnegative(),
    author: optStr(255),
    text: reqStr(10000),
});

export const Reminder = z.object({
    id: reqStr(40),
    custKey: optStr(255),
    company: optStr(255),
    dueDate: isoDateField.optional(),
    dueTime: timeField.optional(),
    forAgent: optStr(32),
    text: optStr(2000),
    createdAt: z.preprocess(emptyToNull, z.number().int().nullable()).optional(),
    done: boolField.optional(),
});

// partial UPDATE patches (id passed separately): absent keys stay undefined so SQL skips them; present '' becomes NULL
export const ActivityUpdate = z.object({
    companyKey: reqStr(255).optional(),
    type: z.enum(['comment', 'change']).optional(),
    ts: z.number().int().nonnegative().optional(),
    author: optStr(255).optional(),
    text: reqStr(10000).optional(),
});

export const ReminderUpdate = z.object({
    custKey: optStr(255).optional(),
    company: optStr(255).optional(),
    dueDate: isoDateField.optional(),
    dueTime: timeField.optional(),
    forAgent: optStr(32).optional(),
    text: optStr(2000).optional(),
    createdAt: z.preprocess(emptyToNull, z.number().int().nullable()).optional(),
    done: boolField.optional(),
});

export const UserRole = z.enum(['admin', 'agent', 'developer']);

export const User = z.object({
    id: reqStr(40),
    username: reqStr(64),
    email: optStr(255),
    displayName: optStr(255),
    agentCode: optStr(32),
    role: UserRole,
    active: boolField.default(true),
    lastLogin: z.preprocess(emptyToNull, z.number().int().nullable()).optional(),
    createdAt: z.number().int().nonnegative(),
});

export const UserCreate = z.object({
    id: reqStr(40),
    username: reqStr(64),
    email: optStr(255),
    displayName: optStr(255),
    agentCode: optStr(32),
    role: UserRole.default('agent'),
    password: reqStr(256),
    active: boolField.default(true),
});

// username absent (identity, not editable); blank password (-> null) means "leave unchanged"
export const UserUpdate = z.object({
    displayName: optStr(255).optional(),
    email: optStr(255).optional(),
    agentCode: optStr(32).optional(),
    role: UserRole.optional(),
    active: boolField.optional(),
    password: optStr(256).optional(),
});

export const LoginInput = z.object({
    email: reqStr(255),
    password: reqStr(256),
});

// Throws a VALIDATION-tagged error the caller maps to a 400 / client rollback.
export function parseOrThrow(schema, input) {
    const r = schema.safeParse(input);
    if (!r.success) {
        const issue = r.error.issues[0];
        const path = issue && issue.path.length ? issue.path.join('.') : '(root)';
        const err = new Error(`Validation [${path}]: ${issue ? issue.message : 'error'}`);
        err.code = 'VALIDATION';
        throw err;
    }
    return r.data;
}