-- Sweety – Blood Glucose Tracker schema (idempotent)

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(254)  NOT NULL UNIQUE,
  password    VARCHAR(100)  NOT NULL,          -- bcrypt hash, never plain text
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date  DATE         NOT NULL,
  slot          VARCHAR(20)  NOT NULL
                CHECK (slot IN ('morning', 'after_breakfast', 'after_lunch', 'after_dinner')),
  value         INTEGER      NOT NULL CHECK (value BETWEEN 40 AND 600),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Only one reading per slot per day, per user
  CONSTRAINT readings_user_date_slot_key UNIQUE (user_id, reading_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_readings_user_date ON readings (user_id, reading_date);
