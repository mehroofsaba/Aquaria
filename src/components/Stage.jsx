import { useEffect, useRef, useState } from 'react';
import { Aquarium } from '../engine/Aquarium.js';
import { Frenzy } from '../engine/Frenzy.js';
import { useStore } from '../store/useStore.js';
import { sound } from '../lib/sound.js';
import { bus } from '../lib/bus.js';

const playSound = (n, p) => sound.play(n, p);
const unlock = () => sound.unlock();

function useCalm() {
  return useStore((s) => s.settings.reduceMotion);
}

export function AquariumStage({ interactive }) {
  const host = useRef(null);
  const eng = useRef(null);
  const calm = useCalm();
  const quality = useStore((s) => s.settings.quality);
  const worldId = useStore((s) => s.worldId);
  const feedMode = useStore((s) => s.feedMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const st = useStore.getState();
    const a = new Aquarium(host.current, {
      worldId: st.worldId, calm, quality, interactive,
      sound: playSound, onFirstGesture: unlock,
      onReady: () => { setReady(true); bus.emitReady(); },
      onInteract: (id) => { if (useStore.getState().discover(id)) sound.play('discover'); },
      onPearl: () => { if (useStore.getState().discover('pearl-oyster')) sound.play('discover'); },
      onRare: (id) => { useStore.getState().pushToast({ kind: 'rare', speciesId: id }); sound.play('chime'); },
    });
    eng.current = a; bus.aquarium = a;
    a.setFeedMode(useStore.getState().feedMode);
    a.init().catch((e) => console.error('Aquarium failed to start', e));
    return () => { a.destroy(); if (bus.aquarium === a) bus.aquarium = null; eng.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, quality]);

  useEffect(() => { eng.current?.setOptions({ interactive }); }, [interactive]);
  useEffect(() => { eng.current?.setFeedMode(feedMode); }, [feedMode]);
  useEffect(() => {
    const a = eng.current;
    if (a && a.app && a.world && a.world.id !== worldId) a.setWorld(worldId);
  }, [worldId]);

  return <div ref={host} className={'stage' + (ready ? ' ready' : '') + (interactive ? ' live' : '')} data-feed={feedMode ? '1' : undefined} />;
}

export function FrenzyStage() {
  const host = useRef(null);
  const calm = useCalm();
  const quality = useStore((s) => s.settings.quality);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const st = useStore.getState();
    const f = new Frenzy(host.current, {
      worldId: st.worldId, calm, quality, sound: playSound, onFirstGesture: unlock,
      onReady: () => { setReady(true); bus.emitReady(); },
      onState: (s) => useStore.getState().setFrenzy(s),
      onCatch: (id) => { if (useStore.getState().discover(id)) sound.play('discover'); },
      onGameEnd: ({ score, round }) => {
        const isBest = useStore.getState().submitScore(score, round);
        useStore.setState({ frenzyResult: { score, round, isBest } });
      },
    });
    bus.frenzy = f;
    useStore.setState({ frenzyResult: null });
    f.init().catch((e) => console.error('Frenzy failed to start', e));
    return () => { f.destroy(); if (bus.frenzy === f) bus.frenzy = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, quality]);

  return <div ref={host} className={'stage frenzy live' + (ready ? ' ready' : '')} />;
}
