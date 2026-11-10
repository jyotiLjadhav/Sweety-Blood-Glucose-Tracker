const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.env === 'test' ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reminders', require('./routes/reminders'));

// Optionally serve the built React app (single-container deployments)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (config.serveClient && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
