import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [mode, setMode] = useState('default');

  // Refs hold live pointer position so the raf loop never needs to restart.
  const tx = useRef(0); // dot target (instant)
  const ty = useRef(0);
  const rx = useRef(0); // ring target
  const ry = useRef(0);
  const cx = useRef(0); // ring current (smoothed)
  const cy = useRef(0);

  useEffect(() => {
    // Seed at viewport center so the cursor is visible immediately.
    const w = window.innerWidth;
    const h = window.innerHeight;
    tx.current = w / 2;
    ty.current = h / 2;
    rx.current = w / 2;
    ry.current = h / 2;
    cx.current = w / 2;
    cy.current = h / 2;

    let raf = 0;
    const tick = () => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx.current}px, ${ty.current}px, 0) translate(-50%, -50%)`;
      }
      cx.current += (rx.current - cx.current) * 0.25;
      cy.current += (ry.current - cy.current) * 0.25;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${cx.current}px, ${cy.current}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e) => {
      tx.current = e.clientX;
      ty.current = e.clientY;
      rx.current = e.clientX;
      ry.current = e.clientY;
    };
    const onOver = (e) => {
      const el = e.target?.closest?.('[data-cursor]');
      setMode(el ? el.dataset.cursor : 'default');
    };
    const onLeave = () => setMode('default');

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver);
    window.addEventListener('mouseout', onLeave);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mouseout', onLeave);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const colors = {
    default: 'var(--blue)',
    link: 'var(--brand)',
    button: 'var(--brand)',
    card: 'var(--blue)',
    input: 'var(--green)',
    danger: 'var(--red)',
  };

  return (
    <div
      className="custom-cursor"
      data-cursor-mode={mode}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
      }}
    >
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{ background: colors[mode], pointerEvents: 'none', willChange: 'transform' }}
      />
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{ borderColor: colors[mode], pointerEvents: 'none', willChange: 'transform' }}
      />
    </div>
  );
}