import { motion, AnimatePresence } from 'framer-motion';

/* ---------- Spring presets ---------- */
export const EASE = { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 };
export const EASE_SNAP = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 };

/* ---------- Page transition ---------- */
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Staggered list ---------- */
export function StaggeredList({ children, delay = 0.04 }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: EASE },
};

/* ---------- Count-up number ---------- */
export function CountUp({ value, suffix = '', prefix = '', className }) {
  const target = Number(value) || 0;
  return (
    <motion.span
      className={className}
      initial={false}
      animate={{ target }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix}
      {target}
      {suffix}
    </motion.span>
  );
}

/* ---------- Magnetic button ---------- */
export function MagneticButton({ children, className, onClick, disabled, type, ...rest }) {
  const x = { x: 0 };
  const y = { y: 0 };
  return (
    <motion.button
      type={type}
      className={`magnetic ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.04 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={EASE_SNAP}
      onHoverEnd={() => {
        x.set(0);
        y.set(0);
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        x.set((e.clientX - cx) * 0.28);
        y.set((e.clientY - cy) * 0.28);
      }}
      style={{ x, y }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Reveal card ---------- */
export function RevealCard({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Success checkmark ---------- */
export function Checkmark({ open }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="checkmark"
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ ...EASE_SNAP, duration: 0.4 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toast with spring ---------- */
export function SpringToast({ children }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={EASE_SNAP}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };