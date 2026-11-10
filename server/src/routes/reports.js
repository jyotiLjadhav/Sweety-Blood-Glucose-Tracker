const express = require('express');
const db = require('../db');
const { HttpError } = require('../utils/errors');
const { requireAuth } = require('../middleware/auth');
const {
  isValidDateString,
  todayString,
  firstOfMonth,
  lastOfMonth,
  previousMonthRange,
} = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const SLOT_ORDER = `CASE slot WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2
                    WHEN 'after_lunch' THEN 3 ELSE 4 END`;

function selectedDate(req) {
  const date = req.query.date || todayString();
  if (!isValidDateString(date)) {
    throw new HttpError(400, 'Please provide a valid date (YYYY-MM-DD).', 'date');
  }
  return date;
}

/** Builds a report for [from, to] inclusive using SQL aggregates. */
async function buildReport(userId, type, from, to) {
  const stats = await db.query(
    `SELECT MAX(value)::int                      AS highest,
            MIN(value)::int                      AS lowest,
            ROUND(AVG(value)::numeric, 1)::float AS average,
            COUNT(value)::int                    AS count
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  const readings = await db.query(
    `SELECT id, reading_date, slot, value
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
     ORDER BY reading_date ASC, ${SLOT_ORDER} ASC`,
    [userId, from, to]
  );
  const s = stats.rows[0];
  return {
    type,
    from,
    to,
    empty: s.count === 0,
    stats: {
      highest: s.highest,
      lowest: s.lowest,
      average: s.average,
      count: s.count,
    },
    readings: readings.rows,
  };
}

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', async (req, res, next) => {
  try {
    const date = selectedDate(req);
    res.json(await buildReport(req.user.id, 'daily', date, date));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/month-to-date?date=YYYY-MM-DD  (1st of that month → date)
router.get('/month-to-date', async (req, res, next) => {
  try {
    const date = selectedDate(req);
    res.json(await buildReport(req.user.id, 'month-to-date', firstOfMonth(date), date));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly?date=YYYY-MM-DD  (entire month before the one containing date)
router.get('/monthly', async (req, res, next) => {
  try {
    const date = selectedDate(req);
    const { from, to } = previousMonthRange(date);
    res.json(await buildReport(req.user.id, 'monthly', from, to));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/chart?month=YYYY-MM  – data for the monthly line chart
router.get('/chart', async (req, res, next) => {
  try {
    const month = req.query.month || todayString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new HttpError(400, 'Please provide a valid month (YYYY-MM).', 'month');
    }
    const from = `${month}-01`;
    const to = lastOfMonth(from);
    const { rows } = await db.query(
      `SELECT reading_date, slot, value
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
       ORDER BY reading_date ASC, ${SLOT_ORDER} ASC`,
      [req.user.id, from, to]
    );
    const daily = await db.query(
      `SELECT reading_date, ROUND(AVG(value)::numeric, 1)::float AS average
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
       GROUP BY reading_date ORDER BY reading_date`,
      [req.user.id, from, to]
    );
    res.json({ month, from, to, readings: rows, daily: daily.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
