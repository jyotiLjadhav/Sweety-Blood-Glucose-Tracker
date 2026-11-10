import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';

/** Blocking notice after a very low or very high reading is saved. */
export default function SafetyAlert({ notice, onClose }) {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          className="alert-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className={`alert safety-alert safety-${notice.tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="safety-title"
            aria-describedby="safety-msg"
            initial={{ scale: 0.86, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.86, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.9 }}
          >
            <div className="alert-body">
              <div className="safety-icon" aria-hidden="true"><Icon name="alert" size={22} /></div>
              <h2 id="safety-title">{notice.title}</h2>
              <p id="safety-msg">{notice.message}</p>
              <p className="safety-note">Sweety only flags the number you just saved. It is not medical advice.</p>
            </div>
            <div className="alert-actions alert-actions-one">
              <button className="alert-btn" onClick={onClose} autoFocus>OK</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}