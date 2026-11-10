const express = require('express');
const db = require('../db');
const config = require('../config');
const { HttpError } = require('../utils/errors');
const { requireAuth } = require('../middleware/auth');
const { todayString } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

function hourNow(now = new Date()) {
  const part = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(now)
    .find((p) => p.type === 'hour');
  const hour = Number(part?.value ?? 0);
  return hour === 24 ? 0 : hour;
}

async function loadPrefs(userId) {
  const { rows } = await db.query(
    'SELECT enabled, remind_hour FROM reminder_prefs WHERE user_id = $1',
    [userId]
  );
  return rows[0] || { enabled: true, remind_hour: 20 };
}

router.get('/', async (req, res, next) => {
  try {
    const prefs = await loadPrefs(req.user.id);
    const today = todayString();
    const { rows } = await db.query(
      `SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2`,
      [req.user.id, today]
    );
    const slots = rows.map((r) => r.slot);
    const hour = hourNow();
    res.json({
      enabled: prefs.enabled,
      hour: prefs.remind_hour,
      today,
      loggedToday: slots.length,
      slots,
      due: Boolean(prefs.enabled && slots.length === 0 && hour >= prefs.remind_hour),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const enabled = Boolean(req.body.enabled);
    const hour = Number(req.body.hour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new HttpError(400, 'Choose an hour between 0 and 23.', 'hour');
    }
    const { rows } = await db.query(
      `INSERT INTO reminder_prefs (user_id, enabled, remind_hour)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET enabled = EXCLUDED.enabled, remind_hour = EXCLUDED.remind_hour, updated_at = NOW()
       RETURNING enabled, remind_hour`,
      [req.user.id, enabled, hour]
    );
    res.json({ enabled: rows[0].enabled, hour: rows[0].remind_hour });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
