import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api, { errorMessage } from '../api';
import useFetch from '../utils/useFetch';
import { formatHour } from '../utils/format';
import Icon from './Icon';

const HOURS = [6, 7, 8, 9, 12, 18, 19, 20, 21, 22];

function notifyOnce(today) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const key = `sweety-reminded-${today}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    return;
  }
  try {
    // eslint-disable-next-line no-new
    new Notification('Time to log glucose', {
      body: 'You have not saved a reading today. Open Sweety and add one.',
    });
  } catch {
    /* notifications can fail in embedded previews */
  }
}

/**
 * Banner when today's log is still empty after the chosen hour.
 * Settings card lets the person turn the reminder on and pick the hour.
 * Both views read the same API, so the status follows real readings.
 */
export default function DailyReminder({ variant = 'banner' }) {
  const { data, reload } = useFetch(() => api.get('/reminders').then((r) => r.data), []);
  const [hour, setHour] = useState(20);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  useEffect(() => {
    if (!data) return;
    setHour(data.hour);
    setEnabled(data.enabled);
  }, [data]);

  useEffect(() => {
    const onUpdate = () => reload();
    window.addEventListener('sweety:updated', onUpdate);
    const timer = window.setInterval(reload, 60_000);
    return () => {
      window.removeEventListener('sweety:updated', onUpdate);
      window.clearInterval(timer);
    };
  }, [reload]);

  useEffect(() => {
    if (variant === 'banner' && data?.due) notifyOnce(data.today);
  }, [variant, data]);

  async function save(next) {
    setSaving(true);
    setError('');
    try {
      await api.put('/reminders', next);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted' && data?.due) notifyOnce(data.today);
  }

  if (variant === 'banner') {
    if (!data?.due) return null;
    return (
      <motion.div
        className="reminder-banner"
        role="status"
        layout
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
      >
        <Icon name="bell" size={18} />
        <p>
          <strong>Nothing logged today.</strong> Your reminder is set for {formatHour(data.hour)}. Add a reading so the day still counts.
        </p>
        <Link to="/add" className="btn btn-primary btn-sm">Log now</Link>
      </motion.div>
    );
  }

  return (
    <section className="card reminder-card" aria-labelledby="remind-h">
      <div className="card-head">
        <h2 id="remind-h">Daily reminder</h2>
        <span className={`reminder-pill ${data?.loggedToday ? 'done' : ''}`}>
          {data ? (data.loggedToday ? `${data.loggedToday} logged today` : 'Not logged today') : ''}
        </span>
      </div>
      <p className="field-hint">
        Sweety checks your readings and reminds you after the time you pick if today is still empty.
      </p>
      <div className="reminder-controls">
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              save({ enabled: e.target.checked, hour });
            }}
            disabled={saving || !data}
          />
          <span>Remind me</span>
        </label>
        <label className="field field-inline">
          <span>At</span>
          <select
            className="input"
            value={hour}
            disabled={!enabled || saving}
            onChange={(e) => {
              const next = Number(e.target.value);
              setHour(next);
              save({ enabled, hour: next });
            }}
          >
            {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
          </select>
        </label>
        {permission === 'granted' ? (
          <span className="muted">Browser alerts are on</span>
        ) : permission === 'unsupported' ? null : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={enableNotifications}>
            Allow alerts
          </button>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
