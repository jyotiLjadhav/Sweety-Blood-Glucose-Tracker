const express = require('express');
const db = require('../db');
const { HttpError } = require('../utils/errors');
const { requireAuth } = require('../middleware/auth');
const { isValidDateString } = require('../utils/dates');
const {
  SLOT_KEYS,
  MAX_READINGS_PER_DAY,
  MAX_PER_DAY_MESSAGE,
  duplicateSlotMessage,
  validateReadingInput,
} = require('../validation');

const router = express.Router();
router.use(requireAuth);

const COLUMNS = 'id, reading_date, slot, value, created_at, updated_at';
const SLOT_ORDER = `CASE slot WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2
                    WHEN 'after_lunch' THEN 3 ELSE 4 END`;

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Reading not found.');
  return id;
}

/**
 * Enforces the "max 4 per day" and "one per slot per day" rules.
 * Must run inside a transaction that holds the user's row lock.
 */
async function assertDayHasRoom(client, { userId, date, slot, excludeId = null }) {
  const { rows } = await client.query(
    `SELECT id, slot FROM readings
     WHERE user_id = $1 AND reading_date = $2 AND ($3::int IS NULL OR id <> $3)`,
    [userId, date, excludeId]
  );
  if (rows.length >= MAX_READINGS_PER_DAY) {
    throw new HttpError(400, MAX_PER_DAY_MESSAGE, 'reading_date');
  }
  if (rows.some((r) => r.slot === slot)) {
    throw new HttpError(409, duplicateSlotMessage(slot), 'slot');
  }
}

/** Serialise writes per user so concurrent requests can't bypass the limits. */
function lockUser(client, userId) {
  return client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
}

// GET /api/readings?page=1&limit=10&from=YYYY-MM-DD&to=YYYY-MM-DD&slot=morning
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { from, to, slot } = req.query;

    const where = ['user_id = $1'];
    const params = [req.user.id];
    if (from) {
      if (!isValidDateString(from)) throw new HttpError(400, 'Invalid "from" date.', 'from');
      params.push(from);
      where.push(`reading_date >= $${params.length}`);
    }
    if (to) {
      if (!isValidDateString(to)) throw new HttpError(400, 'Invalid "to" date.', 'to');
      params.push(to);
      where.push(`reading_date <= $${params.length}`);
    }
    if (slot) {
      if (!SLOT_KEYS.includes(slot)) throw new HttpError(400, 'Invalid slot.', 'slot');
      params.push(slot);
      where.push(`slot = $${params.length}`);
    }
    const whereSql = where.join(' AND ');

    const count = await db.query(`SELECT COUNT(*)::int AS total FROM readings WHERE ${whereSql}`, params);
    const total = count.rows[0].total;

    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM readings WHERE ${whereSql}
       ORDER BY reading_date DESC, ${SLOT_ORDER} DESC
       LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/readings
router.post('/', async (req, res, next) => {
  try {
    const input = validateReadingInput(req.body);
    const reading = await db.withTransaction(async (client) => {
      await lockUser(client, req.user.id);
      await assertDayHasRoom(client, {
        userId: req.user.id,
        date: input.reading_date,
        slot: input.slot,
      });
      const { rows } = await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
        [req.user.id, input.reading_date, input.slot, input.value]
      );
      return rows[0];
    });
    res.status(201).json({ reading });
  } catch (err) {
    next(err);
  }
});

// PUT /api/readings/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const input = validateReadingInput(req.body);
    const reading = await db.withTransaction(async (client) => {
      await lockUser(client, req.user.id);
      // Ownership is part of the query: another user's id simply "does not exist".
      const existing = await client.query(
        'SELECT id FROM readings WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!existing.rows[0]) throw new HttpError(404, 'Reading not found.');

      await assertDayHasRoom(client, {
        userId: req.user.id,
        date: input.reading_date,
        slot: input.slot,
        excludeId: id,
      });
      const { rows } = await client.query(
        `UPDATE readings
         SET reading_date = $1, slot = $2, value = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING ${COLUMNS}`,
        [input.reading_date, input.slot, input.value, id, req.user.id]
      );
      return rows[0];
    });
    res.json({ reading });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/readings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { rowCount } = await db.query(
      'DELETE FROM readings WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!rowCount) throw new HttpError(404, 'Reading not found.');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
