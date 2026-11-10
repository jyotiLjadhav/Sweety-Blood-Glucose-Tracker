import { useEffect } from 'react';

/** iOS-style alert with a destructive action. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  error,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="alert-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-msg">
        <div className="alert-body">
          <h2 id="alert-title">{title}</h2>
          <p id="alert-msg">{message}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="alert-actions">
          <button className="alert-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="alert-btn alert-btn-danger" onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
