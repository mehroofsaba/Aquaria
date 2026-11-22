import { motion } from "motion/react";
import {
  Waves,
  Anchor,
  BookOpen,
  Globe,
  Volume2,
  VolumeX,
  Settings,
  User,
  Sparkle,
} from "lucide-react";
import { useStore } from "../store/useStore.js";
import { cloudEnabled } from "../lib/supabase.js";

const NAV = [
  { id: "aquarium", label: "Aquarium", Icon: Waves },
  { id: "frenzy", label: "Fishing Frenzy", short: "Frenzy", Icon: Anchor },
  { id: "journal", label: "Discover", Icon: BookOpen },
  { id: "worlds", label: "Worlds", Icon: Globe },
];

export function Logo() {
  return (
    <div className="logo" aria-label="Aquaria">
      <Sparkle className="logo-spark l" size={12} aria-hidden="true" />
      <span className="logo-word">
        <span className="logo-a">A</span>QUARIA
      </span>
      <Sparkle className="logo-spark r" size={12} aria-hidden="true" />
    </div>
  );
}

export default function TopBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const status = useStore((s) => s.frenzy.status);
  const sound = useStore((s) => s.settings.sound);
  const setSettings = useStore((s) => s.setSettings);
  const openSettings = useStore((s) => s.openSettings);
  const openAuth = useStore((s) => s.openAuth);
  const user = useStore((s) => s.user);
  const playing = view === "frenzy" && status === "playing";

  return (
    <header className="topbar">
      {playing ? (
        <div className="pill title-pill" aria-live="polite">
          <Anchor size={16} aria-hidden="true" />
          <span className="serif-i">Fishing Frenzy</span>
        </div>
      ) : (
        <nav className="nav glass" aria-label="Primary">
          {NAV.map(({ id, label, short, Icon }) => (
            <button
              key={id}
              className={"nav-btn" + (view === id ? " on" : "")}
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
            >
              {view === id && (
                <motion.span
                  layoutId="nav-pill"
                  className="nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon size={17} aria-hidden="true" />
              <span className="nav-label">
                {short ? (
                  <>
                    <span className="full">{label}</span>
                    <span className="short">{short}</span>
                  </>
                ) : (
                  label
                )}
              </span>
            </button>
          ))}
        </nav>
      )}
      <div className="tools">
        <button
          className="icon-btn glass"
          onClick={() => setSettings({ sound: !sound })}
          aria-label={sound ? "Mute sound" : "Turn sound on"}
          aria-pressed={sound}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        {cloudEnabled && (
          <button
            className={"icon-btn glass hide-sm" + (user ? " signed" : "")}
            onClick={() => openAuth(true)}
            aria-label={user ? "Account" : "Sign in"}
          >
            <User size={19} />
          </button>
        )}
        <button
          className="icon-btn glass"
          onClick={() => openSettings(true)}
          aria-label="Settings"
        >
          <Settings size={19} />
        </button>
      </div>
    </header>
  );
}
