import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lock, Check, ArrowRight } from 'lucide-react';
import { useStore, unlockedWorldIds } from '../store/useStore.js';
import { WORLDS } from '../data/worlds.js';
import { farSVG } from '../engine/scenery.js';
import { svgToDataURI } from '../lib/art.js';

export default function Worlds({ onSelect }) {
  const discovered = useStore((s) => s.discovered);
  const worldId = useStore((s) => s.worldId);
  const count = Object.keys(discovered).length;
  const unlocked = unlockedWorldIds(discovered);
  const art = useMemo(() => Object.fromEntries(WORLDS.map((w) => [w.id, svgToDataURI(farSVG(w.far, w.colors, w.seed))])), []);

  return (
    <motion.section className="panel worlds" aria-label="Ocean Worlds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="panel-head center">
        <h1 className="display">Ocean <i>Worlds</i></h1>
      </div>
      <div className="wgrid">
        {WORLDS.map((w, i) => {
          const ok = unlocked.includes(w.id), here = w.id === worldId;
          const c = w.colors;
          return (
            <motion.button key={w.id} className={'wcard' + (ok ? '' : ' locked') + (here ? ' here' : '')} disabled={!ok}
              onClick={() => onSelect(w.id)} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.07 }} whileHover={ok ? { y: -6 } : undefined}
              style={{ '--top': c.top, '--mid': c.mid, '--bot': c.bottom, '--deep': c.deep, '--ray': c.ray }} aria-label={ok ? `${w.name}${here ? ', current world' : ''}` : `${w.name}, locked`}>
              <span className="wsky" />
              <span className="wrays" />
              <span className="wfar" style={{ backgroundImage: `url("${art[w.id]}")` }} />
              <span className="wfloor" style={{ background: `linear-gradient(${c.floor}, ${c.floorDark})` }} />
              <span className="wtext">
                <span className="wnum">0{i + 1}</span>
                <span className="wname display">{w.name}</span>
                <span className="wtag">{w.tagline}</span>
              </span>
              <span className="wstate">
                {here ? <><Check size={15} /> Here</> : ok ? <>Dive in <ArrowRight size={15} /></> : <><Lock size={14} /> {count}/{w.unlockAt}</>}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
