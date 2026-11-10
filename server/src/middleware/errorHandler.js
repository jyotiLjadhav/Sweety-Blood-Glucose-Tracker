const { HttpError } = require('../utils/errors');

function notFound(_req, _res, next) {
  next(new HttpError(404, 'Route not found.'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, field: err.field });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
