const {
  app, db, request, resetDb, createUser, auth, addReading, insertReadings, today, daysFromToday,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

describe('validation rules (exact Kenpath messages)', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await createUser());
  });

  test('empty value → "Please enter a glucose value."', async () => {
    for (const value of ['', null, undefined, '   ']) {
      const res = await addReading(token, { reading_date: today(), slot: 'morning', value });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Please enter a glucose value.');
    }
  });

  test.each([39, 601, 0, -5, 1000])(
    'value %i → "Value must be between 40 and 600 mg/dl."',
    async (value) => {
      const res = await addReading(token, { reading_date: today(), slot: 'morning', value });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Value must be between 40 and 600 mg/dl.');
    }
  );

  test('boundary values 40 and 600 are accepted', async () => {
    const a = await addReading(token, { reading_date: today(), slot: 'morning', value: 40 });
    const b = await addReading(token, { reading_date: today(), slot: 'after_lunch', value: 600 });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  test.each([95.5, 'abc', '9 5'])('non-whole number %p is rejected', async (value) => {
    const res = await addReading(token, { reading_date: today(), slot: 'morning', value });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Glucose value must be a whole number.');
  });

  test('numeric string values are accepted', async () => {
    const res = await addReading(token, { reading_date: today(), slot: 'morning', value: '95' });
    expect(res.status).toBe(201);
    expect(res.body.reading.value).toBe(95);
  });

  test('future date → "Date cannot be in the future."', async () => {
    const res = await addReading(token, { reading_date: daysFromToday(1), slot: 'morning', value: 95 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Date cannot be in the future.');
  });

  test("today's date is allowed", async () => {
    const res = await addReading(token, { reading_date: today(), slot: 'morning', value: 95 });
    expect(res.status).toBe(201);
  });

  test('duplicate slot on same date → "You already have an After lunch reading for this date."', async () => {
    const first = await addReading(token, { reading_date: today(), slot: 'after_lunch', value: 120 });
    expect(first.status).toBe(201);
    const dup = await addReading(token, { reading_date: today(), slot: 'after_lunch', value: 130 });
    expect(dup.status).toBe(409);
    expect(dup.body.message).toBe('You already have an After lunch reading for this date.');
  });

  test('duplicate message uses "a" for Morning', async () => {
    await addReading(token, { reading_date: today(), slot: 'morning', value: 90 });
    const dup = await addReading(token, { reading_date: today(), slot: 'morning', value: 91 });
    expect(dup.body.message).toBe('You already have a Morning reading for this date.');
  });

  test('same slot on a different date is fine', async () => {
    await addReading(token, { reading_date: today(), slot: 'morning', value: 90 });
    const res = await addReading(token, { reading_date: daysFromToday(-1), slot: 'morning', value: 92 });
    expect(res.status).toBe(201);
  });

  test('a 5th reading in one day → "You can add only 4 readings per day."', async () => {
    for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      const ok = await addReading(token, { reading_date: today(), slot, value: 100 });
      expect(ok.status).toBe(201);
    }
    const fifth = await addReading(token, { reading_date: today(), slot: 'morning', value: 100 });
    expect(fifth.status).toBe(400);
    expect(fifth.body.message).toBe('You can add only 4 readings per day.');
  });

  test('invalid slot / missing date are rejected', async () => {
    const badSlot = await addReading(token, { reading_date: today(), slot: 'midnight', value: 100 });
    expect(badSlot.status).toBe(400);
    const noDate = await addReading(token, { slot: 'morning', value: 100 });
    expect(noDate.status).toBe(400);
    const badDate = await addReading(token, { reading_date: '2026-02-31', slot: 'morning', value: 100 });
    expect(badDate.status).toBe(400);
  });

  test('concurrent duplicate requests only create one reading', async () => {
    const payload = { reading_date: today(), slot: 'morning', value: 100 };
    const results = await Promise.all([1, 2, 3, 4].map(() => addReading(token, payload)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM readings');
    expect(rows[0].n).toBe(1);
  });
});

describe('CRUD', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await createUser());
  });

  test('create → list → update → delete', async () => {
    const created = await addReading(token, { reading_date: today(), slot: 'morning', value: 95 });
    expect(created.status).toBe(201);
    const id = created.body.reading.id;

    const list = await request(app).get('/api/readings').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id, slot: 'morning', value: 95, reading_date: today() });

    const updated = await request(app)
      .put(`/api/readings/${id}`)
      .set(auth(token))
      .send({ reading_date: today(), slot: 'after_breakfast', value: 140 });
    expect(updated.status).toBe(200);
    expect(updated.body.reading).toMatchObject({ slot: 'after_breakfast', value: 140 });

    const del = await request(app).delete(`/api/readings/${id}`).set(auth(token));
    expect(del.status).toBe(204);
    const after = await request(app).get('/api/readings').set(auth(token));
    expect(after.body.data).toHaveLength(0);
  });

  test('update re-applies validation', async () => {
    const a = await addReading(token, { reading_date: today(), slot: 'morning', value: 95 });
    await addReading(token, { reading_date: today(), slot: 'after_lunch', value: 120 });

    const toFuture = await request(app).put(`/api/readings/${a.body.reading.id}`).set(auth(token))
      .send({ reading_date: daysFromToday(2), slot: 'morning', value: 95 });
    expect(toFuture.body.message).toBe('Date cannot be in the future.');

    const toDup = await request(app).put(`/api/readings/${a.body.reading.id}`).set(auth(token))
      .send({ reading_date: today(), slot: 'after_lunch', value: 95 });
    expect(toDup.status).toBe(409);
    expect(toDup.body.message).toBe('You already have an After lunch reading for this date.');

    const badValue = await request(app).put(`/api/readings/${a.body.reading.id}`).set(auth(token))
      .send({ reading_date: today(), slot: 'morning', value: 9000 });
    expect(badValue.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('editing a reading without changing its slot is not a duplicate of itself', async () => {
    const a = await addReading(token, { reading_date: today(), slot: 'morning', value: 95 });
    const res = await request(app).put(`/api/readings/${a.body.reading.id}`).set(auth(token))
      .send({ reading_date: today(), slot: 'morning', value: 99 });
    expect(res.status).toBe(200);
    expect(res.body.reading.value).toBe(99);
  });

  test('moving a reading onto a full day is rejected', async () => {
    for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      await addReading(token, { reading_date: today(), slot, value: 100 });
    }
    const other = await addReading(token, { reading_date: daysFromToday(-3), slot: 'morning', value: 100 });
    const res = await request(app).put(`/api/readings/${other.body.reading.id}`).set(auth(token))
      .send({ reading_date: today(), slot: 'morning', value: 100 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You can add only 4 readings per day.');
  });

  test('404 for non-existent reading / invalid id', async () => {
    const put = await request(app).put('/api/readings/9999').set(auth(token))
      .send({ reading_date: today(), slot: 'morning', value: 100 });
    expect(put.status).toBe(404);
    const del = await request(app).delete('/api/readings/abc').set(auth(token));
    expect(del.status).toBe(404);
  });

  test('list supports pagination, date range and slot filters; newest first', async () => {
    const rows = [];
    for (let i = 0; i < 12; i++) rows.push([daysFromToday(-i), 'morning', 90 + i]);
    rows.push([today(), 'after_dinner', 150]);
    const { user } = await createUser();
    await insertReadings(user.id, rows);
    const me = (await request(app).get('/api/auth/me').set(auth(token))).body.user;
    await insertReadings(me.id, rows);

    const p1 = await request(app).get('/api/readings?page=1&limit=5').set(auth(token));
    expect(p1.body.data).toHaveLength(5);
    expect(p1.body.pagination).toEqual({ page: 1, limit: 5, total: 13, totalPages: 3 });
    expect(p1.body.data[0].reading_date).toBe(today());
    expect(p1.body.data[0].slot).toBe('after_dinner'); // latest slot first within a day

    const p3 = await request(app).get('/api/readings?page=3&limit=5').set(auth(token));
    expect(p3.body.data).toHaveLength(3);

    const range = await request(app)
      .get(`/api/readings?from=${daysFromToday(-2)}&to=${today()}`).set(auth(token));
    expect(range.body.pagination.total).toBe(4);

    const slot = await request(app).get('/api/readings?slot=after_dinner').set(auth(token));
    expect(slot.body.pagination.total).toBe(1);

    const bad = await request(app).get('/api/readings?from=nope').set(auth(token));
    expect(bad.status).toBe(400);
  });
});

describe('data isolation between users', () => {
  test("a user only sees their own readings", async () => {
    const a = await createUser();
    const b = await createUser();
    await addReading(a.token, { reading_date: today(), slot: 'morning', value: 100 });
    await addReading(b.token, { reading_date: today(), slot: 'morning', value: 200 });

    const listA = await request(app).get('/api/readings').set(auth(a.token));
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].value).toBe(100);
  });

  test("users can have the same slot/date without conflict", async () => {
    const a = await createUser();
    const b = await createUser();
    const r1 = await addReading(a.token, { reading_date: today(), slot: 'morning', value: 100 });
    const r2 = await addReading(b.token, { reading_date: today(), slot: 'morning', value: 110 });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });

  test("cannot edit or delete another user's reading by changing the URL id", async () => {
    const a = await createUser();
    const b = await createUser();
    const created = await addReading(a.token, { reading_date: today(), slot: 'morning', value: 100 });
    const id = created.body.reading.id;

    const put = await request(app).put(`/api/readings/${id}`).set(auth(b.token))
      .send({ reading_date: today(), slot: 'morning', value: 300 });
    expect(put.status).toBe(404);

    const del = await request(app).delete(`/api/readings/${id}`).set(auth(b.token));
    expect(del.status).toBe(404);

    const { rows } = await db.query('SELECT value FROM readings WHERE id = $1', [id]);
    expect(rows[0].value).toBe(100); // untouched
  });
});

describe('GET /api/readings/export', () => {
  test('returns this user’s readings as CSV and nothing from anyone else', async () => {
    const a = await createUser();
    const b = await createUser();
    await insertReadings(a.user.id, [
      [daysFromToday(-1), 'after_dinner', 150],
      [today(), 'morning', 95],
    ]);
    await insertReadings(b.user.id, [[today(), 'morning', 400]]);

    const res = await request(app).get('/api/readings/export').set(auth(a.token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toBe(
      `date,slot,value_mg_dl\n${daysFromToday(-1)},after_dinner,150\n${today()},morning,95\n`
    );
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/readings/export');
    expect(res.status).toBe(401);
  });
});
