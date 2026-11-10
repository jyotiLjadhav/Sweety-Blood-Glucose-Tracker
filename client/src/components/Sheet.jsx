import { useEffect, useRef } from 'react';

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

  if (!open) return null;

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-grab" aria-hidden="true" />
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="btn-plain" onClick={onClose}>{closeLabel}</button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
