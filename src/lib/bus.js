// Tiny module-level bridge between React and the Pixi engines (no re-renders involved).
const readyListeners = new Set();

export const bus = {
  frenzy: null,       // active Frenzy engine, for the overlay buttons
  aquarium: null,     // active Aquarium engine
  emitReady() { [...readyListeners].forEach((f) => f()); },
  onceReady() {
    return new Promise((res) => {
      const f = () => { readyListeners.delete(f); res(); };
      readyListeners.add(f);
    });
  },
};
