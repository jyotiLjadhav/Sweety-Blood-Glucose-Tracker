import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { errorMessage } from '../api';
import { safetyNotice, slotLabel, validateReading } from '../utils/format';
import Sheet from './Sheet';
import SafetyAlert from './SafetyAlert';

/** One field, one save, for the slot the person tapped on the dashboard. */
export default function QuickAdd({ slot, date, onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState(null);
  const [saved, setSaved] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateReading({ value, date, slot }, { today: date });
    const message = found.value || found.slot || found.date;
    if (message) {
      setError(message);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/readings', { reading_date: date, slot, value: Number(value) });
      window.dispatchEvent(new Event('sweety:updated'));
      setDone(true);
      const notice = safetyNotice(Number(value));
      if (notice) {
        setSaved(res.data.reading);
        setSafety(notice);
      } else {
        onSaved?.(res.data.reading);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet open title={`${slotLabel(slot)} · today`} onClose={onClose} closeLabel="Close">
        <form className="reading-form" onSubmit={handleSubmit} noValidate>
          <p className="field-hint">Type the number and save. You can still edit it later.</p>
          <div className="field">
            <label htmlFor="quick-value">Glucose value</label>
            <div className={`value-input ${error ? 'input-error' : ''}`}>
              <input
                id="quick-value"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="e.g. 95"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(''); }}
                aria-invalid={Boolean(error)}
              />
              <span className="unit">mg/dL</span>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || done}>
            <span className="btn-content" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AnimatePresence initial={false}>
                {busy ? (
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
              <span>{busy ? 'Saving…' : done ? 'Saved' : 'Save reading'}</span>
            </span>
          </button>
        </form>
      </Sheet>
      <SafetyAlert
        notice={safety}
        onClose={() => {
          setSafety(null);
          onSaved?.(saved);
        }}
      />
    </>
  );
}
