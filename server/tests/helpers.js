const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const init = require('../db/init');
const { todayString, addDays } = require('../src/utils/dates');

async function resetDb() {
  await init();
  await db.query('TRUNCATE readings, reminder_prefs, users RESTART IDENTITY CASCADE');
}

let counter = 0;
async function createUser(overrides = {}) {
  counter += 1;
  const body = {
    name: 'Test User',
    email: `user${counter}@example.com`,
    password: 'Passw0rd!',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { token: res.body.token, user: res.body.user, body, res };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

function addReading(token, data) {
  return request(app).post('/api/readings').set(auth(token)).send(data);
}

/** Insert readings straight into the DB (bypasses validation, handy for reports). */
async function insertReadings(userId, rows) {
  for (const [date, slot, value] of rows) {
    await db.query(
      'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
      [userId, date, slot, value]
    );
  }
}

module.exports = {
  app,
  db,
  request,
  resetDb,
  createUser,
  auth,
  addReading,
  insertReadings,
  today: () => todayString(),
  daysFromToday: (n) => addDays(todayString(), n),
};
