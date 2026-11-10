const { app, request, resetDb, createUser, auth } = require('./helpers');

beforeEach(resetDb);
afterAll(async () => {
  const db = require('../src/db');
  await db.pool.end();
});

describe('/api/reminders', () => {
  test('defaults to an 8pm reminder and saves a new hour', async () => {
    const { token } = await createUser();
    const first = await request(app).get('/api/reminders').set(auth(token));
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ enabled: true, hour: 20, loggedToday: 0 });
    expect(typeof first.body.due).toBe('boolean');

    const saved = await request(app).put('/api/reminders').set(auth(token)).send({ enabled: false, hour: 9 });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ enabled: false, hour: 9 });

    const again = await request(app).get('/api/reminders').set(auth(token));
    expect(again.body.enabled).toBe(false);
    expect(again.body.hour).toBe(9);
    expect(again.body.due).toBe(false);
  });

  test('rejects an hour outside 0–23', async () => {
    const { token } = await createUser();
    const res = await request(app).put('/api/reminders').set(auth(token)).send({ enabled: true, hour: 24 });
    expect(res.status).toBe(400);
  });
});
