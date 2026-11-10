const { todayString, addDays, isValidDateString } = require('../utils/dates');
const db = require('../db');

/** ISO week (1-53) for a YYYY-MM-DD date. */
function isoWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Thursday of the current week determines the ISO year.
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return { isoYear: dt.getUTCFullYear(), week: weekNo };
}

/** Returns [from, to] for the ISO week containing dateStr. */
function weekRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7; // 1 (Mon) .. 7 (Sun)
  const monday = new Date(Date.UTC(y, m - 1, d - day + 1));
  const sunday = new Date(Date.UTC(y, m - 1, d - day + 7));
  const fmt = (dt) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  return [fmt(monday), fmt(sunday)];
}

/** Validate both dates and ensure from <= to. */
function customRange(req) {
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to) throw new Error('from and to are required');
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new Error('Invalid date (YYYY-MM-DD).');
  }
  if (from > to) throw new Error('from must be on or before to.');
  return [from, to];
}

module.exports = { isoWeek, weekRange, customRange };