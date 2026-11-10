/**
 * In-browser mock of the Sweety API – used ONLY for the hosted preview build
 * (VITE_MOCK=1). It mirrors the real server's rules and responses so the UI
 * can be explored without PostgreSQL. Data lives in memory and resets on reload.
 */
import { MESSAGES, SLOTS, isValidDateString, todayLocal } from './utils/format';

const SLOT_KEYS = SLOTS.map((s) => s.key);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return fmt(new Date(y, m - 1, d + n));
};
const lastOfMonth = (s) => {
  const [y, m] = s.split('-').map(Number);
  return fmt(new Date(y, m, 0));
};
const firstOfMonth = (s) => `${s.slice(0, 7)}-01`;
const prevMonth = (s) => {
  const [y, m] = s.split('-').map(Number);
  const from = fmt(new Date(y, m - 2, 1));
  return { from, to: lastOfMonth(from) };
};
const order = (slot) => SLOT_KEYS.indexOf(slot);

/* ---------- seed data ---------- */
const users = [{ id: 1, name: 'Demo User', email: 'demo@sweety.app', password: 'Demo@1234', created_at: new Date().toISOString() }];
let readings = [];
let nextId = 1;

(function seed() {
  let a = 2026;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const base = { morning: 98, after_breakfast: 138, after_lunch: 132, after_dinner: 126 };
  const today = todayLocal();
  for (let i = 0; i < 75; i++) {
    const date = addDays(today, -i);
    if (i > 0 && rand() < 0.08) continue;
    const slots = i === 0 ? ['morning', 'after_breakfast'] : SLOT_KEYS.filter((s) => s === 'morning' || rand() < 0.85);
    slots.forEach((slot) => {
      const spike = rand() < 0.07 ? 35 + rand() * 40 : 0;
      const dip = rand() < 0.03 ? -30 : 0;
      const value = Math.round(base[slot] + (rand() - 0.5) * 36 + spike + dip);
      readings.push({ id: nextId++, user_id: 1, reading_date: date, slot, value: Math.min(600, Math.max(40, value)) });
    });
  }
})();

/* ---------- helpers ---------- */
class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const dupMsg = (slot) => MESSAGES.duplicate(slot);

function validate(body) {
  const { value, slot } = body;
  const date = body.reading_date;
  if (value === undefined || value === null || String(value).trim() === '') throw new ApiError(400, MESSAGES.emptyValue, 'value');
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) throw new ApiError(400, MESSAGES.whole, 'value');
  if (Number(raw) < 40 || Number(raw) > 600) throw new ApiError(400, MESSAGES.range, 'value');
  if (!SLOT_KEYS.includes(slot)) throw new ApiError(400, MESSAGES.slot, 'slot');
  if (!date) throw new ApiError(400, MESSAGES.date, 'reading_date');
  if (!isValidDateString(date)) throw new ApiError(400, 'Please enter a valid date (YYYY-MM-DD).', 'reading_date');
  if (date > todayLocal()) throw new ApiError(400, MESSAGES.future, 'reading_date');
  return { reading_date: date, slot, value: Number(raw) };
}

function assertRoom(userId, { reading_date, slot }, excludeId = null) {
  const day = readings.filter((r) => r.user_id === userId && r.reading_date === reading_date && r.id !== excludeId);
  if (day.length >= 4) throw new ApiError(400, MESSAGES.maxPerDay, 'reading_date');
  if (day.some((r) => r.slot === slot)) throw new ApiError(409, dupMsg(slot), 'slot');
}

function report(userId, type, from, to) {
  const rs = readings
    .filter((r) => r.user_id === userId && r.reading_date >= from && r.reading_date <= to)
    .sort((x, y) => (x.reading_date === y.reading_date ? order(x.slot) - order(y.slot) : x.reading_date < y.reading_date ? -1 : 1));
  const vals = rs.map((r) => r.value);
  const count = vals.length;
  return {
    type, from, to, empty: count === 0,
    stats: {
      highest: count ? Math.max(...vals) : null,
      lowest: count ? Math.min(...vals) : null,
      average: count ? Math.round((vals.reduce((s, v) => s + v, 0) / count) * 10) / 10 : null,
      count,
    },
    readings: rs.map(({ id, reading_date, slot, value }) => ({ id, reading_date, slot, value })),
  };
}

/* ---------- router ---------- */
function handle(method, path, params, body, userId) {
  if (path === '/auth/login' && method === 'post') {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email) throw new ApiError(400, 'Please enter your email.', 'email');
    if (!body.password) throw new ApiError(400, 'Please enter your password.', 'password');
    const u = users.find((x) => x.email === email && x.password === body.password);
    if (!u) throw new ApiError(401, 'Invalid email or password.');
    return [200, { token: `mock-${u.id}`, user: pub(u) }];
  }
  if (path === '/auth/register' && method === 'post') {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!name) throw new ApiError(400, 'Please enter your name.', 'name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Please enter a valid email address.', 'email');
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.', 'password');
    if (users.some((u) => u.email === email)) throw new ApiError(409, 'An account with this email already exists.', 'email');
    const u = { id: users.length + 1, name, email, password, created_at: new Date().toISOString() };
    users.push(u);
    return [201, { token: `mock-${u.id}`, user: pub(u) }];
  }

  if (!userId) throw new ApiError(401, 'Authentication required.');

  if (path === '/auth/me') return [200, { user: pub(users.find((u) => u.id === userId)) }];

  if (path === '/readings' && method === 'get') {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 10));
    let rs = readings.filter((r) => r.user_id === userId);
    if (params.from) rs = rs.filter((r) => r.reading_date >= params.from);
    if (params.to) rs = rs.filter((r) => r.reading_date <= params.to);
    if (params.slot) rs = rs.filter((r) => r.slot === params.slot);
    rs.sort((x, y) => (x.reading_date === y.reading_date ? order(y.slot) - order(x.slot) : x.reading_date < y.reading_date ? 1 : -1));
    const total = rs.length;
    return [200, {
      data: rs.slice((page - 1) * limit, page * limit).map(({ user_id, ...r }) => r),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }];
  }
  if (path === '/readings' && method === 'post') {
    const input = validate(body);
    assertRoom(userId, input);
    const r = { id: nextId++, user_id: userId, ...input };
    readings.push(r);
    return [201, { reading: { id: r.id, ...input } }];
  }
  const m = path.match(/^\/readings\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const existing = readings.find((r) => r.id === id && r.user_id === userId);
    if (!existing) throw new ApiError(404, 'Reading not found.');
    if (method === 'put') {
      const input = validate(body);
      assertRoom(userId, input, id);
      Object.assign(existing, input);
      return [200, { reading: { id, ...input } }];
    }
    if (method === 'delete') {
      readings = readings.filter((r) => r.id !== id);
      return [204, undefined];
    }
  }

  if (path.startsWith('/reports/')) {
    const date = params.date || todayLocal();
    if (!isValidDateString(date)) throw new ApiError(400, 'Please provide a valid date (YYYY-MM-DD).', 'date');
    if (path === '/reports/daily') return [200, report(userId, 'daily', date, date)];
    if (path === '/reports/month-to-date') return [200, report(userId, 'month-to-date', firstOfMonth(date), date)];
    if (path === '/reports/monthly') {
      const { from, to } = prevMonth(date);
      return [200, report(userId, 'monthly', from, to)];
    }
    if (path === '/reports/chart') {
      const month = params.month || todayLocal().slice(0, 7);
      const from = `${month}-01`;
      const rep = report(userId, 'chart', from, lastOfMonth(from));
      const byDay = {};
      rep.readings.forEach((r) => { (byDay[r.reading_date] ||= []).push(r.value); });
      const daily = Object.entries(byDay).map(([reading_date, v]) => ({
        reading_date, average: Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10,
      }));
      return [200, { month, from, to: lastOfMonth(from), readings: rep.readings, daily }];
    }
  }
  throw new ApiError(404, 'Route not found.');
}

const pub = ({ id, name, email, created_at }) => ({ id, name, email, created_at });

export default function mockAdapter(config) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const auth = config.headers?.Authorization || config.headers?.get?.('Authorization') || '';
        const mt = /^Bearer mock-(\d+)$/.exec(auth);
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
        const [status, data] = handle(config.method.toLowerCase(), config.url.split('?')[0], config.params || {}, body, mt ? Number(mt[1]) : null);
        resolve({ data, status, statusText: 'OK', headers: {}, config });
      } catch (e) {
        if (!(e instanceof ApiError)) return reject(e);
        reject({ config, request: {}, response: { status: e.status, data: { message: e.message, field: e.field }, config } });
      }
    }, 120);
  });
}
