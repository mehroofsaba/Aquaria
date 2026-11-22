import { AnimatePresence, motion } from 'motion/react';
import { Logo } from './TopBar.jsx';

export default function Splash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="splash" exit={{ opacity: 0 }} transition={{ duration: 0.9 }} role="status" aria-label="Loading">
          <div className="splash-in"><Logo /><span className="splash-tag serif-i">Beneath the waves.</span><span className="splash-bar"><i /></span></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
