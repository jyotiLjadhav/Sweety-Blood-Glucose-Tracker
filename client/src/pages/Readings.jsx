import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import PageHeader from '../components/PageHeader';
import Sheet from '../components/Sheet';
import ConfirmDialog from '../components/ConfirmDialog';
import ReadingForm from '../components/ReadingForm';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, GroupedReadings, Skeleton } from '../components/Shared';
import { useToast } from '../context/ToastContext';
import useFetch from '../utils/useFetch';
import { SLOTS, formatDate, slotLabel, todayLocal } from '../utils/format';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 10;

export default function Readings() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [slot, setSlot] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data, loading, error, reload } = useFetch(
    () => api.get('/readings', {
      params: { page, limit: PAGE_SIZE, slot: slot || undefined, from: from || undefined, to: to || undefined },
    }).then((r) => r.data),
    [page, slot, from, to]
  );

  // If the last item of the last page was deleted, step back a page
  useEffect(() => {
    if (data && page > data.pagination.totalPages) setPage(data.pagination.totalPages);
  }, [data, page]);

  const filtered = Boolean(slot || from || to);
  const resetFilters = () => { setSlot(''); setFrom(''); setTo(''); setPage(1); };
  const { pagination } = data ?? {};

  async function confirmDelete() {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.delete(`/readings/${deleting.id}`);
      setDeleting(null);
      toast('Reading deleted');
      reload();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const rowActions = (r) => (
    <span className="row-actions">
      <button className="icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${slotLabel(r.slot)} reading on ${formatDate(r.reading_date)}`}>
        <Icon name="edit" size={18} />
      </button>
      <button className="icon-btn icon-btn-danger" onClick={() => { setDeleteError(''); setDeleting(r); }}
        aria-label={`Delete ${slotLabel(r.slot)} reading on ${formatDate(r.reading_date)}`}>
        <Icon name="trash" size={18} />
      </button>
    </span>
  );

  return (
    <>
      <PageHeader
        subtitle={pagination ? `${pagination.total} ${pagination.total === 1 ? 'reading' : 'readings'}` : 'Your history'}
        title="Readings"
        action={<Link to="/add" className="btn btn-primary btn-sm desktop-only"><Icon name="plus" size={16} strokeWidth={2.6} /> Add reading</Link>}
      />

      <div className="filters card">
        <div className="field field-inline">
          <label htmlFor="f-slot">Time slot</label>
          <select id="f-slot" className="input" value={slot} onChange={(e) => { setSlot(e.target.value); setPage(1); }}>
            <option value="">All slots</option>
            {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="field field-inline">
          <label htmlFor="f-from">From</label>
          <input id="f-from" type="date" className="input" value={from} max={to || todayLocal()}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="field field-inline">
          <label htmlFor="f-to">To</label>
          <input id="f-to" type="date" className="input" value={to} min={from || undefined} max={todayLocal()}
            onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        {filtered && <button className="btn-plain" onClick={resetFilters}>Clear</button>}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading && !data && (
        <div className="list">{[0, 1, 2, 3].map((i) => <div className="list-row" key={i}><Skeleton height={22} /></div>)}</div>
      )}

      {data && (data.data.length ? (
        <div className={loading ? 'is-loading' : ''}>
          <GroupedReadings readings={data.data} renderAction={rowActions} />
          <nav className="pager" aria-label="Pagination">
            <span className="muted">
              {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="pager-controls">
              <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => setPage(page - 1)}>
                <Icon name="left" size={16} /> Previous
              </button>
              <span className="pager-page" aria-current="page">Page {pagination.page} of {pagination.totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                Next <Icon name="right" size={16} />
              </button>
            </div>
          </nav>
        </div>
      ) : filtered ? (
        <EmptyState icon="filter" title="No matching readings" message="Try a different time slot or date range." />
      ) : (
        <EmptyState title="No readings yet" message="Your saved readings will appear here once you add them."
          actionTo="/add" actionLabel="Add a reading" />
      ))}

      <Sheet open={Boolean(editing)} title="Edit reading" onClose={() => setEditing(null)}>
        {editing && (
          <ReadingForm
            key={editing.id}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); toast('Reading updated'); reload(); }}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this reading?"
        message={deleting ? `${slotLabel(deleting.slot)} · ${deleting.value} mg/dL on ${formatDate(deleting.reading_date)}. This can’t be undone.` : ''}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
