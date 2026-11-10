import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ReadingForm from './ReadingForm';
import { ToastProvider } from '../context/ToastContext';
import api from '../api';
import { todayLocal } from '../utils/format';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  errorField: (e) => e?.response?.data?.field,
  errorMessage: (e) => e?.response?.data?.message ?? 'Something went wrong. Please try again.',
}));

const renderForm = (props = {}) =>
  render(
    <ToastProvider>
      <ReadingForm {...props} />
    </ToastProvider>
  );

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayLocal(d);
};

const valueInput = () => screen.getByLabelText(/glucose value/i);
const submit = () => userEvent.click(screen.getByRole('button', { name: /save reading/i }));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: [] } });
});

describe('ReadingForm validation messages', () => {
  test('empty value → "Please enter a glucose value."', async () => {
    renderForm();
    await submit();
    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test.each(['39', '601'])('value %s → range message', async (v) => {
    renderForm();
    await userEvent.type(valueInput(), v);
    await submit();
    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('decimal value is rejected as not whole', async () => {
    renderForm();
    await userEvent.type(valueInput(), '95.5');
    await submit();
    expect(await screen.findByText('Glucose value must be a whole number.')).toBeInTheDocument();
  });

  test('future date → "Date cannot be in the future."', async () => {
    renderForm();
    const date = screen.getByLabelText(/^date$/i);
    await userEvent.clear(date);
    await userEvent.type(date, tomorrow());
    await userEvent.type(valueInput(), '95');
    await submit();
    expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('duplicate slot is flagged immediately and blocks submit', async () => {
    api.get.mockResolvedValue({
      data: { data: [{ id: 1, reading_date: todayLocal(), slot: 'after_lunch', value: 120 }] },
    });
    renderForm();
    await userEvent.click(screen.getByRole('radio', { name: /after lunch/i }));
    expect(await screen.findByText('You already have an After lunch reading for this date.')).toBeInTheDocument();
    await userEvent.type(valueInput(), '110');
    await submit();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('a full day (4 readings) → "You can add only 4 readings per day."', async () => {
    const today = todayLocal();
    api.get.mockResolvedValue({
      data: {
        data: ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'].map((slot, i) => ({
          id: i + 1, reading_date: today, slot, value: 100,
        })),
      },
    });
    renderForm();
    expect(await screen.findByText('You can add only 4 readings per day.')).toBeInTheDocument();
  });

  test('shows the server message when the API rejects the reading', async () => {
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'You already have a Morning reading for this date.', field: 'slot' } },
    });
    renderForm();
    await userEvent.click(screen.getByRole('radio', { name: /morning/i }));
    await userEvent.type(valueInput(), '95');
    await submit();
    expect(await screen.findByText('You already have a Morning reading for this date.')).toBeInTheDocument();
  });
});

describe('ReadingForm submit', () => {
  test('sends a valid reading to the API and clears the value', async () => {
    api.post.mockResolvedValue({ data: { reading: { id: 9, slot: 'morning', value: 95 } } });
    const onSaved = vi.fn();
    renderForm({ onSaved });

    await userEvent.click(screen.getByRole('radio', { name: /morning/i }));
    await userEvent.type(valueInput(), '95');
    await submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/readings', {
        reading_date: todayLocal(),
        slot: 'morning',
        value: 95,
      })
    );
    await waitFor(() => expect(valueInput()).toHaveValue(''));
    expect(onSaved).toHaveBeenCalled();
  });

  test('edit mode pre-fills the form and PUTs the changes', async () => {
    api.put.mockResolvedValue({ data: { reading: { id: 5 } } });
    const onSaved = vi.fn();
    renderForm({
      initial: { id: 5, reading_date: todayLocal(), slot: 'after_dinner', value: 130 },
      onSaved,
      onCancel: () => {},
    });
    expect(valueInput()).toHaveValue('130');

    await userEvent.clear(valueInput());
    await userEvent.type(valueInput(), '142');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/readings/5', {
        reading_date: todayLocal(),
        slot: 'after_dinner',
        value: 142,
      })
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
