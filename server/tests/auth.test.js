const { app, db, request, resetDb, createUser, auth } = require('./helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

describe('POST /api/auth/register', () => {
  test('registers a user and returns a token (no password in response)', async () => {
    const { res } = await createUser({ name: 'Asha', email: 'Asha@Example.com' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Asha', email: 'asha@example.com' });
    expect(res.body.user.password).toBeUndefined();
  });

  test('stores the password as a bcrypt hash, never plain text', async () => {
    const { body } = await createUser();
    const { rows } = await db.query('SELECT password FROM users WHERE email = $1', [body.email]);
    expect(rows[0].password).not.toBe(body.password);
    expect(rows[0].password).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  test('rejects duplicate email', async () => {
    const first = await createUser({ email: 'dup@example.com' });
    expect(first.res.status).toBe(201);
    const second = await createUser({ email: 'DUP@example.com' });
    expect(second.res.status).toBe(409);
    expect(second.res.body.message).toMatch(/already exists/i);
  });

  test.each([
    [{ name: '' }, 'name'],
    [{ email: 'not-an-email' }, 'email'],
    [{ password: 'short' }, 'password'],
    [{ password: '' }, 'password'],
  ])('rejects invalid input %j', async (override, field) => {
    const { res } = await createUser(override);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const { body } = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: body.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(body.email);
  });

  test('rejects wrong password and unknown email with the same message', async () => {
    const { body } = await createUser();
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'WrongPass1' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Whatever1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });
});

describe('authentication guard', () => {
  test('reading and report endpoints require a token', async () => {
    const paths = [
      ['get', '/api/readings'],
      ['post', '/api/readings'],
      ['put', '/api/readings/1'],
      ['delete', '/api/readings/1'],
      ['get', '/api/reports/daily'],
      ['get', '/api/reports/month-to-date'],
      ['get', '/api/reports/monthly'],
    ];
    for (const [method, path] of paths) {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    }
  });

  test('rejects an invalid token', async () => {
    const res = await request(app).get('/api/readings').set(auth('garbage'));
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns the current user', async () => {
    const { token, body } = await createUser();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(body.email);
  });
});
