/**
 * Seed script: creates the demo user and ~75 days of sample glucose readings
 * (covers the current month, the previous month and part of the one before,
 * so every report has data).
 *
 *   Demo login →  demo@sweety.app  /  Demo@1234
 *
 * Safe to run repeatedly: the demo user's readings are replaced each time.
 */
const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('../src/db');
const config = require('../src/config');
const init = require('./init');
const { todayString, addDays } = require('../src/utils/dates');

const DEMO = { name: 'Demo User', email: 'demo@sweety.app', password: 'Demo@1234' };
const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
const DAYS_BACK = 75;

// Typical values per slot (mg/dL) with some natural variation
const BASE = { morning: 98, after_breakfast: 138, after_lunch: 132, after_dinner: 126 };

// Small deterministic PRNG so the seed data is the same on every run
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seed() {
  await init();
  const rand = mulberry32(2026);
  const hash = await bcrypt.hash(DEMO.password, config.bcryptRounds);
  const today = todayString();

  const rows = [];
  for (let i = 0; i < DAYS_BACK; i++) {
    const date = addDays(today, -i);
    // A few days with no readings at all, to make reports/charts realistic
    if (i > 0 && rand() < 0.08) continue;
    // Most days have 3–4 readings; some have fewer
    // Today only has the first two readings, so the demo user can add more right away
    const slotsForDay =
      i === 0 ? ['morning', 'after_breakfast'] : SLOTS.filter((s) => s === 'morning' || rand() < 0.85);
    for (const slot of slotsForDay) {
      const spike = rand() < 0.07 ? 35 + rand() * 40 : 0; // occasional high
      const dip = rand() < 0.03 ? -30 : 0; // rare low
      const value = Math.round(BASE[slot] + (rand() - 0.5) * 36 + spike + dip);
      rows.push([date, slot, Math.min(600, Math.max(40, value))]);
    }
  }

  const userId = await withTransaction(async (client) => {
    const { rows: u } = await client.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password
       RETURNING id`,
      [DEMO.name, DEMO.email, hash]
    );
    const id = u[0].id;
    await client.query('DELETE FROM readings WHERE user_id = $1', [id]);
    for (const [date, slot, value] of rows) {
      await client.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [id, date, slot, value]
      );
    }
    return id;
  });

  return { userId, count: rows.length };
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(({ count }) => {
      console.log(`✔ Seeded demo user and ${count} sample readings`);
      console.log(`  Email:    ${DEMO.email}`);
      console.log(`  Password: ${DEMO.password}`);
    })
    .catch((err) => {
      console.error('✖ Seeding failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
