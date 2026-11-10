import { useMemo, useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState, GroupedReadings, Skeleton, StatCard } from '../components/Shared';
import useFetch from '../utils/useFetch';
import { HIGH_ABOVE, LOW_BELOW, formatRange, glucoseStatus, todayLocal } from '../utils/format';

const TABS = [
  { key: 'daily', label: 'Daily', path: '/reports/daily', note: 'Readings for the selected date.' },
  { key: 'weekly', label: 'Weekly', path: '/reports/weekly', note: 'The ISO week containing the selected date.' },
  { key: 'mtd', label: 'Month to date', path: '/reports/month-to-date', note: '1st of the selected month up to the selected date.' },
  { key: 'monthly', label: 'Previous month', path: '/reports/monthly', note: 'The entire month before the selected date’s month.' },
  { key: 'custom', label: 'Custom', path: '/reports/custom', note: 'Pick a from and to date range.' },
];

export default function Reports() {
  const today = todayLocal();
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(today);
  const active = TABS.find((t) => t.key === tab);

  const { data, loading, error, reload } = useFetch(
    () => (date ? api.get(active.path, { params: { date } }).then((r) => r.data) : Promise.resolve(null)),
    [tab, date]
  );

  const breakdown = useMemo(() => {
    if (!data || data.empty) return null;
    const counts = { low: 0, normal: 0, high: 0 };
    data.readings.forEach((r) => { counts[glucoseStatus(r.value).key] += 1; });
    const n = data.readings.length;
    return { counts, pct: (k) => Math.round((counts[k] / n) * 100) };
  }, [data]);

  return (
    <>
      <PageHeader subtitle="Daily · Month to date · Previous month" title="Reports" />

      <div className="report-controls">
        <div className="segmented" role="tablist" aria-label="Report type">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)} data-cursor="link">
              {t.label}
            </button>
          ))}
        </div>
        <div className="field field-inline">
          <label htmlFor="report-date">Selected date</label>
          <input id="report-date" type="date" className="input" value={date} max={today}
            onChange={(e) => setDate(e.target.value || today)} data-cursor="input" />
        </div>
      </div>

      <p className="muted report-note">{active.note}</p>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading && !data && (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => <div className="stat" key={i}><Skeleton height={12} width="50%" /><Skeleton height={30} width="70%" style={{ marginTop: 10 }} /></div>)}
        </div>
      )}

      {data && (
        <div className={loading ? 'is-loading' : ''}>
          <h2 className="report-range">{formatRange(data.from, data.to)}</h2>

          {data.empty ? (
            <EmptyState
              icon="calendar"
              title="No readings for this period"
              message={tab === 'daily'
                ? 'Nothing was logged on this date. Pick another day, or add a reading.'
                : 'There are no readings in this date range yet. Add readings and they’ll show up here.'}
              actionTo="/add"
              actionLabel="Add a reading"
            />
          ) : (
            <>
              <div className="stat-grid">
                <StatCard label="Highest" value={data.stats.highest} unit="mg/dL" tone="orange" />
                <StatCard label="Lowest" value={data.stats.lowest} unit="mg/dL" tone="purple" />
                <StatCard label="Average" value={data.stats.average} unit="mg/dL" tone="blue" />
                <StatCard label="Readings" value={data.stats.count} tone="green" />
              </div>

              {breakdown && (
                <section className="card range-card" aria-label="Range breakdown">
                  <div className="card-head">
                    <h2>Time in range</h2>
                    <span className="muted">{LOW_BELOW}–{HIGH_ABOVE} mg/dL</span>
                  </div>
                  <div className="range-bar" role="img"
                    aria-label={`${breakdown.pct('low')}% low, ${breakdown.pct('normal')}% in range, ${breakdown.pct('high')}% high`}>
                    {['low', 'normal', 'high'].map((k) => breakdown.counts[k] > 0 && (
                      <span key={k} className={`range-seg range-${k}`} style={{ flexGrow: breakdown.counts[k] }} />
                    ))}
                  </div>
                  <div className="range-legend">
                    <span><i className="range-low" />Low <b>{breakdown.pct('low')}%</b></span>
                    <span><i className="range-normal" />In range <b>{breakdown.pct('normal')}%</b></span>
                    <span><i className="range-high" />High <b>{breakdown.pct('high')}%</b></span>
                  </div>
                </section>
              )}

              <div className="section-head"><h2>{tab === 'daily' ? 'Readings' : 'All readings in period'}</h2></div>
              <GroupedReadings readings={tab === 'daily' ? data.readings : [...data.readings].reverse()} />
            </>
          )}
        </div>
      )}
    </>
  );
}
