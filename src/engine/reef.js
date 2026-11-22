// Reef — the shared underwater stage used by both the Aquarium and Fishing Frenzy.
// It owns every layer (backdrop, light rays, scenery, bubbles, particles, FX) and exposes a
// `creatures` container that the engines fill with their own fish.
import { Container, Sprite, Texture, TilingSprite, Text } from 'pixi.js';
import { mulberry32, mix, clamp, rand, toInt } from '../lib/rng.js';
import { svgToCanvas, speciesSVG, shellSVG, pearlSVG, kelpSVG, seagrassSVG } from '../lib/art.js';
import { SPECIES_BY_ID } from '../data/species.js';
import {
  branchCoralSVG, fanCoralSVG, brainCoralSVG, tubeCoralSVG, tableCoralSVG, rockSVG, floorSVG, farSVG,
  makeBackground, makeRayTexture, makeCausticTexture, makeBubbleTexture, makeMoteTexture, makeRingTexture,
  makeSparkTexture, makePelletTexture,
} from './scenery.js';

/* ───── Texture bank (per engine instance, destroyed with it) ───── */

export class TextureBank {
  constructor() { this.map = new Map(); }
  fromCanvas(key, canvas) {
    let t = this.map.get(key);
    if (!t) {
      t = Texture.from(canvas, true);
      try { t.source.autoGenerateMipmaps = true; } catch (e) { /* optional */ }
      this.map.set(key, t);
    }
    return t;
  }
  async fromSvg(key, svg) {
    if (this.map.has(key)) return this.map.get(key);
    const c = await svgToCanvas(svg, key);
    return this.fromCanvas(key, c);
  }
  species(sp) { return this.fromSvg('sp:' + sp.id, speciesSVG(sp)); }
  destroy() {
    for (const t of this.map.values()) { try { t.destroy(true); } catch (e) { /* already gone */ } }
    this.map.clear();
  }
}

const once = (fn) => { let v; return () => (v ??= fn()); };
const RAY_C = once(makeRayTexture), CAUSTIC_C = once(makeCausticTexture), BUBBLE_C = once(makeBubbleTexture),
  MOTE_C = once(makeMoteTexture), RING_C = once(makeRingTexture), SPARK_C = once(makeSparkTexture), PELLET_C = once(makePelletTexture);

const CORAL_COUNT = { coral: 16, kelp: 7, seagrass: 6, open: 0 };
const ROCK_COUNT = { coral: 6, kelp: 7, seagrass: 3, open: 5 };
const CORAL_KINDS = ['branch', 'fan', 'brain', 'tube', 'table', 'branch', 'fan'];
const CORAL_REF = { branch: 230, fan: 220, brain: 90, tube: 170, table: 120 };

export const calcScale = (W, H) => clamp(Math.max(Math.min(W / 1200, H / 700), Math.min(W, H) / 620) * 1.05, 0.6, 1.4);

export class Reef {
  constructor(app, { calm = false, quality = 'balanced' } = {}) {
    this.app = app;
    this.calm = calm;
    this.quality = quality;
    this.bank = new TextureBank();
    this.token = 0;
    this.W = 0; this.H = 0; this.S = 1;
    this.world = null;
    this.items = []; this.props = []; this.rays = []; this.motes = []; this.bubbles = [];
    this.fxList = [];
    this.bgSprite = null; this.farSprite = null; this.floorSprite = null; this.caustics = [];

    const mkC = () => new Container();
    this.root = mkC();
    this.back = mkC(); this.rayLayer = mkC(); this.causticLayer = mkC(); this.mid = mkC();
    this.creatures = mkC(); this.creatures.sortableChildren = true;
    this.front = mkC(); this.moteLayer = mkC(); this.bubbleLayer = mkC(); this.fx = mkC();
    this.root.addChild(this.back, this.rayLayer, this.causticLayer, this.mid, this.creatures, this.front, this.moteLayer, this.bubbleLayer, this.fx);
    app.stage.addChild(this.root);
    this.parallax = { far: 0, mid: 0, front: 0 };
  }

  get qf() { return this.quality === 'low' ? 0.45 : this.quality === 'high' ? 1.2 : 0.85; }

  clear() {
    for (const c of [this.back, this.rayLayer, this.causticLayer, this.mid, this.front, this.moteLayer, this.bubbleLayer, this.fx]) {
      for (const ch of c.removeChildren()) ch.destroy({ children: true });
    }
    this.items = []; this.props = []; this.rays = []; this.motes = []; this.bubbles = []; this.fxList = []; this.caustics = [];
    this.bgSprite = null; this.farSprite = null; this.floorSprite = null;
  }

  /* ───────── Build a world ───────── */
  async build(world, W, H) {
    const token = ++this.token;
    this.clear();
    this.world = world; this.W = W; this.H = H; this.S = calcScale(W, H);
    const bank = this.bank, k = world.colors, rng = mulberry32(world.seed * 101 + 1);

    const rockBase = mix(mix(k.deep, k.fog, 0.4), '#5a4aa0', 0.28);
    const nCoral = CORAL_COUNT[world.id] ?? 8, nRock = ROCK_COUNT[world.id] ?? 4;
    const jobs = [];
    const add = (p) => { const slot = { v: null }; jobs.push(p.then((v) => { slot.v = v; })); return slot; };

    const far = add(bank.fromSvg(`far:${world.id}`, farSVG(world.far, k, world.seed)));
    const floor = add(bank.fromSvg(`floor:${world.id}`, floorSVG(k.floor, k.floorDark, world.seed)));
    const rocks = Array.from({ length: 4 }, (_, i) => add(bank.fromSvg(`rock:${world.id}:${i}`, rockSVG(mix(rockBase, '#ffffff', i * 0.04), world.seed + i, world.palette[i % world.palette.length]))));
    const corals = [];
    for (let i = 0; i < Math.min(nCoral, 10); i++) {
      const kind = CORAL_KINDS[i % CORAL_KINDS.length], col = world.palette[i % world.palette.length], seed = world.seed + i * 3;
      const svg = kind === 'branch' ? branchCoralSVG(col, seed) : kind === 'fan' ? fanCoralSVG(col, seed) : kind === 'brain' ? brainCoralSVG(col, seed)
        : kind === 'tube' ? tubeCoralSVG(col, seed) : tableCoralSVG(col, seed);
      corals.push({ kind, slot: add(bank.fromSvg(`coral:${world.id}:${i}`, svg)) });
    }
    const pc1 = mix('#6FB36A', k.fog, 0.15), pc2 = mix('#2B6B45', k.deep, 0.25);
    const kelpT = Array.from({ length: 3 }, (_, i) => add(bank.fromSvg(`kelp:${world.id}:${i}`, kelpSVG(mix(pc1, '#9BCB5A', world.id === 'kelp' ? 0.5 : 0), pc2, world.seed + i))));
    const grassT = Array.from({ length: 3 }, (_, i) => add(bank.fromSvg(`grass:${world.id}:${i}`, seagrassSVG(mix('#8FD08A', k.fog, 0.1), mix('#3E8F5A', k.deep, 0.2), world.seed + i * 2))));
    const anemSp = SPECIES_BY_ID['sea-anemone'], shellSp = SPECIES_BY_ID['pearl-oyster'];
    const anemT = add(bank.species(anemSp));
    const shellClosed = add(bank.fromSvg('shell:closed', shellSVG(shellSp.art, false)));
    const shellOpen = add(bank.fromSvg('shell:open', shellSVG(shellSp.art, true)));
    const pearlT = add(bank.fromSvg('pearl', pearlSVG()));
    await Promise.all(jobs);
    if (token !== this.token) return false;

    const tex = (key, c) => bank.fromCanvas(key, c);
    this.tex = { ray: tex('ray', RAY_C()), caustic: tex('caustic', CAUSTIC_C()), bubble: tex('bubble', BUBBLE_C()), mote: tex('mote', MOTE_C()),
      ring: tex('ring', RING_C()), spark: tex('spark', SPARK_C()), pellet: tex('pellet', PELLET_C()), pearl: pearlT.v };

    try { this.tex.caustic.source.style.addressMode = 'repeat'; } catch (e) { /* default */ }

    // Backdrop + far silhouettes
    this.bgSprite = new Sprite(Texture.EMPTY);
    this.back.addChild(this.bgSprite);
    this.farSprite = new Sprite(far.v); this.farSprite.anchor.set(0.5, 1); this.farSprite.alpha = 0.55; this.farSprite.tint = toInt(mix('#ffffff', k.fog, 0.4));
    this.back.addChild(this.farSprite);

    // Light rays
    const rc = world.rays.count;
    for (let i = 0; i < rc; i++) {
      const s = new Sprite(this.tex.ray);
      s.anchor.set(0.5, 0); s.blendMode = 'add'; s.tint = toInt(k.ray);
      this.rays.push({ s, nx: -0.1 + (i / Math.max(1, rc - 1)) * 1.2 + (rng() - 0.5) * 0.06, w: 0.7 + rng() * 1.6, lean: 0.2 + rng() * 0.18, phase: rng() * 6.28, base: world.rays.alpha * (0.6 + rng() * 0.8), spd: 0.15 + rng() * 0.3 });
      this.rayLayer.addChild(s);
    }

    // Caustics (shimmering light on everything)
    if (this.quality !== 'low' && !this.calm) {
      for (const [a, sp, sc] of [[0.1, 14, 1.6], [0.07, -9, 2.4]]) {
        const ts = new TilingSprite({ texture: this.tex.caustic, width: 10, height: 10 });
        ts.alpha = a; ts.blendMode = 'add'; ts.tileScale.set(sc);
        this.caustics.push({ ts, sp, a });
        this.causticLayer.addChild(ts);
      }
    }

    // Scenery
    this.floorSprite = new Sprite(floor.v); this.floorSprite.anchor.set(0.5, 1);
    const midItems = [], frontItems = [];
    const stratified = (i, n, j = 0.7) => clamp((i + 0.5 + (rng() - 0.5) * j) / n, -0.02, 1.02);

    for (let i = 0; i < nRock; i++) midItems.push({ t: rocks[i % 4].v, nx: stratified(i, nRock), ny: 0.93 + rng() * 0.06, ref: 90 + rng() * 90, flip: rng() < 0.5, kind: 'rock' });
    for (let i = 0; i < nCoral; i++) {
      const c = corals[i % corals.length];
      midItems.push({ t: c.slot.v, nx: stratified(i, nCoral), ny: 0.87 + rng() * 0.09, ref: CORAL_REF[c.kind] * (0.7 + rng() * 0.6), flip: rng() < 0.5, kind: 'coral', sway: c.kind === 'fan' ? 0.012 : 0.004, phase: rng() * 6.28 });
    }
    for (const p of world.plants) {
      const tList = p.kind === 'kelp' ? kelpT : grassT;
      for (let i = 0; i < p.n; i++) {
        const front = p.layer === 'front';
        const frac = p.kind === 'kelp' ? (front ? 0.75 + rng() * 0.3 : 0.45 + rng() * 0.4) : front ? 0.3 + rng() * 0.16 : 0.2 + rng() * 0.18;
        const edge = front ? (rng() < 0.5 ? rng() * 0.2 : 0.8 + rng() * 0.2) : stratified(i, p.n, 0.9);
        const item = { t: tList[Math.floor(rng() * 3)].v, nx: edge, ny: front ? 1.02 : 0.93 + rng() * 0.05, frac, flip: rng() < 0.5, kind: 'plant', sway: 0.05 + rng() * 0.035, phase: rng() * 6.28, spd: 0.7 + rng() * 0.6, dark: front };
        (front ? frontItems : midItems).push(item);
      }
    }
    if (world.id !== 'open') {
      for (let i = 0; i < 5; i++) {
        const left = i % 2 === 0;
        frontItems.push({ t: (i % 3 === 0 ? rocks[i % 4] : corals[i % corals.length].slot).v, nx: left ? 0.0 + rng() * 0.16 : 0.84 + rng() * 0.16, ny: 1.03 + rng() * 0.03, ref: 260 + rng() * 140, flip: !left, kind: i % 3 === 0 ? 'rock' : 'coral', dark: true, sway: 0.003, phase: rng() });
      }
    } else {
      for (let i = 0; i < 2; i++) frontItems.push({ t: rocks[i].v, nx: i ? 0.92 : 0.06, ny: 1.05, ref: 320, flip: !!i, kind: 'rock', dark: true });
    }
    midItems.sort((a, b) => a.ny - b.ny);

    this.mid.addChild(this.floorSprite);
    for (const it of midItems) this.addItem(it, this.mid);
    // Props (interactive in the Aquarium)
    const mkProp = (sp, tex0, nx, i) => {
      const s = new Sprite(tex0); s.anchor.set(0.5, 0.94);
      this.mid.addChild(s);
      const p = { sp, kind: sp.kind, s, nx, ny: 0.945 + rng() * 0.03, wScale: 0.85 + rng() * 0.4, phase: rng() * 6.28, retract: 0, open: false, pearl: null, tex0, i };
      this.props.push(p);
      return p;
    };
    const nAn = world.objects.anemone, nSh = world.objects.shell;
    for (let i = 0; i < nAn; i++) mkProp(anemSp, anemT.v, 0.1 + (0.8 * (i + 0.5)) / Math.max(1, nAn) + (rng() - 0.5) * 0.06, i);
    for (let i = 0; i < nSh; i++) {
      const p = mkProp(shellSp, shellClosed.v, 0.16 + (0.7 * (i + 0.5)) / Math.max(1, nSh) + (rng() - 0.5) * 0.08, i);
      p.closedT = shellClosed.v; p.openT = shellOpen.v;
      p.pearl = new Sprite(this.tex.pearl); p.pearl.anchor.set(0.5); p.pearl.visible = false;
      this.mid.addChild(p.pearl);
    }
    for (const it of frontItems) this.addItem(it, this.front);

    // Motes
    const nMote = Math.round(world.particles * this.qf * (this.calm ? 0.5 : 1));
    for (let i = 0; i < nMote; i++) {
      const s = new Sprite(this.tex.mote); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = toInt(mix(k.ray, '#ffffff', 0.4));
      this.motes.push({ s, x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.9, ph: Math.random() * 6.28, sp: 4 + Math.random() * 10 });
      this.moteLayer.addChild(s);
    }
    // Bubbles
    const nB = Math.round(world.bubbles * this.qf * (this.calm ? 0.6 : 1));
    for (let i = 0; i < nB; i++) {
      const s = new Sprite(this.tex.bubble); s.anchor.set(0.5);
      const b = { s, x: 0, y: 0, r: 0, vy: 0, ph: 0, wob: 0 };
      this.resetBubble(b, true);
      this.bubbles.push(b); this.bubbleLayer.addChild(s);
    }
    this.layout(W, H);
    return true;
  }

  addItem(it, layer) {
    const s = new Sprite(it.t);
    s.anchor.set(0.5, it.kind === 'rock' ? 0.8 : 1);
    if (it.dark) s.tint = 0x8FA3CC;
    it.s = s;
    layer.addChild(s);
    this.items.push(it);
  }

  resetBubble(b, anywhere = false) {
    const { W, H, S } = this;
    b.r = (5 + Math.random() * 13) * S;
    b.x = Math.random() * W;
    b.y = anywhere ? Math.random() * H : H + b.r + Math.random() * 80;
    b.vy = (24 + Math.random() * 40) * S * (1.4 - b.r / (20 * S) * 0.6);
    b.ph = Math.random() * 6.28; b.wob = (6 + Math.random() * 12) * S;
    b.s.alpha = 0.55 + Math.random() * 0.4;
    b.s.visible = true;
  }

  /* ───────── Layout (resize-safe) ───────── */
  layout(W, H) {
    this.W = W; this.H = H; this.S = calcScale(W, H);
    if (!this.world) return;
    const { S } = this, k = this.world.colors;
    const old = this.bgSprite.texture;
    this.bgSprite.texture = Texture.from(makeBackground(W, H, this.world), true);
    this.bgSprite.width = W; this.bgSprite.height = H;
    if (old && old !== Texture.EMPTY) { try { old.destroy(true); } catch (e) { /* noop */ } }

    const fk = Math.max((W * 1.12) / 1600, (H * 0.55) / 520);
    this.farSprite.scale.set(fk); this.farSprite.position.set(W / 2, H * 0.86);

    for (const r of this.rays) {
      r.s.x = r.nx * W; r.s.y = -H * 0.05;
      r.s.height = H * 1.15; r.s.width = r.w * 90 * S + 40;
    }
    for (const c of this.caustics) { c.ts.width = W; c.ts.height = H * 0.8; }

    this.floorSprite.scale.set(Math.max((W * 1.15) / 1600, 0.35)); this.floorSprite.position.set(W / 2, H + 6);
    for (const it of this.items) {
      const th = it.frac ? it.frac * H : it.ref * S;
      const sc = th / it.s.texture.height;
      it.sc = sc;
      it.s.scale.set(it.flip ? -sc : sc, sc);
      it.s.position.set(it.nx * W, it.ny * H);
    }
    for (const p of this.props) {
      const w = p.sp.size * S * p.wScale * (p.kind === 'shell' ? 1.15 : 1.25);
      p.base = w / p.tex0.width;
      p.s.position.set(p.nx * W, p.ny * H);
      p.s.scale.set(p.base);
      p.x = p.s.x; p.y = p.s.y; p.w = w; p.h = p.tex0.height * p.base;
    }
    this.bubbles.forEach((b) => { b.s.scale.set((b.r * 2) / 96); });
    for (const m of this.motes) { m.s.scale.set((3 + m.z * 5) * S / 48 * 3); }
  }

  /* ───────── Per-frame ───────── */
  update(dt, t, px = 0.5, py = 0.5) {
    if (!this.world) return;
    const { W, H, S, calm } = this;
    const pz = calm ? 0 : 1;
    this.back.x = (0.5 - px) * 10 * S * pz; this.mid.x = (0.5 - px) * 22 * S * pz; this.front.x = (0.5 - px) * 46 * S * pz;
    this.rayLayer.x = this.back.x * 1.3;
    this.creatures.x = 0;

    for (const r of this.rays) {
      const sw = calm ? 0.006 : 0.05;
      r.s.rotation = r.lean * 0.5 + Math.sin(t * r.spd + r.phase) * sw;
      r.s.alpha = r.base * (0.72 + 0.28 * Math.sin(t * r.spd * 2.1 + r.phase * 1.7));
    }
    for (const c of this.caustics) { c.ts.tilePosition.x += c.sp * dt; c.ts.tilePosition.y += Math.abs(c.sp) * 0.5 * dt; c.ts.alpha = c.a * (0.8 + 0.2 * Math.sin(t * 0.7)); }

    const swayK = calm ? 0.25 : 1;
    for (const it of this.items) {
      if (it.sway) it.s.skew.x = Math.sin(t * (it.spd || 0.8) + (it.phase || 0)) * it.sway * swayK * (it.flip ? -1 : 1);
    }
    for (const p of this.props) this.updateProp(p, dt, t);

    for (const m of this.motes) {
      m.y -= m.sp * m.z * S * dt; m.x += Math.sin(t * 0.4 + m.ph) * 6 * m.z * dt;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      m.s.position.set(m.x, m.y);
      m.s.alpha = (0.2 + 0.35 * m.z) * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph));
    }
    for (const b of this.bubbles) {
      b.y -= b.vy * dt; b.ph += dt * 1.6;
      b.s.position.set(b.x + Math.sin(b.ph) * b.wob, b.y);
      if (b.y < -b.r * 2) this.resetBubble(b);
    }
    this.updateFx(dt);
  }

  updateProp(p, dt, t) {
    const calm = this.calm ? 0.3 : 1;
    if (p.kind === 'anemone') {
      p.retract = Math.max(0, p.retract - dt);
      const r = p.retract > 0 ? Math.min(1, p.retract / 0.35) : 0;       // 1 = fully retracted
      const target = 1 - 0.58 * r;
      p.s.scale.y += (p.base * target - p.s.scale.y) * Math.min(1, dt * 9);
      p.s.scale.x += (p.base * (1 + 0.18 * r) - p.s.scale.x) * Math.min(1, dt * 9);
      p.s.skew.x = Math.sin(t * 1.1 + p.phase) * 0.07 * calm * (1 - r);
    } else if (p.kind === 'shell') {
      if (p.pearl.visible) {
        const bob = Math.sin(t * 2 + p.phase) * 2.5 * this.S;
        p.pearl.position.set(p.x, p.y - p.h * 0.34 + bob);
      }
    }
  }

  /* ───────── Prop interactions ───────── */
  hitProp(x, y) {
    for (const p of this.props) {
      if (Math.abs(x - p.x) < p.w * 0.55 && y > p.y - p.h * 0.95 && y < p.y + p.h * 0.1) return p;
    }
    return null;
  }
  retractAnemone(p) { p.retract = 2.6; }
  openShell(p) {
    p.open = true; p.s.texture = p.openT; p.s.scale.set((p.w / p.openT.width));
    p.pearl.visible = true; p.pearl.scale.set((p.w * 0.26) / this.tex.pearl.width);
    p.pearl.alpha = 1;
  }
  closeShell(p) {
    p.open = false; p.s.texture = p.closedT; p.s.scale.set(p.w / p.closedT.width);
    p.pearl.visible = false;
  }

  /* ───────── Bubbles ───────── */
  popBubbleAt(x, y) {
    let best = null, bd = 1e9;
    for (const b of this.bubbles) {
      const bx = b.s.x, by = b.s.y, d = Math.hypot(bx - x, by - y);
      if (d < b.r * 1.5 + 12 && d < bd) { best = b; bd = d; }
    }
    if (!best) return false;
    this.burst(best.s.x, best.s.y, { n: 7, color: 0xDDF6FF, speed: 70, size: 0.55 });
    this.ripple(best.s.x, best.s.y, 0.35);
    this.resetBubble(best);
    return true;
  }
  spawnBubbleBurst(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      const b = this.bubbles[Math.floor(Math.random() * this.bubbles.length)];
      if (!b) return;
      b.x = x + (Math.random() - 0.5) * 24; b.y = y; b.r = (3 + Math.random() * 6) * this.S; b.vy = (50 + Math.random() * 40) * this.S;
      b.s.scale.set((b.r * 2) / 96);
    }
  }

  /* ───────── FX ───────── */
  ripple(x, y, k = 1) {
    if (this.fxList.length > 120) return;
    for (let i = 0; i < 2; i++) {
      const s = new Sprite(this.tex.ring); s.anchor.set(0.5); s.position.set(x, y); s.alpha = 0; s.tint = 0xDFF7FF;
      this.fx.addChild(s);
      this.fxList.push({ kind: 'ring', s, t: -i * 0.18, life: 1.1, r: 120 * this.S * k });
    }
  }
  burst(x, y, { n = 8, color = 0xFFFFFF, speed = 90, size = 0.7 } = {}) {
    if (this.calm) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.tex.mote); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = color; s.position.set(x, y);
      const a = Math.random() * 6.28, v = speed * this.S * (0.4 + Math.random());
      s.scale.set(size * (0.4 + Math.random() * 0.6) * this.S);
      this.fx.addChild(s);
      this.fxList.push({ kind: 'bit', s, t: 0, life: 0.55 + Math.random() * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
  }
  sparkle(x, y, k = 1, color = 0xFFF1B8) {
    const s = new Sprite(this.tex.spark); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = color; s.position.set(x, y);
    this.fx.addChild(s);
    this.fxList.push({ kind: 'spark', s, t: 0, life: 0.8, k: k * this.S });
  }
  floatText(x, y, text, { color = '#F6D58A', size = 28 } = {}) {
    const s = new Text({ text, style: { fontFamily: 'Sora, sans-serif', fontSize: size * Math.max(0.8, this.S), fontWeight: '700', fill: color, stroke: { color: '#073B4C', width: 5, join: 'round' }, dropShadow: { color: '#000000', alpha: 0.25, blur: 4, distance: 2 } } });
    s.anchor.set(0.5); s.position.set(x, y); s.alpha = 0;
    this.fx.addChild(s);
    this.fxList.push({ kind: 'text', s, t: 0, life: 1.1 });
  }
  updateFx(dt) {
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const f = this.fxList[i];
      f.t += dt;
      if (f.t < 0) continue;
      const u = f.t / f.life;
      if (u >= 1) { this.fx.removeChild(f.s); f.s.destroy(); this.fxList.splice(i, 1); continue; }
      switch (f.kind) {
        case 'ring': { const e = 1 - (1 - u) * (1 - u); f.s.scale.set((e * f.r) / 160 * 1.1 + 0.02); f.s.alpha = (1 - u) * 0.7; break; }
        case 'bit': f.s.x += f.vx * dt; f.s.y += f.vy * dt; f.vx *= 1 - dt * 2; f.vy = f.vy * (1 - dt * 2) - 20 * dt; f.s.alpha = 1 - u; break;
        case 'spark': f.s.scale.set(f.k * (0.3 + Math.sin(u * Math.PI) * 0.9) * 0.9); f.s.rotation = u * 1.6; f.s.alpha = 1 - u * u; break;
        case 'text': f.s.y -= 48 * this.S * dt; f.s.alpha = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.6) / 0.4); f.s.scale.set(1 + Math.sin(Math.min(1, u * 5) * Math.PI) * 0.18); break;
        default: break;
      }
    }
  }

  destroy() {
    this.token++;
    try { if (this.bgSprite && this.bgSprite.texture !== Texture.EMPTY) this.bgSprite.texture.destroy(true); } catch (e) { /* noop */ }
    try { this.root.destroy({ children: true }); } catch (e) { /* noop */ }
    this.bank.destroy();
  }
}
