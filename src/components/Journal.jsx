import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Lock, Star } from "lucide-react";
import { useStore, TOTAL_SPECIES } from "../store/useStore.js";
import {
  SPECIES,
  RARITY,
  RARITY_ORDER,
  speciesPoints,
} from "../data/species.js";
import { WORLDS } from "../data/worlds.js";
import { speciesURI } from "../lib/art.js";

// Anemone & oyster are reef objects, still collectable, so the journal lists everything.
const worldOf = (sp) => sp.habitat.split(" · ")[0];
const WORLD_NAMES = WORLDS.map((w) => w.name);

function Card({ sp, found, onOpen, index }) {
  const r = RARITY[sp.rarity];
  return (
    <button
      className={"jcard" + (found ? "" : " locked") + " r-" + sp.rarity}
      onClick={() => found && onOpen(sp)}
      disabled={!found}
      aria-label={found ? sp.name : "Undiscovered species"}
    >
      <span className="jart">
        <img src={speciesURI(sp)} alt="" draggable="false" loading="lazy" />
        {!found && <Lock size={16} className="jlock" aria-hidden="true" />}
      </span>
      <span className="jname serif">{found ? sp.name : "???"}</span>
      <span
        className="jrar"
        style={{ "--c": found ? r.color : "rgba(255,255,255,.3)" }}
      >
        <i />
        {found ? r.label : "Undiscovered"}
      </span>
    </button>
  );
}

function Detail({ sp, at, onClose }) {
  const r = RARITY[sp.rarity];
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div
      className="scrim"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="detail glass"
        role="dialog"
        aria-modal="true"
        aria-label={sp.name}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <button className="icon-btn close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className={"dart r-" + sp.rarity}>
          <img src={speciesURI(sp)} alt={sp.name} draggable="false" />
        </div>
        <div className="dbody">
          <span className="jrar" style={{ "--c": r.color }}>
            <i />
            {r.label}
          </span>
          <h2 className="display">{sp.name}</h2>
          <p className="habitat">{sp.habitat}</p>
          <p className="blurb">{sp.blurb}</p>
          <div className="dmeta">
            <span>
              <Star size={14} className="gold" /> {speciesPoints(sp)} pts
            </span>
            {at && (
              <span>
                Found{" "}
                {new Date(at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Journal() {
  const discovered = useStore((s) => s.discovered);
  const focus = useStore((s) => s.journalFocus);
  const [rar, setRar] = useState("all");
  const [wld, setWld] = useState("all");
  const [only, setOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const count = Object.keys(discovered).length;

  useEffect(() => {
    if (focus && discovered[focus])
      setOpen(SPECIES.find((s) => s.id === focus));
  }, [focus]); // eslint-disable-line

  const list = useMemo(
    () =>
      SPECIES.filter(
        (s) =>
          (rar === "all" || s.rarity === rar) &&
          (wld === "all" || worldOf(s) === wld) &&
          (!only || discovered[s.id]),
      ),
    [rar, wld, only, discovered],
  );
  const pct = (count / TOTAL_SPECIES) * 100;

  return (
    <motion.section
      className="panel journal"
      aria-label="Discovery Journal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="panel-head">
        <div>
          <h1 className="display">
            Discovery <i>Journal</i>
          </h1>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL_SPECIES}
            aria-valuenow={count}
            aria-label="Species discovered"
          >
            <span className="bar">
              <i style={{ width: pct + "%" }} />
            </span>
            <b>{count}</b>
            <span className="dim">/{TOTAL_SPECIES}</span>
          </div>
        </div>
        <div className="rarity-dots" aria-hidden="true">
          {RARITY_ORDER.map((k) => {
            const tot = SPECIES.filter((s) => s.rarity === k).length,
              got = SPECIES.filter(
                (s) => s.rarity === k && discovered[s.id],
              ).length;
            return (
              <span key={k} style={{ "--c": RARITY[k].color }}>
                <i />
                {got}/{tot}
              </span>
            );
          })}
        </div>
      </div>

      <div className="filters" role="group" aria-label="Filters">
        <div className="seg">
          {["all", ...RARITY_ORDER].map((k) => (
            <button
              key={k}
              className={rar === k ? "on" : ""}
              onClick={() => setRar(k)}
            >
              {k === "all" ? "All" : RARITY[k].label}
            </button>
          ))}
        </div>
        <div className="seg">
          {["all", ...WORLD_NAMES].map((k) => (
            <button
              key={k}
              className={wld === k ? "on" : ""}
              onClick={() => setWld(k)}
            >
              {k === "all" ? "Everywhere" : k.split(" ")[0]}
            </button>
          ))}
        </div>
        <button
          className={"seg-toggle" + (only ? " on" : "")}
          onClick={() => setOnly((o) => !o)}
          aria-pressed={only}
        >
          Found
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${rar}-${wld}-${only}`}
          className="jgrid"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{
            duration: 0.25,
            ease: "easeInOut",
          }}
        >
          {list.map((sp, i) => (
            <Card
              key={sp.id}
              sp={sp}
              index={i}
              found={!!discovered[sp.id]}
              onOpen={setOpen}
            />
          ))}

          {!list.length && <p className="empty">Nothing here yet</p>}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <Detail
            sp={open}
            at={discovered[open.id]}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
