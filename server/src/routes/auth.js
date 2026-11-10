const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { HttpError } = require('../utils/errors');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, created_at: u.created_at };
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!name) throw new HttpError(400, 'Please enter your name.', 'name');
    if (name.length > 100) throw new HttpError(400, 'Name is too long.', 'name');
    if (!email) throw new HttpError(400, 'Please enter your email.', 'email');
    if (!EMAIL_RE.test(email) || email.length > 254) {
      throw new HttpError(400, 'Please enter a valid email address.', 'email');
    }
    if (!password) throw new HttpError(400, 'Please enter a password.', 'password');
    if (password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters.', 'password');
    }
    if (password.length > 72) {
      // bcrypt only uses the first 72 bytes
      throw new HttpError(400, 'Password must be at most 72 characters.', 'password');
    }

    const hash = await bcrypt.hash(password, config.bcryptRounds);
    try {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email, hash]
      );
      const user = rows[0];
      return res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      if (err.code === '23505') {
        throw new HttpError(409, 'An account with this email already exists.', 'email');
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!email) throw new HttpError(400, 'Please enter your email.', 'email');
    if (!password) throw new HttpError(400, 'Please enter your password.', 'password');

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    // Same message for unknown email and wrong password (no account enumeration)
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) throw new HttpError(401, 'Invalid email or password.');

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) throw new HttpError(401, 'Account no longer exists.');
    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
