import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import LineChart from '../components/LineChart';
import {
  EmptyState, ErrorState, GroupedReadings, Skeleton, SlotDot, StatCard,
} from '../components/Shared';
import useFetch from '../utils/useFetch';
import {
  HIGH_ABOVE, LOW_BELOW, SLOTS, formatDate, formatLong, glucoseStatus, greeting, monthOf,
  monthTitle, parseDate, shiftMonth, todayLocal,
} from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const today = todayLocal();
  const thisMonth = monthOf(today);
  const [month, setMonth] = useState(thisMonth);
  const [mode, setMode] = useState('average'); // 'average' | 'slots'

  const summary = useFetch(async () => {
    const [mtd, day, recent] = await Promise.all([
      api.get('/reports/month-to-date', { params: { date: today } }),
      api.get('/reports/daily', { params: { date: today } }),
      api.get('/readings', { params: { page: 1, limit: 5 } }),
    ]);
    return { mtd: mtd.data, day: day.data, recent: recent.data.data };
  }, [today]);

  const chart = useFetch(() => api.get('/reports/chart', { params: { month } }).then((r) => r.data), [month]);

  const inRange = useMemo(() => {
    const rs = summary.data?.mtd.readings ?? [];
    if (!rs.length) return null;
    const ok = rs.filter((r) => glucoseStatus(r.value).key === 'normal').length;
    return Math.round((ok / rs.length) * 100);
  }, [summary.data]);

  const series = useMemo(() => {
    if (!chart.data) return [];
    const dayNum = (d) => parseDate(d).getDate();
    if (mode === 'average') {
      return [{
        id: 'avg', name: 'Daily average', color: 'var(--blue)',
        points: chart.data.daily.map((d) => ({ day: dayNum(d.reading_date), value: d.average, date: d.reading_date })),
      }];
    }
    return SLOTS.map((s) => ({
      id: s.key, name: s.label, color: s.color,
      points: chart.data.readings.filter((r) => r.slot === s.key)
        .map((r) => ({ day: dayNum(r.reading_date), value: r.value, date: r.reading_date })),
    }));
  }, [chart.data, mode]);

  const todayBySlot = Object.fromEntries((summary.data?.day.readings ?? []).map((r) => [r.slot, r.value]));
  const loggedToday = summary.data?.day.stats.count ?? 0;
  const hasAny = summary.data && (summary.data.recent.length > 0 || summary.data.mtd.stats.count > 0);

  return (
    <>
      <PageHeader
        subtitle={formatLong(today)}
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
        action={<Link to="/add" className="btn btn-primary btn-sm desktop-only"><Icon name="plus" size={16} strokeWidth={2.6} /> Add reading</Link>}
      />

      {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}

      {!summary.error && (
        <>
          {/* Today */}
          <section className="card today-card" aria-labelledby="today-h">
            <div className="card-head">
              <h2 id="today-h">Today</h2>
              <span className="muted">{summary.loading ? '' : `${loggedToday} of 4 logged`}</span>
            </div>
            <div className="today-grid">
              {SLOTS.map((s) => {
                const v = todayBySlot[s.key];
                const st = v != null ? glucoseStatus(v) : null;
                return (
                  <Link key={s.key} to="/add" className={`today-slot ${v != null ? 'done' : ''}`} style={{ '--slot-color': s.color }}>
                    <span className="today-slot-label"><SlotDot slot={s.key} />{s.label}</span>
                    {summary.loading ? <Skeleton height={26} width={60} /> : v != null ? (
                      <span className={`today-slot-value status-${st.key}`}>{v}<small>mg/dL</small></span>
                    ) : (
                      <span className="today-slot-empty"><Icon name="plus" size={16} strokeWidth={2.6} /> Add</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Month to date */}
          <section aria-labelledby="mtd-h">
            <div className="section-head">
              <h2 id="mtd-h">This month so far</h2>
              <Link to="/reports" className="link">All reports <Icon name="right" size={14} /></Link>
            </div>
            <div className="stat-grid">
              {summary.loading ? (
                [0, 1, 2, 3].map((i) => <div className="stat" key={i}><Skeleton height={12} width="50%" /><Skeleton height={30} width="70%" style={{ marginTop: 10 }} /></div>)
              ) : (
                <>
                  <StatCard label="Average" value={summary.data.mtd.stats.average} unit="mg/dL" tone="blue" />
                  <StatCard label="Highest" value={summary.data.mtd.stats.highest} unit="mg/dL" tone="orange" />
                  <StatCard label="Lowest" value={summary.data.mtd.stats.lowest} unit="mg/dL" tone="purple" />
                  <StatCard label="In range" value={inRange} unit="%" tone="green"
                    sub={`${LOW_BELOW}–${HIGH_ABOVE} mg/dL · ${summary.data.mtd.stats.count} readings`} />
                </>
              )}
            </div>
          </section>

          {/* Chart */}
          <section className="card chart-card" aria-labelledby="chart-h">
            <div className="card-head wrap">
              <div className="month-switch">
                <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
                  <Icon name="left" size={20} />
                </button>
                <h2 id="chart-h">{monthTitle(month)}</h2>
                <button className="icon-btn" aria-label="Next month" disabled={month >= thisMonth}
                  onClick={() => setMonth(shiftMonth(month, 1))}>
                  <Icon name="right" size={20} />
                </button>
              </div>
              <div className="segmented segmented-sm" role="tablist" aria-label="Chart view">
                <button role="tab" aria-selected={mode === 'average'} className={mode === 'average' ? 'active' : ''} onClick={() => setMode('average')}>Daily average</button>
                <button role="tab" aria-selected={mode === 'slots'} className={mode === 'slots' ? 'active' : ''} onClick={() => setMode('slots')}>By time slot</button>
              </div>
            </div>

            {chart.loading && <Skeleton height={240} radius={12} />}
            {chart.error && <ErrorState message={chart.error} onRetry={chart.reload} />}
            {chart.data && (chart.data.readings.length ? (
              <>
                <LineChart series={series} month={month} ariaLabel={`Glucose readings for ${monthTitle(month)}`} />
                <div className="legend">
                  {mode === 'slots' ? SLOTS.map((s) => (
                    <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
                  )) : <span><i style={{ background: 'var(--blue)' }} />Daily average</span>}
                  <span><i className="legend-band" />Target {LOW_BELOW}–{HIGH_ABOVE}</span>
                </div>
              </>
            ) : (
              <p className="muted center pad">No readings in {monthTitle(month)}.</p>
            ))}
          </section>

          {/* Recent */}
          <section aria-labelledby="recent-h">
            <div className="section-head">
              <h2 id="recent-h">Recent readings</h2>
              <Link to="/readings" className="link">See all <Icon name="right" size={14} /></Link>
            </div>
            {summary.loading ? (
              <div className="list"><div className="list-row"><Skeleton height={20} /></div><div className="list-row"><Skeleton height={20} /></div></div>
            ) : hasAny ? (
              <GroupedReadings readings={summary.data.recent} />
            ) : (
              <EmptyState title="No readings yet" message="Log your first blood glucose reading to see your stats and charts here."
                actionTo="/add" actionLabel="Add your first reading" />
            )}
          </section>

          <p className="disclaimer center">Latest reading date shown: {summary.data?.recent[0] ? formatDate(summary.data.recent[0].reading_date) : '—'} · Sweety is not a medical device.</p>
        </>
      )}
    </>
  );
}
