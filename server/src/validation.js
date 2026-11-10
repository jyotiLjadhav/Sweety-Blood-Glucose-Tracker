const { HttpError } = require('./utils/errors');
const { isValidDateString, todayString } = require('./utils/dates');

const SLOTS = {
  morning: 'Morning',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const SLOT_KEYS = Object.keys(SLOTS);
const MAX_READINGS_PER_DAY = 4;
const MIN_VALUE = 40;
const MAX_VALUE = 600;

function article(label) {
  return /^[aeiou]/i.test(label) ? 'an' : 'a';
}

/** Message used when a slot is already taken on a date. */
function duplicateSlotMessage(slot) {
  const label = SLOTS[slot];
  return `You already have ${article(label)} ${label} reading for this date.`;
}

const MAX_PER_DAY_MESSAGE = `You can add only ${MAX_READINGS_PER_DAY} readings per day.`;

/**
 * Validates the fields of a reading that don't need the database.
 * Returns the cleaned { reading_date, slot, value } or throws HttpError(400).
 */
function validateReadingInput(body = {}) {
  const { value, slot } = body;
  const date = body.reading_date ?? body.date;

  // 1. Value present?
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new HttpError(400, 'Please enter a glucose value.', 'value');
  }

  // 2. Whole number, in range
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) {
    throw new HttpError(400, 'Glucose value must be a whole number.', 'value');
  }
  const num = Number(raw);
  if (num < MIN_VALUE || num > MAX_VALUE) {
    throw new HttpError(400, `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`, 'value');
  }

  // 3. Slot
  if (!SLOT_KEYS.includes(slot)) {
    throw new HttpError(400, 'Please choose a valid time slot.', 'slot');
  }

  // 4. Date present, valid, not in the future
  if (date === undefined || date === null || String(date).trim() === '') {
    throw new HttpError(400, 'Please select a date.', 'reading_date');
  }
  if (!isValidDateString(date)) {
    throw new HttpError(400, 'Please enter a valid date (YYYY-MM-DD).', 'reading_date');
  }
  if (date > todayString()) {
    throw new HttpError(400, 'Date cannot be in the future.', 'reading_date');
  }

  return { reading_date: date, slot, value: num };
}

module.exports = {
  SLOTS,
  SLOT_KEYS,
  MAX_READINGS_PER_DAY,
  MAX_PER_DAY_MESSAGE,
  duplicateSlotMessage,
  validateReadingInput,
};
