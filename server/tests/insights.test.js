const {
  app, request, resetDb, createUser, auth, insertReadings, today, daysFromToday,
} = require('./helpers');

beforeEach(resetDb);
afterAll(async () => {
  const db = require('../src/db');
  await db.pool.end();
});

describe('GET /api/reports/insights', () => {
  test('streak, week comparison, time in range, estimated HbA1c and slot tips come from saved readings', async () => {
    const { token, user } = await createUser();
    await insertReadings(user.id, [
      [today(), 'morning', 100],
      [today(), 'after_breakfast', 140],
      [daysFromToday(-1), 'morning', 120],
      [daysFromToday(-2), 'after_lunch', 110],
      [daysFromToday(-7), 'after_dinner', 160],
    ]);

    const res = await request(app).get('/api/reports/insights').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.today).toBe(today());
    expect(res.body.progress).toEqual({ logged: 2, goal: 4, slots: expect.arrayContaining(['morning', 'after_breakfast']) });
    expect(res.body.streak).toBe(3);

    expect(res.body.weeks.current.average).toBe(117.5);
    expect(res.body.weeks.previous.average).toBe(160);
    expect(res.body.weeks.delta).toBe(-42.5);
    expect(res.body.weeks.direction).toBe('down');
    expect(res.body.weeks.current.days).toHaveLength(7);
    expect(res.body.weeks.current.days.at(-1).date).toBe(today());

    expect(res.body.timeInRange).toMatchObject({
      count: 5, low: 0, inRange: 5, high: 0, inRangePct: 100,
    });

    // (126 + 46.7) / 28.7 = 6.017… → 6
    expect(res.body.hba1c.readings).toBe(5);
    expect(res.body.hba1c.average).toBe(126);
    expect(res.body.hba1c.estimate).toBe(6);
    expect(res.body.hba1c.note).toMatch(/not a laboratory/i);

    const morning = res.body.slots.find((s) => s.slot === 'morning');
    expect(morning.average).toBe(110);
    expect(morning.tip).toMatch(/70–130/);
    const dinner = res.body.slots.find((s) => s.slot === 'after_dinner');
    expect(dinner.average).toBe(160);
    expect(dinner.tip).toMatch(/180/);
  });

  test('a gap of more than a day ends the streak, and too few readings omit the HbA1c number', async () => {
    const { token, user } = await createUser();
    await insertReadings(user.id, [
      [daysFromToday(-3), 'morning', 99],
    ]);
    const res = await request(app).get('/api/reports/insights').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(0);
    expect(res.body.progress.logged).toBe(0);
    expect(res.body.hba1c.estimate).toBeNull();
    expect(res.body.weeks.direction).toBe('unknown');
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/reports/insights');
    expect(res.status).toBe(401);
  });
});
