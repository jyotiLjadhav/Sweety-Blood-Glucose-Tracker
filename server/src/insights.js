const { addDays } = require('./utils/dates');

const LOW = 70;
const HIGH = 180;
const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function average(values) {
  if (!values.length) return null;
  return round1(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Consecutive days with at least one reading, ending today.
 * If today is still empty, yesterday still counts so a streak is not lost before the day ends.
 * A gap of two or more days resets it to 0.
 */
function loggingStreak(dates, today) {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
    if (n > 3660) break;
  }
  return n;
}

/** ADAG: estimated average glucose (mg/dL) ≈ 28.7 × HbA1c − 46.7. */
function hba1cFromAverage(avg) {
  if (avg == null) return null;
  return round1((avg + 46.7) / 28.7);
}

function slotTip(slot, avg) {
  if (avg == null) return 'Log this time of day a few times and a tip will show up here.';
  if (slot === 'morning') {
    if (avg < LOW) {
      return 'Morning readings are running low. Mention this pattern to your clinician before changing food or insulin.';
    }
    if (avg <= 130) {
      return 'Fasting readings sit in a typical 70–130 mg/dL range. The current evening routine looks steady.';
    }
    return 'Fasting readings are above 130 mg/dL. A regular dinner time often steadies the next morning — check that plan with your clinician.';
  }
  if (avg < LOW) {
    return 'These readings are often low. Keep a fast sugar source nearby and tell your clinician if it keeps happening.';
  }
  if (avg <= HIGH) {
    return 'This time of day is staying at or under 180 mg/dL. The current meal pattern is working.';
  }
  return 'This time of day is often above 180 mg/dL. A slightly smaller meal or a short walk afterward is a common next step to discuss.';
}

function between(rows, from, to) {
  return rows.filter((r) => r.reading_date >= from && r.reading_date <= to);
}

function dailySeries(rows, from) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(from, i);
    const values = rows.filter((r) => r.reading_date === date).map((r) => r.value);
    days.push({ date, average: average(values), count: values.length });
  }
  return days;
}

/**
 * @param {Array<{reading_date: string, slot: string, value: number}>} rows last 90 days
 * @param {string[]} dates distinct reading dates, any history, YYYY-MM-DD
 * @param {string} today
 */
function buildInsights(rows, dates, today) {
  const weekFrom = addDays(today, -6);
  const prevFrom = addDays(today, -13);
  const prevTo = addDays(today, -7);
  const tirFrom = addDays(today, -13);
  const slotFrom = addDays(today, -29);
  const hbaFrom = addDays(today, -89);

  const currentRows = between(rows, weekFrom, today);
  const previousRows = between(rows, prevFrom, prevTo);
  const currentAvg = average(currentRows.map((r) => r.value));
  const previousAvg = average(previousRows.map((r) => r.value));
  let delta = null;
  let direction = 'unknown';
  if (currentAvg != null && previousAvg != null) {
    delta = round1(currentAvg - previousAvg);
    direction = Math.abs(delta) < 1 ? 'flat' : delta > 0 ? 'up' : 'down';
  }

  const tirRows = between(rows, tirFrom, today);
  const low = tirRows.filter((r) => r.value < LOW).length;
  const high = tirRows.filter((r) => r.value > HIGH).length;
  const inRange = tirRows.length - low - high;
  const pct = (n) => (tirRows.length ? Math.round((n / tirRows.length) * 100) : 0);

  const hbaRows = between(rows, hbaFrom, today);
  const hbaAvg = average(hbaRows.map((r) => r.value));
  const todayRows = rows.filter((r) => r.reading_date === today);

  return {
    today,
    progress: {
      logged: todayRows.length,
      goal: 4,
      slots: todayRows.map((r) => r.slot),
    },
    streak: loggingStreak(dates, today),
    weeks: {
      current: {
        from: weekFrom,
        to: today,
        average: currentAvg,
        count: currentRows.length,
        days: dailySeries(rows, weekFrom),
      },
      previous: {
        from: prevFrom,
        to: prevTo,
        average: previousAvg,
        count: previousRows.length,
        days: dailySeries(rows, prevFrom),
      },
      delta,
      direction,
    },
    timeInRange: {
      from: tirFrom,
      to: today,
      count: tirRows.length,
      low,
      inRange,
      high,
      lowPct: pct(low),
      inRangePct: pct(inRange),
      highPct: pct(high),
      lowBelow: LOW,
      highAbove: HIGH,
    },
    hba1c: {
      estimate: hbaRows.length >= 4 ? hba1cFromAverage(hbaAvg) : null,
      average: hbaAvg,
      readings: hbaRows.length,
      from: hbaFrom,
      to: today,
      note: 'Estimate from your logged readings (ADAG formula). This is not a laboratory HbA1c.',
    },
    slots: SLOTS.map((slot) => {
      const values = between(rows, slotFrom, today).filter((r) => r.slot === slot).map((r) => r.value);
      const avg = average(values);
      return { slot, average: avg, count: values.length, tip: slotTip(slot, avg) };
    }),
  };
}

module.exports = { buildInsights, loggingStreak, hba1cFromAverage, slotTip };
