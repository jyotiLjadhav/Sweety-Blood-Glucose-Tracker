import { describe, expect, test } from 'vitest';
import {
  dayConflict, formatRange, glucoseStatus, isValidDateString, shiftMonth, validateReading,
} from './format';

const today = '2026-11-10';

describe('validateReading', () => {
  const ok = { value: '95', date: today, slot: 'morning' };

  test('accepts a valid reading', () => {
    expect(validateReading(ok, { today })).toEqual({});
  });

  test.each([
    [{ value: '' }, 'value', 'Please enter a glucose value.'],
    [{ value: '39' }, 'value', 'Value must be between 40 and 600 mg/dl.'],
    [{ value: '601' }, 'value', 'Value must be between 40 and 600 mg/dl.'],
    [{ value: '95.5' }, 'value', 'Glucose value must be a whole number.'],
    [{ date: '2026-11-11' }, 'date', 'Date cannot be in the future.'],
  ])('%j → %s', (override, field, message) => {
    expect(validateReading({ ...ok, ...override }, { today })[field]).toBe(message);
  });

  test('boundaries 40 and 600 are valid', () => {
    expect(validateReading({ ...ok, value: '40' }, { today })).toEqual({});
    expect(validateReading({ ...ok, value: '600' }, { today })).toEqual({});
  });

  test('duplicate slot and max-per-day come from existing readings', () => {
    const existing = [{ id: 1, slot: 'morning', value: 90 }];
    expect(validateReading(ok, { today, existing }).slot).toBe('You already have a Morning reading for this date.');
    expect(validateReading(ok, { today, existing, editingId: 1 })).toEqual({});

    const full = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'].map((slot, id) => ({ id, slot }));
    expect(dayConflict({ slot: 'morning', existing: full }).message).toBe('You can add only 4 readings per day.');
  });
});

describe('helpers', () => {
  test('glucoseStatus', () => {
    expect(glucoseStatus(60).key).toBe('low');
    expect(glucoseStatus(70).key).toBe('normal');
    expect(glucoseStatus(180).key).toBe('normal');
    expect(glucoseStatus(181).key).toBe('high');
  });

  test('isValidDateString', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('10-11-2026')).toBe(false);
  });

  test('shiftMonth and formatRange', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(formatRange('2026-10-01', '2026-10-15')).toBe('1 Oct – 15 Oct 2026');
    expect(formatRange('2026-10-15', '2026-10-15')).toBe('15 Oct 2026');
  });
});
