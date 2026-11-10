export const MIN_VALUE = 40;
export const MAX_VALUE = 600;
export const MAX_PER_DAY = 4;

export const SLOTS = [
  { key: 'morning', label: 'Morning', hint: 'Fasting', color: 'var(--slot-morning)' },
  { key: 'after_breakfast', label: 'After breakfast', hint: '', color: 'var(--slot-breakfast)' },
  { key: 'after_lunch', label: 'After lunch', hint: '', color: 'var(--slot-lunch)' },
  { key: 'after_dinner', label: 'After dinner', hint: '', color: 'var(--slot-dinner)' },
];

export const slotByKey = (key) => SLOTS.find((s) => s.key === key);
export const slotLabel = (key) => slotByKey(key)?.label ?? key;

const pad = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD (what the <input type="date"> uses). */
export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return todayLocal(d) === s;
}

const mediumFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

export const formatDate = (s) => mediumFmt.format(parseDate(s));
export const formatShort = (s) => shortFmt.format(parseDate(s));
export const formatLong = (s) => longFmt.format(parseDate(s));

export function formatRange(from, to) {
  if (from === to) return formatDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? formatShort(from) : formatDate(from)} – ${formatDate(to)}`;
}

/** 'YYYY-MM' helpers */
export const monthOf = (dateStr) => dateStr.slice(0, 7);
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const monthTitle = (ym) => monthFmt.format(parseDate(`${ym}-01`));
export const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

/**
 * Target range used for colouring. Assumption: 70–180 mg/dL is "in range"
 * (the common time-in-range target). This is a tracking aid, not medical advice.
 */
export const LOW_BELOW = 70;
export const HIGH_ABOVE = 180;

export function glucoseStatus(value) {
  if (value < LOW_BELOW) return { key: 'low', label: 'Low' };
  if (value > HIGH_ABOVE) return { key: 'high', label: 'High' };
  return { key: 'normal', label: 'In range' };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function defaultSlotForNow(now = new Date()) {
  const h = now.getHours();
  if (h < 9) return 'morning';
  if (h < 13) return 'after_breakfast';
  if (h < 18) return 'after_lunch';
  return 'after_dinner';
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

/* ------------------------------------------------------------------ *
 *  Validation – mirrors the server rules and uses Kenpath's messages  *
 * ------------------------------------------------------------------ */

const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

export const MESSAGES = {
  emptyValue: 'Please enter a glucose value.',
  range: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  whole: 'Glucose value must be a whole number.',
  future: 'Date cannot be in the future.',
  maxPerDay: `You can add only ${MAX_PER_DAY} readings per day.`,
  slot: 'Please choose a valid time slot.',
  date: 'Please select a date.',
  duplicate: (slotKey) => {
    const label = slotLabel(slotKey);
    return `You already have ${article(label)} ${label} reading for this date.`;
  },
};

/** Day-level rules (max 4 / one per slot) against readings already saved for that date. */
export function dayConflict({ slot, existing = [], editingId = null }) {
  const others = existing.filter((r) => r.id !== editingId);
  if (others.length >= MAX_PER_DAY) return { field: 'date', message: MESSAGES.maxPerDay };
  if (slot && others.some((r) => r.slot === slot)) {
    return { field: 'slot', message: MESSAGES.duplicate(slot) };
  }
  return null;
}

/** Returns an object of { field: message } – empty when everything is valid. */
export function validateReading({ value, date, slot }, { existing = [], editingId = null, today = todayLocal() } = {}) {
  const errors = {};
  const raw = String(value ?? '').trim();

  if (raw === '') errors.value = MESSAGES.emptyValue;
  else if (!/^-?\d+$/.test(raw)) errors.value = MESSAGES.whole;
  else if (Number(raw) < MIN_VALUE || Number(raw) > MAX_VALUE) errors.value = MESSAGES.range;

  if (!slotByKey(slot)) errors.slot = MESSAGES.slot;

  if (!date) errors.date = MESSAGES.date;
  else if (!isValidDateString(date)) errors.date = 'Please enter a valid date.';
  else if (date > today) errors.date = MESSAGES.future;

  if (!errors.date && !errors.slot) {
    const conflict = dayConflict({ slot, existing, editingId });
    if (conflict) errors[conflict.field] = conflict.message;
  }
  return errors;
}
