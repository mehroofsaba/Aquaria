import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { useStore, unlockedWorldIds } from "./store/useStore.js";
import { WORLDS_BY_ID } from "./data/worlds.js";
import { AquariumStage, FrenzyStage } from "./components/Stage.jsx";
import TopBar from "./components/TopBar.jsx";
import AquariumHud from "./components/AquariumHud.jsx";
import FrenzyHud from "./components/FrenzyHud.jsx";
import Journal from "./components/Journal.jsx";
import Worlds from "./components/Worlds.jsx";
import Toasts from "./components/Toasts.jsx";
import { SettingsModal, AuthModal } from "./components/Modals.jsx";
import WorldTransition from "./components/WorldTransition.jsx";
import Splash from "./components/Splash.jsx";
import { sound } from "./lib/sound.js";
import { bus } from "./lib/bus.js";
import { watchAuth } from "./lib/cloud.js";

export default function App() {
  const view = useStore((s) => s.view);
  const worldId = useStore((s) => s.worldId);
  const settings = useStore((s) => s.settings);
  const status = useStore((s) => s.frenzy.status);
  const wt = useRef(null);
  const [booting, setBooting] = useState(true);

  // Keep Howler in step with settings; hide the splash after the first world is built.
  useEffect(() => {
    sound.configure({ sound: settings.sound, volume: settings.volume });
  }, [settings.sound, settings.volume]);

  useEffect(() => {
    let active = true;
    let finishTimer;
    const startedAt = Date.now();

    const fallbackTimer = setTimeout(() => {
      if (active) setBooting(false);
    }, 9000);

    bus.onceReady().then(() => {
      const remaining = Math.max(0, 5200 - (Date.now() - startedAt));

      finishTimer = setTimeout(() => {
        if (active) {
          setBooting(false);
          clearTimeout(fallbackTimer);
        }
      }, remaining);
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  // Auth session (no-op when Supabase isn't configured).
  useEffect(() => watchAuth((u) => useStore.getState().setUser(u)), []);

  // Keyboard: F toggles feed mode in the aquarium.
  useEffect(() => {
    const k = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      const st = useStore.getState();
      if (e.key.toLowerCase() === "f" && st.view === "aquarium")
        st.setFeedMode(!st.feedMode);
      if (e.key === " " && st.view === "frenzy") {
        if (st.frenzy.status === "playing") {
          bus.frenzy?.pause();
          e.preventDefault();
        } else if (st.frenzy.status === "paused") {
          bus.frenzy?.resume();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  // Auto-pause the game if the tab is hidden.
  useEffect(() => {
    const v = () => document.hidden && bus.frenzy?.pause();
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);

  const pickWorld = useCallback((id) => {
    const st = useStore.getState();
    if (!unlockedWorldIds(st.discovered).includes(id)) return;
    if (id === st.worldId) {
      st.setView("aquarium");
      return;
    }
    wt.current?.play(
      WORLDS_BY_ID[id],
      async () => {
        const ready = bus.onceReady();
        st.setWorld(id);
        st.setView("aquarium");
        await Promise.race([ready, new Promise((r) => setTimeout(r, 3500))]);
      },
      useStore.getState().settings.reduceMotion,
    );
  }, []);

  const panel = view === "journal" || view === "worlds";
  return (
    <div
      className={"app" + (settings.reduceMotion ? " reduce-motion" : "")}
      data-view={view}
      data-world={worldId}
      data-playing={view === "frenzy" && status === "playing" ? "1" : undefined}
    >
      {view === "frenzy" ? (
        <FrenzyStage key={"f"} />
      ) : (
        <AquariumStage key={"a"} interactive={view === "aquarium"} />
      )}
      <div className="grade" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className={"veil" + (panel ? " on" : "")} aria-hidden="true" />

      <TopBar />
      {view === "aquarium" && <AquariumHud onPickWorld={pickWorld} />}
      {view === "frenzy" && <FrenzyHud />}
      <main>
        <AnimatePresence mode="wait">
          {view === "journal" && <Journal key="journal" />}
          {view === "worlds" && <Worlds key="worlds" onSelect={pickWorld} />}
        </AnimatePresence>
      </main>

      <Toasts />
      <SettingsModal />
      <AuthModal />
      <WorldTransition ref={wt} />
      <Splash show={booting} />
    </div>
  );
}
