import { AnimatePresence, motion } from "motion/react";

const bubbles = [
  { left: "14%", size: 9, delay: 1.1, duration: 3.8 },
  { left: "25%", size: 6, delay: 1.6, duration: 4.2 },
  { left: "39%", size: 12, delay: 1.3, duration: 4.5 },
  { left: "57%", size: 7, delay: 1.9, duration: 3.7 },
  { left: "70%", size: 10, delay: 1.4, duration: 4.3 },
  { left: "84%", size: 6, delay: 2.1, duration: 4 },
];

export default function Splash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          role="status"
          aria-label="Entering Aquaria"
        >
          <motion.div
            className="splash-shade"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0.35, 0] }}
            transition={{
              duration: 5.2,
              times: [0, 0.35, 0.72, 1],
              ease: "easeInOut",
            }}
          />

          <div className="splash-bubbles" aria-hidden="true">
            {bubbles.map((bubble, i) => (
              <i
                key={i}
                style={{
                  left: bubble.left,
                  width: bubble.size,
                  height: bubble.size,
                  animationDelay: `${bubble.delay}s`,
                  animationDuration: `${bubble.duration}s`,
                }}
              />
            ))}
          </div>

          <motion.div
            className="splash-in"
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [18, 0, 0, -12],
              scale: [0.94, 1, 1, 1.02],
            }}
            transition={{
              duration: 5.2,
              times: [0, 0.18, 0.76, 1],
              ease: "easeInOut",
            }}
          >
            <span className="splash-word">AQUARIA</span>
            <span className="splash-tag">Beneath the waves.</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
