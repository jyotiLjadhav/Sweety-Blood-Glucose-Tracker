import { useMemo, useRef, useState } from 'react';
import { formatShort } from '../utils/format';

const W = 720;
const H = 220;
const M = { l: 42, r: 12, t: 16, b: 28 };

/**
 * Two lines over the same 7 days: this week and the week before.
 * days are aligned by index (day 0 is the oldest day in each window).
 */
export default function WeekChart({ current = [], previous = [] }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const all = [...current, ...previous].map((d) => d.average).filter((v) => v != null);
  const { lo, hi } = useMemo(() => {
    const min = all.length ? Math.min(...all) : 70;
    const max = all.length ? Math.max(...all) : 180;
    return {
      lo: Math.max(0, Math.floor((min - 10) / 20) * 20),
      hi: Math.ceil((max + 10) / 20) * 20,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.join(',')]);

  const x = (i) => M.l + (i / 6) * (W - M.l - M.r);
  const y = (v) => M.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - M.t - M.b);

  function path(days) {
    const pts = days.map((d, i) => (d.average == null ? null : [i, d.average])).filter(Boolean);
    return pts.map(([i, v], n) => `${n ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  }

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(6, Math.round(((svgX - M.l) / (W - M.l - M.r)) * 6)));
    setHover(i);
  }

  if (!all.length) return <p className="muted center pad">No readings in the last two weeks.</p>;

  const labels = current.map((d) => formatShort(d.date).replace(/ \d{4}$/, ''));

  return (
    <div className="chart" ref={wrapRef} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="This week compared with the previous week" preserveAspectRatio="xMidYMid meet">
        {[lo, Math.round((lo + hi) / 2), hi].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">{t}</text>
          </g>
        ))}
        {path(previous) && <path d={path(previous)} className="chart-line week-prev" />}
        {path(current) && <path d={path(current)} className="chart-line week-now" />}
        {current.map((d, i) => d.average != null && (
          <circle key={d.date} cx={x(i)} cy={y(d.average)} r={hover === i ? 5.5 : 3.4} className="chart-dot week-now" />
        ))}
        {previous.map((d, i) => d.average != null && (
          <circle key={d.date} cx={x(i)} cy={y(d.average)} r={hover === i ? 5 : 3} className="chart-dot week-prev" />
        ))}
        {labels.map((label, i) => (
          <text key={current[i].date} x={x(i)} y={H - 8} textAnchor="middle" className="chart-axis">{label}</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="chart-cursor" />}
      </svg>
      {hover != null && (
        <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{labels[hover]}</strong>
          <span><i className="legend-now" />This week {current[hover]?.average ?? '—'}</span>
          <span><i className="legend-prev" />Previous {previous[hover]?.average ?? '—'}</span>
        </div>
      )}
    </div>
  );
}
