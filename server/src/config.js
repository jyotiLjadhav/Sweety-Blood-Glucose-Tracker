require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: isTest
    ? process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sweety_test'
    : process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sweety',
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-secret' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: isTest ? 4 : Number(process.env.BCRYPT_ROUNDS) || 10,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Timezone used to decide what "today" and "future date" mean.
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  serveClient: process.env.SERVE_CLIENT === 'true',
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a strong secret.');
}

module.exports = config;
