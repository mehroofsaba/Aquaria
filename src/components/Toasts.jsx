import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Globe, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { SPECIES_BY_ID, RARITY } from '../data/species.js';
import { WORLDS_BY_ID } from '../data/worlds.js';
import { speciesURI } from '../lib/art.js';
import { sound } from '../lib/sound.js';

function Toast({ t }) {
  const dismiss = useStore((s) => s.dismissToast);
  const setView = useStore((s) => s.setView);
  const setFocus = useStore((s) => s.setJournalFocus);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.kind === 'world' ? 5200 : 4200);
    return () => clearTimeout(id);
  }, [t.id]); // eslint-disable-line
  useEffect(() => { if (t.kind === 'world') sound.play('round'); }, [t.kind]);

  if (t.kind === 'world') {
    const w = WORLDS_BY_ID[t.worldId];
    return (
      <motion.button layout className="toast glass world" onClick={() => { dismiss(t.id); setView('worlds'); }} initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <span className="t-ico"><Globe size={22} /></span>
        <span className="t-txt"><small>New world</small><b className="serif">{w.name}</b></span>
      </motion.button>
    );
  }
  const sp = SPECIES_BY_ID[t.speciesId];
  const r = RARITY[sp.rarity];
  return (
    <motion.button layout className={'toast glass r-' + sp.rarity} style={{ '--c': r.color }} onClick={() => { dismiss(t.id); setFocus(sp.id); setView('journal'); }} initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <span className="t-art"><img src={speciesURI(sp)} alt="" /></span>
      <span className="t-txt"><small>{t.kind === 'rare' ? <><Sparkles size={11} /> Rare sighting</> : 'New discovery'}</small><b className="serif">{sp.name}</b><em><i />{r.label}</em></span>
    </motion.button>
  );
}

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>{toasts.map((t) => <Toast key={t.id} t={t} />)}</AnimatePresence>
    </div>
  );
}
