const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils/errors');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Authentication required.'));
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), email: payload.email };
    return next();
  } catch (_err) {
    return next(new HttpError(401, 'Your session has expired. Please log in again.'));
  }
}

module.exports = { requireAuth };
