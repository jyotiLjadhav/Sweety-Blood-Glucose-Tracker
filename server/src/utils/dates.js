const config = require('../config');

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True only for real calendar dates in YYYY-MM-DD form. */
function isValidDateString(s) {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Today's date (YYYY-MM-DD) in the configured timezone. */
function todayString(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function firstOfMonth(dateStr) {
  return `${dateStr.slice(0, 7)}-01`;
}

function lastOfMonth(dateStr) {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** First and last day of the month before the one containing dateStr. */
function previousMonthRange(dateStr) {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const from = `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-01`;
  return { from, to: lastOfMonth(from) };
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

module.exports = {
  isValidDateString,
  todayString,
  firstOfMonth,
  lastOfMonth,
  previousMonthRange,
  addDays,
};
