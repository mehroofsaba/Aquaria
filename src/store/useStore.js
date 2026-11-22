import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SPECIES_BY_ID, SPECIES } from '../data/species.js';
import { WORLDS } from '../data/worlds.js';
import * as cloud from '../lib/cloud.js';

export const DEFAULT_SETTINGS = { sound: true, volume: 0.7, reduceMotion: false, quality: 'balanced' };
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let toastId = 1;
let settingsTimer = null;

export const unlockedWorldIds = (discovered) => {
  const n = Object.keys(discovered).length;
  return WORLDS.filter((w) => n >= w.unlockAt).map((w) => w.id);
};

export const useStore = create(
  persist(
    (set, get) => ({
      /* navigation + transient UI */
      view: 'aquarium',
      feedMode: false,
      toasts: [],
      frenzy: { status: 'idle', round: 1, score: 0, time: 45, combo: 0, mult: 1, goal: 600, catches: 0 },
      user: null,
      authOpen: false,
      settingsOpen: false,
      journalFocus: null,

      /* persisted progress */
      worldId: 'coral',
      discovered: {},
      highScore: 0,
      settings: { ...DEFAULT_SETTINGS, reduceMotion: prefersReduced() },

      setView: (view) => set({ view, settingsOpen: false }),
      setFeedMode: (feedMode) => set({ feedMode }),
      setFrenzy: (frenzy) => set({ frenzy }),
      openAuth: (authOpen) => set({ authOpen }),
      openSettings: (settingsOpen) => set({ settingsOpen }),
      setJournalFocus: (journalFocus) => set({ journalFocus }),

      pushToast: (t) => {
        const id = toastId++;
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, ...t }] }));
        return id;
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setWorld: (worldId) => {
        const { discovered, user, settings } = get();
        if (!unlockedWorldIds(discovered).includes(worldId)) return false;
        set({ worldId });
        if (user) cloud.pushSettings(user.id, settings, worldId);
        return true;
      },

      // Returns true the first time a species is discovered.
      discover: (id) => {
        const sp = SPECIES_BY_ID[id];
        const { discovered, user } = get();
        if (!sp || discovered[id]) return false;
        const before = unlockedWorldIds(discovered);
        const next = { ...discovered, [id]: Date.now() };
        set({ discovered: next });
        get().pushToast({ kind: 'discover', speciesId: id });
        const after = unlockedWorldIds(next);
        const fresh = after.filter((w) => !before.includes(w));
        for (const w of fresh) get().pushToast({ kind: 'world', worldId: w });
        if (user) {
          cloud.pushDiscoveries(user.id, { [id]: next[id] });
          if (fresh.length) cloud.pushWorlds(user.id, fresh);
        }
        return true;
      },

      submitScore: (score, round) => {
        const { highScore, user, worldId } = get();
        const isBest = score > highScore;
        if (isBest) set({ highScore: score });
        if (user && score > 0) cloud.pushScore(user.id, { score, round, worldId });
        return isBest;
      },

      setSettings: (patch) => {
        const settings = { ...get().settings, ...patch };
        set({ settings });
        const { user, worldId } = get();
        if (user) {
          clearTimeout(settingsTimer);
          settingsTimer = setTimeout(() => cloud.pushSettings(user.id, settings, worldId), 800);
        }
      },

      resetProgress: () => set({ discovered: {}, highScore: 0, worldId: 'coral', toasts: [] }),

      /* accounts */
      setUser: async (u) => {
        if (!u) { set({ user: null }); return; }
        const user = { id: u.id, email: u.email };
        set({ user });
        const remote = await cloud.pullAll(user.id);
        if (!remote) return;
        const s = get();
        const discovered = { ...remote.discoveries, ...s.discovered };
        for (const [k, v] of Object.entries(remote.discoveries)) discovered[k] = Math.min(v, s.discovered[k] ?? v);
        const highScore = Math.max(s.highScore, remote.highScore);
        const settings = remote.settings ? { ...s.settings, ...remote.settings } : s.settings;
        const worldId = unlockedWorldIds(discovered).includes(remote.lastWorld) ? remote.lastWorld : s.worldId;
        set({ discovered, highScore, settings, worldId });
        // push anything only we had
        const local = {};
        for (const [k, v] of Object.entries(discovered)) if (!remote.discoveries[k]) local[k] = v;
        await cloud.pushDiscoveries(user.id, local);
        await cloud.pushWorlds(user.id, unlockedWorldIds(discovered));
        if (s.highScore > remote.highScore) await cloud.pushScore(user.id, { score: s.highScore, round: 1, worldId });
        await cloud.pushSettings(user.id, settings, worldId);
      },
    }),
    {
      name: 'aquaria:v1',
      version: 1,
      partialize: (s) => ({ worldId: s.worldId, discovered: s.discovered, highScore: s.highScore, settings: s.settings }),
    },
  ),
);

export const TOTAL_SPECIES = SPECIES.length;
