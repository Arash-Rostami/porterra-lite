import type { Lead } from '../types/lead';
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import type { Activity, CompanyMeta } from '../types/activity';
import type { Reminder } from '../types/reminder';
import type { User } from '../types/user';

// Row shapes as returned by mysql2 for each table (snake_case columns, matching
// db/schema.sql). Numeric/boolean-ish columns are typed `unknown` rather than
// `number`/`boolean` because this file is what performs the Number()/Boolean()
// coercion below — claiming a more specific type here would be asserting
// something about mysql2's driver behavior this codebase has never verified.
export interface LeadRow {
  id: string; converted: unknown; coordinator: string | null; company: string; name: string | null;
  phone: string | null; product: string | null; category_id: string | null; source: string | null;
  date: string | null; price: string | null; result: string | null; priority: string | null; notes: string | null;
  deactivate_reason: string | null; quote_price: string | null; quote_price_type: string | null;
  quote_terms: string | null; quote_price_date: string | null; quote_result: string | null;
  quote_result_date: string | null; quote_fail_reason: string | null;
}
export interface ProductRow { id: string; name: string; category_id: string | null; is_custom: unknown; created_at: unknown; }
export interface CategoryRow { id: string; name: string; is_custom: unknown; created_at: unknown; }
export interface ActivityRow { id: string; company_key: string; type: 'comment' | 'change'; ts: unknown; author: string | null; text: string; }
export interface ReminderRow { id: string; cust_key: string | null; company: string | null; due_date: string | null; due_time: string | null; for_agent: string | null; text: string | null; created_at: unknown; done: unknown; }
export interface UserRow { id: string; username: string; email: string | null; display_name: string | null; agent_code: string | null; department: string | null; password_cipher: string; role: string; active: unknown; last_login: unknown; created_at: unknown; }

function normDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  return m ? `${m[1]}.${m[2]}.20${m[3]}` : (v as string);
}

const n = (v: unknown): unknown => (v === undefined || v === null || v === '' ? null : v);

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    converted: Boolean(row.converted),
    coordinator: row.coordinator,
    company: row.company,
    name: row.name,
    phone: row.phone,
    product: row.product,
    categoryId: row.category_id,
    source: row.source,
    date: row.date,
    price: row.price,
    result: row.result,
    priority: row.priority,
    notes: row.notes,
    deactivateReason: row.deactivate_reason,
    quotePrice: row.quote_price,
    quotePriceType: row.quote_price_type,
    quoteTerms: row.quote_terms,
    quotePriceDate: row.quote_price_date,
    quoteResult: row.quote_result,
    quoteResultDate: row.quote_result_date,
    quoteFailReason: row.quote_fail_reason,
  };
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    isCustom: Boolean(row.is_custom),
    createdAt: Number(row.created_at),
  };
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isCustom: Boolean(row.is_custom),
    createdAt: Number(row.created_at),
  };
}

export function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    companyKey: row.company_key,
    type: row.type,
    ts: Number(row.ts),
    author: row.author,
    text: row.text,
  };
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    custKey: row.cust_key,
    company: row.company,
    dueDate: row.due_date,
    dueTime: row.due_time,
    forAgent: row.for_agent,
    text: row.text,
    createdAt: row.created_at == null ? null : Number(row.created_at),
    done: Boolean(row.done),
  };
}

export function rowsToCompanyMeta(rows: ActivityRow[]): CompanyMeta {
  const meta: CompanyMeta = {};
  for (const row of rows) {
    const key = row.company_key;
    if (!meta[key]) meta[key] = { comments: [], changeLog: [] };
    const item = { id: row.id, ts: Number(row.ts), text: row.text, author: row.author, type: row.type };
    if (row.type === 'comment') meta[key].comments.push(item);
    else meta[key].changeLog.push(item);
  }
  return meta;
}

export function leadToRow(c: Partial<Lead>): Record<string, unknown> {
  return {
    id: c.id,
    converted: c.converted ? 1 : 0,
    company: c.company,
    coordinator: n(c.coordinator),
    name: n(c.name),
    phone: n(c.phone),
    product: n(c.product),
    category_id: n(c.categoryId),
    source: n(c.source),
    date: normDate(n(c.date)),
    price: n(c.price),
    result: n(c.result),
    priority: n(c.priority),
    notes: n(c.notes),
    deactivate_reason: n(c.deactivateReason),
    quote_price: n(c.quotePrice),
    quote_price_type: n(c.quotePriceType),
    quote_terms: n(c.quoteTerms),
    quote_price_date: normDate(n(c.quotePriceDate)),
    quote_result: n(c.quoteResult),
    quote_result_date: normDate(n(c.quoteResultDate)),
    quote_fail_reason: n(c.quoteFailReason),
  };
}

export function productToRow(p: Partial<Product>): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    category_id: n(p.categoryId),
    is_custom: p.isCustom ? 1 : 0,
    created_at: p.createdAt,
  };
}

export function categoryToRow(c: Partial<Category>): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    is_custom: c.isCustom ? 1 : 0,
    created_at: c.createdAt,
  };
}

export function reminderToRow(r: Partial<Reminder>): Record<string, unknown> {
  return {
    id: r.id,
    cust_key: n(r.custKey),
    company: n(r.company),
    due_date: n(r.dueDate),
    due_time: n(r.dueTime),
    for_agent: n(r.forAgent),
    text: n(r.text),
    created_at: r.createdAt == null ? null : r.createdAt,
    done: r.done ? 1 : 0,
  };
}

export function activityToRow(a: Partial<Activity>): Record<string, unknown> {
  return {
    id: a.id,
    company_key: a.companyKey,
    type: a.type,
    ts: a.ts,
    author: n(a.author),
    text: a.text,
  };
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    displayName: row.display_name,
    agentCode: row.agent_code,
    department: row.department ?? null,
    role: row.role as User['role'],
    active: Boolean(row.active),
    lastLogin: row.last_login == null ? null : Number(row.last_login),
    createdAt: Number(row.created_at),
  };
}

export const LEAD_COLS: string[] = [
  'id', 'converted', 'company', 'coordinator', 'name', 'phone', 'product', 'category_id', 'source', 'date', 'price', 'result', 'priority', 'notes',
  'deactivate_reason', 'quote_price', 'quote_price_type', 'quote_terms', 'quote_price_date', 'quote_result', 'quote_result_date', 'quote_fail_reason',
];
export const REMINDER_COLS: string[] = ['id', 'cust_key', 'company', 'due_date', 'due_time', 'for_agent', 'text', 'created_at', 'done'];
export const ACTIVITY_COLS: string[] = ['id', 'company_key', 'type', 'ts', 'author', 'text'];
export const USER_COLS: string[] = ['id', 'username', 'email', 'display_name', 'agent_code', 'department', 'password_cipher', 'role', 'active', 'last_login', 'created_at'];
export const USER_SAFE_COLS: string[] = ['id', 'username', 'email', 'display_name', 'agent_code', 'department', 'role', 'active', 'last_login', 'created_at'];
export const PRODUCT_COLS: string[] = ['id', 'name', 'category_id', 'is_custom', 'created_at'];
export const CATEGORY_COLS: string[] = ['id', 'name', 'is_custom', 'created_at'];
