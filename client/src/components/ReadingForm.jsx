import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { errorField, errorMessage } from '../api';
import {
  MAX_VALUE,
  MIN_VALUE,
  SLOTS,
  dayConflict,
  defaultSlotForNow,
  glucoseStatus,
  isValidDateString,
  safetyNotice,
  todayLocal,
  validateReading,
} from '../utils/format';
import { useToast } from '../context/ToastContext';
import SafetyAlert from './SafetyAlert';

/**
 * Add / edit a glucose reading.
 *  - Validation mirrors the server (same messages) and the server stays the source of truth.
 *  - It looks up what is already saved for the chosen date so rules like
 *    "one reading per slot" and "max 4 per day" are shown immediately.
 */
export default function ReadingForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const toast = useToast();
  const today = todayLocal();

  const [date, setDate] = useState(initial?.reading_date ?? today);
  const [slot, setSlot] = useState(initial?.slot ?? defaultSlotForNow());
  const [value, setValue] = useState(initial?.value != null ? String(initial.value) : '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [safety, setSafety] = useState(null);
  const [pending, setPending] = useState(null);
  const [done, setDone] = useState(false);

  // Readings already saved for the selected date
  useEffect(() => {
    if (!isValidDateString(date) || date > today) {
      setExisting([]);
      return undefined;
    }
    let cancelled = false;
    api
      .get('/readings', { params: { from: date, to: date, limit: 100 } })
      .then((res) => !cancelled && setExisting(res.data.data))
      .catch(() => !cancelled && setExisting([]));
    return () => {
      cancelled = true;
    };
  }, [date, today, refresh]);

  const editingId = editing ? initial.id : null;
  const liveConflict = useMemo(
    () => (isValidDateString(date) && date <= today ? dayConflict({ slot, existing, editingId }) : null),
    [date, today, slot, existing, editingId]
  );
  const savedBySlot = useMemo(() => {
    const map = {};
    existing.filter((r) => r.id !== editingId).forEach((r) => {
      map[r.slot] = r.value;
    });
    return map;
  }, [existing, editingId]);

  const numeric = /^\d+$/.test(value.trim()) ? Number(value) : null;
  const status = numeric != null && numeric >= MIN_VALUE && numeric <= MAX_VALUE ? glucoseStatus(numeric) : null;

  const clear = (field) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setDone(false);
    const found = validateReading({ value, date, slot }, { existing, editingId, today });
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const payload = { reading_date: date, slot, value: Number(value) };
    try {
      const res = editing
        ? await api.put(`/readings/${initial.id}`, payload)
        : await api.post('/readings', payload);
      window.dispatchEvent(new Event('sweety:updated'));
      setDone(true);
      const notice = safetyNotice(payload.value);
      const finish = () => {
        if (editing) {
          onSaved?.(res.data.reading);
          return;
        }
        toast('Reading saved');
        const taken = new Set([...Object.keys(savedBySlot), slot]);
        const next = SLOTS.find((s) => !taken.has(s.key));
        if (next) setSlot(next.key);
        setValue('');
        setRefresh((n) => n + 1);
        onSaved?.(res.data.reading);
      };
      if (notice) {
        setPending(() => finish);
        setSafety(notice);
      } else {
        finish();
      }
    } catch (err) {
      const field = errorField(err);
      const message = errorMessage(err);
      if (field && ['value', 'slot', 'reading_date'].includes(field)) {
        setErrors({ [field === 'reading_date' ? 'date' : field]: message });
        if (field === 'slot' || field === 'reading_date') setRefresh((n) => n + 1);
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const slotMessage = errors.slot || (liveConflict?.field === 'slot' ? liveConflict.message : null);
  const dateMessage = errors.date || (liveConflict?.field === 'date' ? liveConflict.message : null);

  return (
    <form className="reading-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="reading-date">Date</label>
        <input
          id="reading-date"
          type="date"
          className={`input ${dateMessage ? 'input-error' : ''}`}
          value={date}
          max={today}
          onChange={(e) => {
            setDate(e.target.value);
            clear('date');
          }}
          aria-invalid={Boolean(dateMessage)}
          aria-describedby={dateMessage ? 'date-error' : undefined}
        />
        {dateMessage && <p className="field-error" id="date-error" role="alert">{dateMessage}</p>}
      </div>

      <fieldset className="field">
        <legend>Time slot</legend>
        <div className="slot-grid" role="radiogroup" aria-label="Time slot">
          {SLOTS.map((s) => {
            const selected = slot === s.key;
            return (
              <label key={s.key} className={`slot-option ${selected ? 'selected' : ''}`} style={{ '--slot-color': s.color }}>
                <input
                  type="radio"
                  name="slot"
                  value={s.key}
                  checked={selected}
                  onChange={() => {
                    setSlot(s.key);
                    clear('slot');
                  }}
                />
                <span className="slot-dot" aria-hidden="true" />
                <span className="slot-text">
                  <strong>{s.label}</strong>
                  <small>{s.hint || ' '}</small>
                </span>
                {savedBySlot[s.key] != null && (
                  <span className="slot-saved" title="Already logged for this date">{savedBySlot[s.key]}</span>
                )}
              </label>
            );
          })}
        </div>
        {slotMessage && <p className="field-error" role="alert">{slotMessage}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="reading-value">Glucose value</label>
        <div className={`value-input ${errors.value ? 'input-error' : ''}`}>
          <input
            id="reading-value"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 95"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              clear('value');
            }}
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? 'value-error' : undefined}
          />
          <span className="unit">mg/dL</span>
        </div>
        {errors.value ? (
          <p className="field-error" id="value-error" role="alert">{errors.value}</p>
        ) : status ? (
          <p className={`field-hint status-${status.key}`}>{status.label}</p>
        ) : (
          <p className="field-hint">Whole number between {MIN_VALUE} and {MAX_VALUE}.</p>
        )}
      </div>

      {formError && <p className="form-error" role="alert">{formError}</p>}

      <SafetyAlert
        notice={safety}
        onClose={() => {
          setSafety(null);
          pending?.();
          setPending(null);
        }}
      />

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting} data-cursor="button">
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting || done}>
          <span className="btn-content" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AnimatePresence initial={false}>
              {submitting ? (
                <motion.span
                  key="busy"
                  className="btn-icon"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                  </svg>
                </motion.span>
              ) : done ? (
                <motion.span
                  key="done"
                  className="btn-icon"
                  initial={{ opacity: 0, scale: 0.4, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </motion.span>
              ) : null}
            </AnimatePresence>
            <span>{submitting ? 'Saving…' : done ? 'Saved' : editing ? 'Save changes' : 'Save reading'}</span>
          </span>
        </button>
      </div>
    </form>
  );
}
