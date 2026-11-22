import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Sparkles, ArrowRight, Utensils, Lock, Check } from 'lucide-react';
import { useStore, unlockedWorldIds, TOTAL_SPECIES } from '../store/useStore.js';
import { WORLDS, WORLDS_BY_ID } from '../data/worlds.js';

const HINTS = ['Tap a fish', 'Drag a fish', 'Pop a bubble', 'Tap the water', 'Touch the reef', 'Feed them'];

export default function AquariumHud({ onPickWorld }) {
  const worldId = useStore((s) => s.worldId);
  const discovered = useStore((s) => s.discovered);
  const feedMode = useStore((s) => s.feedMode);
  const setFeedMode = useStore((s) => s.setFeedMode);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(0);
  const box = useRef(null);
  const count = Object.keys(discovered).length;
  const unlocked = unlockedWorldIds(discovered);

  useEffect(() => {
    const id = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 7000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); };
  }, [open]);

  const w = WORLDS_BY_ID[worldId];
  return (
    <>
      <div className="hud-bl" ref={box}>
        <button className="chip glass" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
          <span className="chip-ico" style={{ background: `linear-gradient(135deg, ${w.colors.top}, ${w.colors.bottom})` }} aria-hidden="true" />
          <span>{w.name}</span>
          <ChevronDown size={15} className={'chev' + (open ? ' up' : '')} aria-hidden="true" />
        </button>
        <span className="chip glass count" title="Species discovered"><Sparkles size={14} aria-hidden="true" /> {count}<span className="dim">/{TOTAL_SPECIES}</span></span>
        <AnimatePresence>
          {open && (
            <motion.ul className="menu glass" role="listbox" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}>
              {WORLDS.map((x) => {
                const ok = unlocked.includes(x.id);
                return (
                  <li key={x.id}>
                    <button role="option" aria-selected={x.id === worldId} disabled={!ok} onClick={() => { setOpen(false); onPickWorld(x.id); }}>
                      <span className="chip-ico" style={{ background: `linear-gradient(135deg, ${x.colors.top}, ${x.colors.bottom})` }} aria-hidden="true" />
                      <span className="grow">{x.name}</span>
                      {x.id === worldId ? <Check size={15} /> : !ok ? <span className="lock"><Lock size={13} /> {count}/{x.unlockAt}</span> : null}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="hud-br">
        <button className={'chip glass feed' + (feedMode ? ' on' : '')} onClick={() => setFeedMode(!feedMode)} aria-pressed={feedMode} aria-label="Feed mode">
          <Utensils size={15} aria-hidden="true" /> <span>{feedMode ? 'Feeding' : 'Feed'}</span>
        </button>
        <div className="chip glass hint">
          <AnimatePresence mode="wait">
            <motion.span key={hint} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>{HINTS[hint]}</motion.span>
          </AnimatePresence>
          <Sparkles size={13} className="gold" aria-hidden="true" />
          <button className="round-btn" onClick={() => setHint((h) => (h + 1) % HINTS.length)} aria-label="Next hint"><ArrowRight size={16} /></button>
        </div>
      </div>
    </>
  );
}
