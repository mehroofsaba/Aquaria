# AQUARIA — Beneath the waves

An interactive, living ocean built from the project blueprint: a polished aquarium you can touch, an arcade
fishing game, a Discovery Journal, four Ocean Worlds and optional cloud saves.

**Stack:** React 19 · Vite · PixiJS 8 · GSAP · Motion · Zustand · Lucide · Howler.js · Supabase · Render

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in ./dist
```

It works fully offline with no account — progress is stored in `localStorage`.

## What's inside

| Area | Where |
|---|---|
| Aquarium (schools, drag & release, feeding, bubbles, ripples, anemones, pearl shells, rare visitors) | `src/engine/Aquarium.js` |
| Shared underwater stage (parallax, light rays, caustics, scenery, FX) | `src/engine/reef.js` |
| Fishing Frenzy (net, combos, 3 rounds, bonus fish, high score) | `src/engine/Frenzy.js` |
| Discovery Journal, Ocean Worlds, HUD, modals | `src/components/` |
| Species + worlds data | `src/data/` |
| All art (fish, corals, ruins, net…) generated as SVG in code | `src/lib/art.js`, `src/engine/scenery.js` |
| Synthesised sound effects + ambience (no audio files) | `src/lib/sound.js` |
| State | `src/store/useStore.js` |

**Controls:** tap/drag fish · tap bubbles, water, anemones and shells · `F` toggles feed mode ·
Frenzy: move the net, click/hold (or swipe fast) to scoop, `Space` pauses.
New worlds unlock as you discover species (3 → Kelp Forest, 6 → Seagrass Meadow, 10 → Open Ocean).

## Optional: accounts & cloud save (Supabase)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon key only — never the service-role key).
3. Restart the dev server. A sign-in button appears; discoveries, high scores, unlocks and settings sync, protected by Row Level Security.

## Deploy on Render

`render.yaml` is included (static site, `npm install && npm run build`, publish `dist`, SPA rewrite).
Add the two `VITE_SUPABASE_*` env vars in the Render dashboard if you use Supabase.

## Accessibility

Keyboard-navigable UI, ARIA labels, reduced-motion support (OS setting + in-app toggle), optional sound,
touch + mouse input, responsive layout with a bottom tab bar on phones.
