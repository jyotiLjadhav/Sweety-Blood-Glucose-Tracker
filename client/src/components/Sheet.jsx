import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Bottom sheet on phones, centred dialog on larger screens. */
export default function Sheet({ open, title, onClose, children, closeLabel = 'Cancel' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            ref={ref}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
          >
            <div className="sheet-grab" aria-hidden="true" />
            <header className="sheet-header">
              <h2>{title}</h2>
              <button className="btn-plain" onClick={onClose} data-cursor="button">{closeLabel}</button>
            </header>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}