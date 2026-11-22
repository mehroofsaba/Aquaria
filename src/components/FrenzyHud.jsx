import { AnimatePresence, motion } from 'motion/react';
import { Timer, Star, Pause, Play, RotateCcw, Trophy, Waves } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { bus } from '../lib/bus.js';
import { ROUNDS } from '../engine/Frenzy.js';

const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

export default function FrenzyHud() {
  const f = useStore((s) => s.frenzy);
  const best = useStore((s) => s.highScore);
  const result = useStore((s) => s.frenzyResult);
  const setView = useStore((s) => s.setView);
  const playing = f.status === 'playing', paused = f.status === 'paused';
  const live = playing || paused;
  const pct = Math.min(100, (f.score / f.goal) * 100);

  return (
    <>
      {live && (
        <div className="hud-tl frenzy-stats">
          <div className={'pill glass stat' + (f.time <= 5 && playing ? ' warn' : '')}><Timer size={17} aria-hidden="true" /> <b>{fmt(f.time)}</b></div>
          <div className="pill glass stat"><Star size={17} className="gold" aria-hidden="true" /> <b>{f.score.toLocaleString()}</b></div>
          <div className="pill glass stat round"><span>Round {f.round}<span className="dim">/{ROUNDS}</span></span>
            <span className="goal" role="progressbar" aria-valuemin={0} aria-valuemax={f.goal} aria-valuenow={Math.min(f.score, f.goal)} aria-label="Round goal"><i style={{ width: pct + '%' }} /></span>
          </div>
        </div>
      )}
      {live && (
        <button className="icon-btn glass hud-pause" onClick={() => (playing ? bus.frenzy?.pause() : bus.frenzy?.resume())} aria-label={playing ? 'Pause' : 'Resume'}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
      )}
      <AnimatePresence>
        {playing && f.mult > 1 && (
          <motion.div key={f.mult} className="combo" initial={{ opacity: 0, scale: 0.6, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
            Combo <b>×{f.mult}</b>
          </motion.div>
        )}
      </AnimatePresence>
      {live && <div className="chip glass hud-bl best"><Star size={15} className="gold" aria-hidden="true" /> High Score: {best.toLocaleString()}</div>}

      <AnimatePresence mode="wait">
        {!live && (
          <motion.div key={f.status} className="overlay-card glass" role="dialog" aria-label="Fishing Frenzy" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3 }}>
            {f.status === 'idle' && (
              <>
                <h1 className="display">Fishing <i>Frenzy</i></h1>
                <p className="sub">{ROUNDS} rounds · 45 seconds each</p>
                <div className="stat-row"><span><Trophy size={15} className="gold" /> Best {best.toLocaleString()}</span></div>
                <button className="btn primary" onClick={() => bus.frenzy?.start()}><Play size={18} /> Play</button>
              </>
            )}
            {f.status === 'roundEnd' && (
              <>
                <h2 className="display">Round {f.round} <i>cleared</i></h2>
                <p className="big">{f.score.toLocaleString()}</p>
                <p className="sub">Goal met · faster fish ahead</p>
                <button className="btn primary" onClick={() => bus.frenzy?.nextRound()}><Play size={18} /> Round {f.round + 1}</button>
              </>
            )}
            {(f.status === 'over' || f.status === 'won') && (
              <>
                <h2 className="display">{f.status === 'won' ? <>Reef <i>master</i></> : <>Time’s <i>up</i></>}</h2>
                <p className="big">{f.score.toLocaleString()}</p>
                {result?.isBest && <p className="badge"><Trophy size={14} /> New high score</p>}
                <p className="sub">{f.catches} caught · Round {f.round}{f.status === 'over' ? ` · needed ${f.goal.toLocaleString()}` : ''}</p>
                <div className="btn-row">
                  <button className="btn primary" onClick={() => bus.frenzy?.start()}><RotateCcw size={17} /> Again</button>
                  <button className="btn" onClick={() => setView('aquarium')}><Waves size={17} /> Aquarium</button>
                </div>
              </>
            )}
          </motion.div>
        )}
        {paused && (
          <motion.div key="paused" className="overlay-card glass small" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <h2 className="display"><i>Paused</i></h2>
            <div className="btn-row">
              <button className="btn primary" onClick={() => bus.frenzy?.resume()}><Play size={17} /> Resume</button>
              <button className="btn" onClick={() => bus.frenzy?.toIdle()}>Quit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
