const {
  app, db, request, resetDb, createUser, auth, insertReadings,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

// Fixed "selected date": 15 October 2026 (matches the Kenpath examples)
const SELECTED = '2026-10-15';

async function setup() {
  const { token, user } = await createUser();
  await insertReadings(user.id, [
    // 15 Oct – the selected day
    ['2026-10-15', 'morning', 90],
    ['2026-10-15', 'after_breakfast', 140],
    ['2026-10-15', 'after_lunch', 120],
    ['2026-10-15', 'after_dinner', 111],
    // earlier in October
    ['2026-10-01', 'morning', 100],
    ['2026-10-10', 'after_dinner', 160],
    // after the selected date (must NOT be in month-to-date)
    ['2026-10-20', 'morning', 300],
    // September (previous month) – boundaries included
    ['2026-09-01', 'morning', 80],
    ['2026-09-15', 'after_lunch', 200],
    ['2026-09-30', 'after_dinner', 110],
    // August (must NOT be in September report) and 31 Aug boundary
    ['2026-08-31', 'morning', 500],
  ]);
  return token;
}

describe('GET /api/reports/daily', () => {
  test('calculates highest, lowest, average (1 dp) and count, with readings in slot order', async () => {
    const token = await setup();
    const res = await request(app).get(`/api/reports/daily?date=${SELECTED}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'daily', from: SELECTED, to: SELECTED, empty: false });
    expect(res.body.stats).toEqual({ highest: 140, lowest: 90, average: 115.3, count: 4 });
    expect(res.body.readings.map((r) => r.slot)).toEqual([
      'morning', 'after_breakfast', 'after_lunch', 'after_dinner',
    ]);
    expect(res.body.readings.map((r) => r.value)).toEqual([90, 140, 120, 111]);
  });

  test('friendly empty state when there are no readings', async () => {
    const token = await setup();
    const res = await request(app).get('/api/reports/daily?date=2026-10-16').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(true);
    expect(res.body.stats).toEqual({ highest: null, lowest: null, average: null, count: 0 });
    expect(res.body.readings).toEqual([]);
  });

  test('defaults to today when no date is given', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/reports/daily').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(true);
  });

  test('rejects an invalid date', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/reports/daily?date=15-10-2026').set(auth(token));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reports/month-to-date', () => {
  test('covers 1 Oct → selected date only', async () => {
    const token = await setup();
    const res = await request(app).get(`/api/reports/month-to-date?date=${SELECTED}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'month-to-date', from: '2026-10-01', to: SELECTED });
    // 90, 140, 120, 111, 100, 160 → sum 721 / 6 = 120.1666…
    expect(res.body.stats).toEqual({ highest: 160, lowest: 90, average: 120.2, count: 6 });
    expect(res.body.readings.every((r) => r.reading_date <= SELECTED)).toBe(true);
  });

  test('on the 1st of the month only includes that day', async () => {
    const token = await setup();
    const res = await request(app).get('/api/reports/month-to-date?date=2026-10-01').set(auth(token));
    expect(res.body.from).toBe('2026-10-01');
    expect(res.body.stats).toMatchObject({ count: 1, highest: 100, lowest: 100, average: 100 });
  });

  test('empty month shows empty state', async () => {
    const token = await setup();
    const res = await request(app).get('/api/reports/month-to-date?date=2026-07-15').set(auth(token));
    expect(res.body.empty).toBe(true);
  });
});

describe('GET /api/reports/monthly (previous month)', () => {
  test('covers the entire previous month (1 Sep → 30 Sep)', async () => {
    const token = await setup();
    const res = await request(app).get(`/api/reports/monthly?date=${SELECTED}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'monthly', from: '2026-09-01', to: '2026-09-30' });
    // 80, 200, 110 → avg 130
    expect(res.body.stats).toEqual({ highest: 200, lowest: 80, average: 130, count: 3 });
  });

  test('handles year rollover (January → previous December)', async () => {
    const { token, user } = await createUser();
    await insertReadings(user.id, [['2025-12-31', 'morning', 99], ['2026-01-01', 'morning', 500]]);
    const res = await request(app).get('/api/reports/monthly?date=2026-01-20').set(auth(token));
    expect(res.body).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(res.body.stats.count).toBe(1);
    expect(res.body.stats.highest).toBe(99);
  });

  test('handles February in a non-leap year', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/reports/monthly?date=2026-03-10').set(auth(token));
    expect(res.body).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
  });

  test('friendly empty state', async () => {
    const token = await setup();
    const res = await request(app).get('/api/reports/monthly?date=2026-05-10').set(auth(token));
    expect(res.body.empty).toBe(true);
    expect(res.body.stats.count).toBe(0);
  });
});

describe('report isolation & chart data', () => {
  test("reports only include the logged-in user's readings", async () => {
    const a = await createUser();
    const b = await createUser();
    await insertReadings(a.user.id, [[SELECTED, 'morning', 100]]);
    await insertReadings(b.user.id, [[SELECTED, 'morning', 400]]);
    const res = await request(app).get(`/api/reports/daily?date=${SELECTED}`).set(auth(a.token));
    expect(res.body.stats).toMatchObject({ count: 1, highest: 100 });
  });

  test('GET /api/reports/chart returns a month of readings and daily averages', async () => {
    const token = await setup();
    const res = await request(app).get('/api/reports/chart?month=2026-10').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
    expect(res.body.readings).toHaveLength(7);
    const day15 = res.body.daily.find((d) => d.reading_date === SELECTED);
    expect(day15.average).toBe(115.3);

    const bad = await request(app).get('/api/reports/chart?month=2026-13').set(auth(token));
    expect(bad.status).toBe(400);
  });
});
