// Fishing Frenzy: arcade net-catching mini-game with rounds, combos, bonus fish and a goal per round.
import { Application, Sprite } from 'pixi.js';
import { Reef } from './reef.js';
import { SPECIES_BY_ID, RARITY, speciesPoints } from '../data/species.js';
import { WORLDS_BY_ID } from '../data/worlds.js';
import { svgToCanvas, netSVG, NET_ANCHOR } from '../lib/art.js';
import { weightedPick } from './steering.js';
import { clamp, rand, randInt } from '../lib/rng.js';

const SIZE_K = 1.3;
export const ROUNDS = 3;
export const ROUND_TIME = 45;
export const GOALS = [600, 1700, 3400];   // cumulative score needed to clear each round
const COMBO_WINDOW = 1.6;

export class Frenzy {
  constructor(host, opts = {}) {
    this.host = host; this.opts = opts;
    this.fish = []; this.catching = [];
    this.destroyed = false; this.ready = false;
    this.state = { status: 'idle', round: 1, score: 0, time: ROUND_TIME, combo: 0, mult: 1, goal: GOALS[0], catches: 0 };
    this.timeLeft = ROUND_TIME; this.comboT = 0; this.spawnT = 0; this.bonusT = rand(12, 18);
    this.net = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, speed: 0, squash: 0, down: false };
    this.t = 0; this.sig = '';
  }

  async init() {
    const { host, opts } = this;
    const app = new Application();
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    await app.init({ width: w, height: h, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, opts.quality === 'low' ? 1 : 2), powerPreference: 'high-performance' });
    if (this.destroyed) { app.destroy({ removeView: true }, { children: true }); return; }
    this.app = app; this.W = w; this.H = h;
    host.appendChild(app.canvas);
    app.canvas.style.touchAction = 'none'; app.canvas.style.display = 'block'; app.canvas.style.cursor = 'none';
    app.canvas.setAttribute('role', 'img'); app.canvas.setAttribute('aria-label', 'Fishing Frenzy game field');
    this.reef = new Reef(app, { calm: opts.calm, quality: opts.quality });

    this.onDown = (e) => this.pointerDown(e);
    this.onMove = (e) => this.pointerMove(e);
    this.onUp = () => { this.net.down = false; };
    app.canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    this.ro = new ResizeObserver(() => { clearTimeout(this.rzT); this.rzT = setTimeout(() => this.resize(), 120); });
    this.ro.observe(host);

    const world = WORLDS_BY_ID[opts.worldId] || WORLDS_BY_ID.coral;
    this.world = world;
    const ok = await this.reef.build(world, w, h);
    if (!ok || this.destroyed) return;
    await this.loadAssets(world);
    if (this.destroyed) return;
    this.net.x = this.net.tx = w * 0.5; this.net.y = this.net.ty = h * 0.55;
    app.ticker.add((tk) => this.update(Math.min(tk.deltaMS / 1000, 0.05)));
    this.ready = true;
    this.emit(true);
    opts.onReady?.();
  }

  async loadAssets(world) {
    const bank = this.reef.bank;
    this.texes = {};
    this.pool = world.frenzy.map((id) => SPECIES_BY_ID[id]);
    const bonusId = world.spawn.find((e) => e.rare)?.id;
    this.bonusSp = bonusId ? SPECIES_BY_ID[bonusId] : [...this.pool].sort((a, b) => RARITY[b.rarity].points - RARITY[a.rarity].points)[0];
    const list = [...new Set([...this.pool, this.bonusSp])];
    await Promise.all(list.map(async (sp) => { this.texes[sp.id] = await bank.species(sp); }));
    const netC = await svgToCanvas(netSVG(), 'net');
    this.netTex = bank.fromCanvas('net', netC);
    this.netS = new Sprite(this.netTex);
    this.netS.anchor.set(NET_ANCHOR.x, NET_ANCHOR.y);
    this.netS.zIndex = 9999;
    this.reef.fx.addChild(this.netS);
    this.sizeNet();
  }

  sizeNet() {
    const S = this.reef.S;
    this.ns = 0.74 * S;
    this.netS.scale.set(this.ns);
    this.hoopRx = NET_ANCHOR.rx * this.ns; this.hoopRy = NET_ANCHOR.ry * this.ns;
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.rzT);
    if (this.ro) this.ro.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    if (this.app) {
      this.app.canvas.removeEventListener('pointerdown', this.onDown);
      try { this.app.ticker.stop(); } catch (e) { /* noop */ }
      try { this.reef.destroy(); } catch (e) { /* noop */ }
      try { this.app.destroy({ removeView: true }, { children: true }); } catch (e) { /* noop */ }
    }
  }

  /* ───────── Game flow ───────── */
  start() {
    this.clearFish();
    this.state = { status: 'playing', round: 1, score: 0, time: ROUND_TIME, combo: 0, mult: 1, goal: GOALS[0], catches: 0 };
    this.timeLeft = ROUND_TIME; this.comboT = 0; this.spawnT = 0; this.bonusT = rand(10, 15);
    this.emit(true);
  }
  nextRound() {
    this.clearFish();
    const round = this.state.round + 1;
    this.state = { ...this.state, status: 'playing', round, time: ROUND_TIME, goal: GOALS[Math.min(round, ROUNDS) - 1], combo: 0, mult: 1 };
    this.timeLeft = ROUND_TIME; this.comboT = 0; this.spawnT = 0; this.bonusT = rand(10, 15);
    this.emit(true);
  }
  pause() { if (this.state.status === 'playing') { this.state.status = 'paused'; this.emit(true); } }
  resume() { if (this.state.status === 'paused') { this.state.status = 'playing'; this.emit(true); } }
  toIdle() { this.clearFish(); this.state = { ...this.state, status: 'idle', combo: 0, mult: 1 }; this.emit(true); }

  endRound() {
    const s = this.state;
    const cleared = s.score >= s.goal;
    if (cleared && s.round < ROUNDS) { s.status = 'roundEnd'; this.opts.sound?.('round'); }
    else { s.status = cleared ? 'won' : 'over'; this.opts.sound?.(cleared ? 'round' : 'over'); this.opts.onGameEnd?.({ score: s.score, round: s.round, won: cleared, catches: s.catches }); }
    this.emit(true);
  }

  emit(force = false) {
    const s = this.state;
    const sig = `${s.status}|${s.round}|${s.score}|${Math.ceil(this.timeLeft)}|${s.combo}|${s.mult}|${s.goal}|${s.catches}`;
    if (!force && sig === this.sig) return;
    this.sig = sig;
    this.opts.onState?.({ ...s, time: Math.max(0, Math.ceil(this.timeLeft)) });
  }

  clearFish() {
    for (const f of [...this.fish, ...this.catching]) { f.s.destroy(); f.aura?.destroy(); }
    this.fish = []; this.catching = [];
  }

  /* ───────── Spawning ───────── */
  spawn(bonus = false) {
    if (this.fish.length > 42) return;
    const { W, H } = this, S = this.reef.S, round = this.state.round;
    const sp = bonus ? this.bonusSp : weightedPick(this.pool, (p) => RARITY[p.rarity].weight);
    const tex = this.texes[sp.id];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = bonus ? 1 : sp.school ? randInt(3, 6) : weightedPick([1, 2, 3], (v) => (v === 1 ? 5 : v === 2 ? 3 : 1));
    const baseY = rand(0.16, 0.76) * H;
    const speed = sp.speed * S * SIZE_K * (1.35 + round * 0.22) * rand(0.9, 1.15) * (bonus ? 1.5 : 1);
    const amp = rand(14, 52) * S, freq = rand(0.8, 1.8), ph = rand(0, 6.28);
    const depth = bonus ? 1.15 : rand(0.85, 1.12);
    for (let i = 0; i < n; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      const base = sp.size * SIZE_K * S * depth * (bonus ? 1.15 : 1);
      const k = sp.kind === 'seahorse' ? (base * 1.7) / tex.height : base / tex.width;
      s.scale.set(k * dir, k);
      s.zIndex = depth * 100;
      this.reef.creatures.addChild(s);
      let aura = null;
      if (bonus) {
        aura = new Sprite(this.reef.tex.mote); aura.anchor.set(0.5); aura.blendMode = 'add'; aura.tint = 0xFFD96A;
        aura.scale.set((tex.width * k * 3.2) / 48); aura.zIndex = depth * 100 - 1;
        this.reef.creatures.addChild(aura);
      }
      this.fish.push({
        sp, s, aura, k, curK: k, dir, speed, bonus, cw: tex.width * k, ch: tex.height * k,
        x: dir > 0 ? -this.cwOf(tex, k) - i * rand(50, 80) * S : W + this.cwOf(tex, k) + i * rand(50, 80) * S,
        y: baseY + rand(-30, 30) * S, baseY: baseY + rand(-24, 24) * S, amp: amp * rand(0.8, 1.2), freq, ph: ph + i * 0.35, puffT: 0, puffCool: 0, wob: rand(0, 6.28),
      });
    }
  }
  cwOf(tex, k) { return tex.width * k; }

  /* ───────── Update ───────── */
  update(dt) {
    if (!this.ready) return;
    this.t += dt;
    const st = this.state, S = this.reef.S;
    const n = this.net;
    this.reef.update(dt, this.t, n.x / this.W, 0.5);

    // Net follows the pointer with a little weight
    const px = n.x, py = n.y;
    n.x += (n.tx - n.x) * Math.min(1, dt * 16); n.y += (n.ty - n.y) * Math.min(1, dt * 16);
    n.vx = (n.x - px) / dt; n.vy = (n.y - py) / dt;
    n.speed = n.speed * 0.7 + Math.hypot(n.vx, n.vy) * 0.3;
    n.squash = Math.max(0, n.squash - dt * 5);
    this.netS.position.set(n.x, n.y);
    this.netS.rotation = clamp(n.vx * 0.0005, -0.4, 0.4);
    const sq = 1 - Math.sin(n.squash * Math.PI) * 0.22;
    this.netS.scale.set(this.ns * (1 + (1 - sq) * 0.5), this.ns * sq);
    if (n.speed > 260 * S && Math.random() < dt * 14) this.reef.spawnBubbleBurst(n.x, n.y, 1);

    const playing = st.status === 'playing';
    const attract = st.status === 'idle' || st.status === 'roundEnd' || st.status === 'over' || st.status === 'won' || st.status === 'paused';

    if (playing) {
      this.timeLeft -= dt;
      this.comboT -= dt;
      if (this.comboT <= 0 && st.combo) { st.combo = 0; st.mult = 1; }
      if (Math.ceil(this.timeLeft) !== this.lastTick && this.timeLeft <= 5 && this.timeLeft > 0) { this.lastTick = Math.ceil(this.timeLeft); this.opts.sound?.('tick'); }
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.endRound(); }
      this.spawnT -= dt; this.bonusT -= dt;
      if (this.spawnT <= 0) { this.spawn(false); this.spawnT = Math.max(0.35, 1.15 - st.round * 0.18) * rand(0.7, 1.2); }
      if (this.bonusT <= 0) { this.spawn(true); this.bonusT = rand(15, 22); }
    } else if (st.status !== 'paused') {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(false); this.spawnT = rand(1.1, 2); }
    }

    if (st.status !== 'paused') this.updateFish(dt, playing);
    this.updateCatching(dt);
    this.emit();
  }

  updateFish(dt, canCatch) {
    const { W } = this, S = this.reef.S, n = this.net;
    const sweeping = n.down || n.speed > 420 * S;
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      f.x += f.dir * f.speed * dt;
      const wave = Math.sin(this.t * f.freq + f.ph);
      f.y = f.baseY + wave * f.amp;
      const vy = Math.cos(this.t * f.freq + f.ph) * f.amp * f.freq;
      f.s.position.set(f.x, f.y);
      f.s.rotation = clamp(Math.atan2(vy, f.speed), -0.5, 0.5) * f.dir;
      f.s.skew.y = Math.sin(this.t * 9 + f.wob) * 0.06 * f.dir;
      if (f.aura) { f.aura.position.set(f.x, f.y); f.aura.alpha = 0.55 + Math.sin(this.t * 5) * 0.2; }

      // Pufferfish inflate when the net gets near — and can't be scooped while puffed.
      if (f.sp.id === 'pufferfish') {
        const near = Math.hypot(f.x - n.x, f.y - n.y) < this.hoopRx * 1.7;
        if (near && f.puffCool <= 0) { f.puffT = 1.3; f.puffCool = 2.5; }
        f.puffCool -= dt; f.puffT -= dt;
        f.curK += (f.k * (1 + (f.puffT > 0 ? 0.45 : 0)) - f.curK) * Math.min(1, dt * 8);
        f.s.scale.set(f.dir * f.curK, f.curK);
      }

      if ((f.dir > 0 && f.x > W + f.cw + 140) || (f.dir < 0 && f.x < -f.cw - 140)) { this.removeFish(f, i); continue; }

      if (canCatch && sweeping && !(f.puffT > 0)) {
        const dx = (f.x - n.x) / (this.hoopRx + f.cw * 0.25), dy = (f.y - n.y) / (this.hoopRy + f.ch * 0.25);
        if (dx * dx + dy * dy <= 1) this.catchFish(f, i);
      }
    }
  }

  removeFish(f, i) { f.s.destroy(); f.aura?.destroy(); this.fish.splice(i, 1); }

  catchFish(f, i) {
    this.fish.splice(i, 1);
    const st = this.state;
    st.combo = this.comboT > 0 ? st.combo + 1 : 1;
    this.comboT = COMBO_WINDOW;
    st.mult = Math.min(6, 1 + Math.floor(st.combo / 3));
    const base = speciesPoints(f.sp) * (f.bonus ? 2 : 1);
    const pts = base * st.mult;
    st.score += pts; st.catches += 1;
    if (f.bonus) this.timeLeft += 4;
    this.reef.floatText(f.x, f.y - f.ch * 0.4, `+${pts}`, { color: f.bonus ? '#FFE08A' : st.mult > 1 ? '#FFB8A8' : '#F6D58A', size: f.bonus ? 36 : 28 });
    this.reef.sparkle(f.x, f.y, f.bonus ? 1.6 : 0.9);
    this.reef.burst(f.x, f.y, { n: f.bonus ? 16 : 8, color: f.bonus ? 0xFFE08A : 0xDFF7FF, speed: 120 });
    this.opts.sound?.(st.mult > 1 ? 'combo' : 'catch', Math.min(st.combo, 10));
    this.opts.onCatch?.(f.sp.id, { points: pts, bonus: f.bonus });
    f.caughtT = 0; f.fromX = f.x; f.fromY = f.y;
    this.catching.push(f);
    if (this.state.status === 'playing') this.emit();
  }

  updateCatching(dt) {
    const n = this.net;
    for (let i = this.catching.length - 1; i >= 0; i--) {
      const f = this.catching[i];
      f.caughtT += dt;
      const u = Math.min(1, f.caughtT / 0.38), e = u * u;
      f.x = f.fromX + (n.x - f.fromX) * e; f.y = f.fromY + (n.y - f.fromY) * e;
      f.s.position.set(f.x, f.y);
      f.s.alpha = 1 - e; f.s.rotation += dt * 14;
      const k = f.k * (1 - e * 0.8);
      f.s.scale.set(k * f.dir, k);
      if (f.aura) { f.aura.position.set(f.x, f.y); f.aura.alpha = 1 - u; }
      if (u >= 1) { f.s.destroy(); f.aura?.destroy(); this.catching.splice(i, 1); }
    }
  }

  /* ───────── Input ───────── */
  local(e) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  setTarget(e) {
    const { x, y } = this.local(e);
    const off = e.pointerType === 'touch' ? -78 * this.reef.S : 0;
    this.net.tx = clamp(x, 0, this.W); this.net.ty = clamp(y + off, 0, this.H);
  }
  pointerDown(e) {
    this.opts.onFirstGesture?.();
    this.setTarget(e);
    this.net.down = true; this.net.squash = 1;
    if (e.pointerType === 'touch') { this.net.x = this.net.tx; this.net.y = this.net.ty; }
    this.reef.ripple(this.net.tx, this.net.ty, 0.6);
    if (this.state.status === 'playing') this.opts.sound?.('swoosh');
  }
  pointerMove(e) { if (this.app) this.setTarget(e); }

  resize() {
    if (this.destroyed || !this.app) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h || (w === this.W && h === this.H)) return;
    this.W = w; this.H = h;
    this.app.renderer.resize(w, h);
    this.reef.layout(w, h);
    this.sizeNet();
  }
}
