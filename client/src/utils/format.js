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

/**
 * Shown right after a save when the number needs attention.
 * Under 70 or over 250. Under 54 and 400+ use stronger wording.
 * Returns null for everyday highs and in-range values.
 */
export function safetyNotice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 54) {
    return {
      tone: 'urgent',
      title: 'Very low reading',
      message: 'This reading is under 54 mg/dL. If you feel shaky, sweaty, or confused, take fast-acting sugar now and follow your care plan. Call for help if it does not come up.',
    };
  }
  if (n < LOW_BELOW) {
    return {
      tone: 'low',
      title: 'Low reading',
      message: 'This reading is under 70 mg/dL. Recheck soon, and treat a low the way your clinician showed you if you have symptoms.',
    };
  }
  if (n >= 400) {
    return {
      tone: 'urgent',
      title: 'Very high reading',
      message: 'This reading is extremely high. Contact your clinician or urgent care, especially if you feel sick.',
    };
  }
  if (n > 250) {
    return {
      tone: 'high',
      title: 'High reading',
      message: 'This reading is above 250 mg/dL. Drink water, recheck, and follow your high-glucose plan. Seek care if you feel unwell or the number keeps rising.',
    };
  }
  return null;
}

/** Plain sentence for the 7-day average compared with the week before. */
export function trendSentence(weeks) {
  if (!weeks?.current || weeks.current.average == null) {
    return 'Log a few readings this week to see how you compare with last week.';
  }
  if (weeks.previous?.average == null) {
    return `This week’s average is ${weeks.current.average} mg/dL. Last week doesn’t have enough readings to compare yet.`;
  }
  if (weeks.direction === 'flat') {
    return `This week matches last week, at about ${weeks.current.average} mg/dL.`;
  }
  const word = weeks.direction === 'down' ? 'lower' : 'higher';
  return `This week averages ${weeks.current.average} mg/dL, ${Math.abs(weeks.delta)} ${word} than last week (${weeks.previous.average}).`;
}

export function formatHour(hour) {
  const h = Number(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${suffix}`;
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
