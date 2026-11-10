import { Link } from 'react-router-dom';
import { formatLong, glucoseStatus, slotByKey } from '../utils/format';
import Icon from './Icon';

export function StatCard({ label, value, unit, tone, sub }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value ?? '—'}
        {value != null && unit && <small>{unit}</small>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function StatusBadge({ value }) {
  const s = glucoseStatus(value);
  return <span className={`badge badge-${s.key}`}>{s.label}</span>;
}

export function SlotDot({ slot }) {
  return <span className="slot-dot" style={{ '--slot-color': slotByKey(slot)?.color }} aria-hidden="true" />;
}

export function EmptyState({ title, message, actionTo, actionLabel, icon = 'drop' }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={30} /></div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionTo && <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty empty-error" role="alert">
      <div className="empty-icon"><Icon name="alert" size={30} /></div>
      <h3>Couldn’t load this</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 8, style }) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/** Readings grouped by date, rendered as an inset grouped list. */
export function GroupedReadings({ readings, renderAction }) {
  const groups = [];
  readings.forEach((r) => {
    const last = groups[groups.length - 1];
    if (last && last.date === r.reading_date) last.items.push(r);
    else groups.push({ date: r.reading_date, items: [r] });
  });

  return groups.map((g) => (
    <section key={g.date} className="group">
      <h3 className="group-title">{formatLong(g.date)}</h3>
      <ul className="list">
        {g.items.map((r) => (
          <li key={r.id} className="list-row">
            <SlotDot slot={r.slot} />
            <div className="row-main">
              <span className="row-title">{slotByKey(r.slot)?.label}</span>
            </div>
            <span className="row-value">
              {r.value}
              <small>mg/dL</small>
            </span>
            <StatusBadge value={r.value} />
            {renderAction?.(r)}
          </li>
        ))}
      </ul>
    </section>
  ));
}
