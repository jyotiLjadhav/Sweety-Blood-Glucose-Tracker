# Sweety – Blood Glucose Tracker

A full-stack web app for people with diabetes to log blood glucose readings and review daily, month-to-date and previous-month reports. Built for the Kenpath *Junior Full Stack Developer – JavaScript & AI* assignment.

**Stack:** React (Vite) · Node.js · Express · PostgreSQL · bcrypt · JWT · Jest + Supertest · Vitest + React Testing Library

## Features

- Register, then log in on the login page (passwords hashed with **bcrypt**, JWT sessions); every user sees only their own data
- Add, view, edit and delete readings (date, one of 4 slots, whole-number value in mg/dL)
- All five Kenpath validation rules, enforced on the **backend** and mirrored in the UI with the exact messages
- Three reports: **Daily**, **Month-to-date**, **Previous month** — highest, lowest, average (1 dp), count, plus a friendly empty state
- Bonus: pagination + filters, monthly line chart (daily average / by slot), time-in-range bar, Docker, frontend tests
- iOS-style responsive UI (tab bar on phones, sidebar on desktop, dark mode, installable as a home-screen app)

## Quick start

Prerequisites: Node.js 20+ and PostgreSQL 14+ (or Docker).

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure PostgreSQL – create a database
createdb sweety            # or: psql -U postgres -c "CREATE DATABASE sweety;"
createdb sweety_test       # used only by the backend tests (they wipe its tables)

# 3. Configure environment
cp server/.env.example server/.env
#    edit server/.env: set DATABASE_URL / TEST_DATABASE_URL and JWT_SECRET

# 4. Create tables and load demo data
npm run db:init
npm run db:seed            # demo user + ~75 days of sample readings

# 5. Run (two terminals)
npm run dev:server         # API  → http://localhost:5000
npm run dev:client         # UI   → http://localhost:5173
```

**Demo login:** `demo@sweety.app` / `Demo@1234` (the login page also has a "Fill in demo account" button).

### Run with Docker (bonus)

```bash
docker compose up --build        # PostgreSQL + app on http://localhost:5000
docker compose exec app node db/seed.js   # load the demo user and readings
```

### Run the tests

```bash
npm test                   # backend (Jest + Supertest) then frontend (Vitest)
npm --prefix server test   # backend only – 53 tests
npm --prefix client test   # frontend only – 21 tests
```

Backend tests need the `sweety_test` database from step 2.

## Environment variables (`server/.env.example`)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database for `npm test` |
| `JWT_SECRET` | Secret for signing tokens (required) |
| `JWT_EXPIRES_IN` | Token lifetime (default 7d) |
| `BCRYPT_ROUNDS` | bcrypt cost (default 10) |
| `CLIENT_ORIGIN` | Allowed CORS origin(s) |
| `APP_TIMEZONE` | Timezone that defines "today" / "future date" (default Asia/Kolkata) |
| `SERVE_CLIENT` | `true` lets Express serve the built UI (`npm run build` first) |

## API

All `/api/readings` and `/api/reports` routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register (name, email, password) |
| POST | `/api/auth/login` | Log in |
| GET | `/api/readings?page&limit&from&to&slot` | List readings (paginated, newest first) |
| POST | `/api/readings` | Add `{ reading_date, slot, value }` |
| PUT | `/api/readings/:id` | Update a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/reports/daily?date=` | Daily report |
| GET | `/api/reports/month-to-date?date=` | 1st of month → date |
| GET | `/api/reports/monthly?date=` | Entire month before `date`'s month |
| GET | `/api/reports/chart?month=YYYY-MM` | Data for the monthly chart |

Slots: `morning`, `after_breakfast`, `after_lunch`, `after_dinner`. `date` defaults to today.

## Database

`users(id, name, email UNIQUE, password, created_at)` and `readings(id, user_id → users, reading_date, slot, value, created_at, updated_at)` with `CHECK` constraints on slot and value (40–600), `UNIQUE (user_id, reading_date, slot)`, and an index on `(user_id, reading_date)`. Reports use SQL `MAX`, `MIN`, `ROUND(AVG(), 1)` and `COUNT`. See `server/db/schema.sql`.

## Validation rules

| Rule | Message |
| --- | --- |
| Empty value | Please enter a glucose value. |
| Outside 40–600 | Value must be between 40 and 600 mg/dl. |
| Duplicate slot on a date | You already have an After lunch reading for this date. |
| 5th reading in a day | You can add only 4 readings per day. |
| Future date | Date cannot be in the future. |

Writes run in a transaction that locks the user's row, so two simultaneous requests cannot slip past the "one per slot" or "max 4" rules (covered by a concurrency test). Editing or deleting another user's reading by changing the URL id returns 404.

## Assumptions

- "Previous month report" means the whole calendar month before the month of the selected date (default: today).
- When a day already has 4 readings, the "max 4 per day" message is shown ahead of the duplicate-slot message.
- "Whole number" is enforced: `95.5` is rejected with its own message.
- "Today" is evaluated in `APP_TIMEZONE`, so the server decides what counts as a future date.
- Time-in-range colours use 70–180 mg/dL as the target range. This is a tracking aid, not medical advice.
- Passwords need 8+ characters (bcrypt only uses the first 72).

## With more time

- Refresh tokens / httpOnly cookies instead of a localStorage JWT, plus email verification and password reset
- Per-slot target ranges (fasting vs after-meal) and user-configurable thresholds
- Store an optional time and notes per reading; CSV / PDF export for doctors
- Doctor role, reminder notifications (BullMQ), and Redis caching of reports
- End-to-end browser tests (Playwright) and CI on GitHub Actions
- Proper migrations tool (e.g. node-pg-migrate) instead of one idempotent `schema.sql`

## Project structure

```
server/   Express API: src/ (routes, middleware, validation), db/ (schema, init, seed), tests/
client/   React app: src/ (pages, components, context, utils, styles)
docker-compose.yml, Dockerfile
```
