const config = require('./config');
const app = require('./app');
const { pool } = require('./db');
const init = require('../db/init');

async function start() {
  await init(); // make sure tables exist
  const server = app.listen(config.port, () => {
    console.log(`Sweety API listening on http://localhost:${config.port}`);
  });

  const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
