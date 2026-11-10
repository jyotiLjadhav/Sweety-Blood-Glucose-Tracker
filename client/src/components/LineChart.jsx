import { useMemo, useRef, useState } from 'react';
import { HIGH_ABOVE, LOW_BELOW, daysInMonth, formatShort } from '../utils/format';

const W = 720;
const H = 300;
const M = { l: 42, r: 14, t: 14, b: 30 };

/**
 * Lightweight SVG line chart for one month.
 * series: [{ id, name, color, points: [{ day, value, date }] }]
 */
export default function LineChart({ series, month, ariaLabel }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const total = daysInMonth(month);
  const all = series.flatMap((s) => s.points.map((p) => p.value));

  const { lo, hi, ticks } = useMemo(() => {
    const min = all.length ? Math.min(...all) : 70;
    const max = all.length ? Math.max(...all) : 180;
    const lo = Math.max(0, Math.floor((Math.min(min, LOW_BELOW) - 5) / 40) * 40);
    const hi = Math.max(200, Math.ceil((max + 5) / 40) * 40);
    const ticks = [];
    for (let t = lo; t <= hi; t += 40) ticks.push(t);
    return { lo, hi, ticks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.join(',')]);

  const x = (day) => M.l + ((day - 1) / Math.max(1, total - 1)) * (W - M.l - M.r);
  const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);

  const xTicks = [1, 5, 10, 15, 20, 25, total].filter((d, i, a) => d <= total && a.indexOf(d) === i);

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const day = Math.round(((svgX - M.l) / (W - M.l - M.r)) * (total - 1)) + 1;
    const items = series
      .map((s) => ({ s, p: s.points.find((p) => p.day === day) }))
      .filter((i) => i.p);
    if (!items.length) return setHover(null);
    return setHover({
      day,
      date: items[0].p.date,
      items: items.map(({ s, p }) => ({ name: s.name, color: s.color, value: p.value })),
    });
  }

  if (!all.length) return null;

  return (
    <div className="chart" ref={wrapRef} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
        {/* target range band */}
        <rect
          x={M.l}
          y={y(Math.min(HIGH_ABOVE, hi))}
          width={W - M.l - M.r}
          height={Math.max(0, y(Math.max(LOW_BELOW, lo)) - y(Math.min(HIGH_ABOVE, hi)))}
          className="chart-band"
        />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">{t}</text>
          </g>
        ))}
        {xTicks.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="chart-axis">{d}</text>
        ))}

        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.day - b.day);
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
          return (
            <g key={s.id} style={{ color: s.color }}>
              {pts.length > 1 && <path d={d} className="chart-line" />}
              {pts.map((p) => (
                <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r={hover?.day === p.day ? 5.5 : 3.6} className="chart-dot" />
              ))}
            </g>
          );
        })}

        {hover && <line x1={x(hover.day)} x2={x(hover.day)} y1={M.t} y2={H - M.b} className="chart-cursor" />}
      </svg>

      {hover && (
        <div
          className="chart-tooltip"
          style={{ left: `${(x(hover.day) / W) * 100}%`, transform: `translateX(${hover.day > total * 0.65 ? '-105%' : '8%'})` }}
        >
          <strong>{formatShort(hover.date)}</strong>
          {hover.items.map((i) => (
            <span key={i.name}>
              <i style={{ background: i.color }} /> {i.name}: <b>{i.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
