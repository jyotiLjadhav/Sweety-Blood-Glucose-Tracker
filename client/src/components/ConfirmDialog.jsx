import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="alert-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
        >
          <motion.div
            className="alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert-title"
            aria-describedby="alert-msg"
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.85 }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}