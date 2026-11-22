// The interactive aquarium: independent swimmers, schools, dragging, feeding, bubbles, ripples.
import { Application, Sprite } from "pixi.js";
import { Reef } from "./reef.js";
import { SPECIES_BY_ID } from "../data/species.js";
import { WORLDS_BY_ID } from "../data/worlds.js";
import { schoolForces, wallForce, angleDiff, TAU } from "./steering.js";
import { clamp, rand, randInt, toInt } from "../lib/rng.js";

const SIZE_K = 1.3;
const BANDS = {
  fish: [0.1, 0.82],
  seahorse: [0.42, 0.85],
  turtle: [0.16, 0.62],
  ray: [0.12, 0.5],
  whale: [0.1, 0.34],
  jelly: [0.1, 0.72],
};
const MOBILE_KINDS = new Set([
  "fish",
  "seahorse",
  "turtle",
  "ray",
  "whale",
  "jelly",
]);

export class Aquarium {
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = opts;
    this.creatures = [];
    this.groups = [];
    this.food = [];
    this.feedMode = false;
    this.destroyed = false;
    this.ready = false;
    this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.drag = null;
    this.t = 0;
    this.rareTimer = -1;
    this.rareSp = null;
    this.buildToken = 0;
  }

  /* ───────── Lifecycle ───────── */
  async init() {
    const { host, opts } = this;
    const app = new Application();
    const w = host.clientWidth || window.innerWidth,
      h = host.clientHeight || window.innerHeight;
    await app.init({
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(
        window.devicePixelRatio || 1,
        opts.quality === "low" ? 1 : 2,
      ),
      powerPreference: "high-performance",
    });
    if (this.destroyed) {
      app.destroy({ removeView: true }, { children: true });
      return;
    }
    this.app = app;
    host.appendChild(app.canvas);
    app.canvas.style.touchAction = "none";
    app.canvas.style.display = "block";
    app.canvas.setAttribute("role", "img");
    app.canvas.setAttribute("aria-label", "Interactive underwater aquarium");

    this.reef = new Reef(app, { calm: opts.calm, quality: opts.quality });
    this.W = w;
    this.H = h;

    this.onDown = (e) => this.pointerDown(e);
    this.onMove = (e) => this.pointerMove(e);
    this.onUp = (e) => this.pointerUp(e);
    app.canvas.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    this.ro = new ResizeObserver(() => {
      clearTimeout(this.rzT);
      this.rzT = setTimeout(() => this.resize(), 120);
    });
    this.ro.observe(host);

    app.ticker.add((tk) => this.update(Math.min(tk.deltaMS / 1000, 0.05)));
    await this.setWorld(opts.worldId || "coral");
  }

  destroy() {
    this.destroyed = true;
    this.buildToken++;
    clearTimeout(this.rzT);
    if (this.ro) this.ro.disconnect();
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    if (this.app) {
      this.app.canvas.removeEventListener("pointerdown", this.onDown);
      try {
        this.app.ticker.stop();
      } catch (e) {
        /* noop */
      }
      try {
        this.reef.destroy();
      } catch (e) {
        /* noop */
      }
      try {
        this.app.destroy({ removeView: true }, { children: true });
      } catch (e) {
        /* noop */
      }
    }
  }

  setOptions(o) {
    Object.assign(this.opts, o);
  }
  setFeedMode(v) {
    this.feedMode = !!v;
  }

  /* ───────── World ───────── */
  async setWorld(id) {
    const world = WORLDS_BY_ID[id] || WORLDS_BY_ID.coral;
    const token = ++this.buildToken;
    this.ready = false;
    const ok = await this.reef.build(world, this.W, this.H);
    if (!ok || this.destroyed || token !== this.buildToken) return;
    this.world = world;
    for (const c of this.creatures) c.s.destroy();
    this.creatures = [];
    this.groups = [];
    this.food = [];
    await this.populate(world, token);
    if (this.destroyed || token !== this.buildToken) return;
    this.ready = true;
    this.opts.onReady?.();
  }

  async populate(world, token) {
    const bank = this.reef.bank;
    const need = new Set(world.spawn.map((e) => e.id));
    need.add("silver-sardine");
    const texes = {};
    await Promise.all(
      [...need].map(async (id) => {
        texes[id] = await bank.species(SPECIES_BY_ID[id]);
      }),
    );
    if (this.destroyed || token !== this.buildToken) return;
    this.texes = texes;
    const { W, H } = this;
    this.rareSp = null;
    this.rareTimer = -1;
    this.jellyVariantIndex = 0;

    for (const e of world.spawn) {
      const sp = SPECIES_BY_ID[e.id];
      if (e.rare) {
        this.rareSp = sp;
        this.rareTimer = rand(14, 30);
        continue;
      }
      for (let i = 0; i < e.count; i++) {
        if (sp.school) {
          const n = randInt(sp.school[0], sp.school[1]);
          const g = { members: [], gx: 0, gy: 0, t: 0, panic: 0, px: 0, py: 0 };
          const cx = rand(0.15, 0.85) * W,
            cy = rand(0.2, 0.7) * H;
          const depth = rand(0.8, 1.1);
          this.pickGoal(g, sp);
          for (let k = 0; k < n; k++)
            this.addCreature(sp, {
              x: cx + rand(-60, 60),
              y: cy + rand(-40, 40),
              group: g,
              depth: depth * rand(0.94, 1.06),
            });
          this.groups.push(g);
        } else {
          this.addCreature(sp, {
            x: rand(0.08, 0.92) * W,
            y: rand(0.15, 0.75) * H,
          });
        }
      }
    }

    // Distant silhouette schools — subtle background life.
    const sardine = SPECIES_BY_ID["silver-sardine"];
    const ambientSchools = world.id === "open" ? 1 : 2;
    const ambientSize = world.id === "open" ? 9 : 11;

    for (
      let i = 0;
      i < (this.reef.quality === "low" ? 1 : ambientSchools);
      i++
    ) {
      const g = { members: [], gx: 0, gy: 0, t: 0, panic: 0 };
      this.pickGoal(g, sardine);

      const cx = rand(0.12, 0.88) * W;
      const cy = rand(0.22, 0.62) * H;

      for (let k = 0; k < ambientSize; k++) {
        this.addCreature(sardine, {
          x: cx + rand(-105, 105),
          y: cy + rand(-55, 55),
          group: g,
          depth: 0.34,
          ambient: true,
        });
      }

      this.groups.push(g);
    }
  }

  /* ───────── Creatures ───────── */
  addCreature(
    sp,
    { x, y, group = null, depth, ambient = false, fadeIn = false },
  ) {
    const tex = this.texes[sp.id];
    const s = new Sprite(tex);
    const kind = sp.kind;
    const ay = kind === "jelly" ? 0.3 : 0.5;
    s.anchor.set(0.5, ay);

    if (kind === "jelly") {
      const jellyColors = [
        0x8ffff0, // Aqua
        0xd7b8ff, // Lavender
        0xffb3d6, // Blush pink
      ];

      s.tint = jellyColors[this.jellyVariantIndex % jellyColors.length];

      this.jellyVariantIndex++;
    }
    depth = depth ?? rand(0.8, 1.15);
    const c = {
      sp,
      kind,
      s,
      x,
      y,
      vx: 0,
      vy: 0,
      sizeVariation: kind === "jelly" ? rand(0.72, 1.32) : 1,
      heading:
        Math.random() < 0.5 ? rand(-0.4, 0.4) : Math.PI + rand(-0.4, 0.4),
      speed: 0,
      depth,
      group,
      ambient,
      ay,
      facing: 1,
      tilt: 0,
      phase: rand(0, TAU),
      ph2: rand(0, TAU),
      dragging: false,
      pause: 0,
      scatter: 0,
      fleeX: 0,
      fleeY: 0,
      fed: 0,
      eatPulse: 0,
      puff: 0,
      free: 0,
      dart: rand(4, 12),
      dartT: 0,
      boost: 0,
      hopeY: 0,
      agility: rand(0.8, 1.3),
      life: Infinity,
      fade: fadeIn ? 0 : 1,
    };
    c.s.zIndex = depth * 100 + (kind === "whale" ? -50 : 0);
    if (ambient) {
      s.tint = toInt("#2A6FA8");
      s.alpha = 0.34;
      s.zIndex = 0;
      this.reef.back.addChild(s);
    } else {
      if (depth < 0.9) s.tint = 0xcfe3f7;
      this.reef.creatures.addChild(s);
    }
    this.sizeCreature(c);
    c.s.position.set(x, y);
    c.speed = this.baseSpeed(c);
    if (group) group.members.push(c);
    this.creatures.push(c);
    if (fadeIn) s.alpha = 0;
    return c;
  }

  sizeCreature(c) {
    const S = this.reef.S,
      tex = c.s.texture;
    const base = c.sp.size * SIZE_K * S * c.depth * c.sizeVariation;
    c.k = c.kind === "seahorse" ? (base * 1.7) / tex.height : base / tex.width;
    c.cw = tex.width * c.k;
    c.ch = tex.height * c.k;
    c.s.scale.set(c.k * c.facing, c.k);
  }

  baseSpeed(c) {
    return (
      c.sp.speed *
      this.reef.S *
      (0.75 + 0.25 * c.depth) *
      (c.ambient ? 0.7 : 1) *
      SIZE_K *
      0.85
    );
  }

  box(c) {
    const [a, b] = c.ambient ? [0.12, 0.7] : BANDS[c.kind] || BANDS.fish;
    const S = this.reef.S;
    return {
      x0: 0,
      x1: this.W,
      y0: this.H * a,
      y1: this.H * b,
      margin: (c.kind === "whale" ? 220 : 90) * S,
    };
  }

  pickGoal(g, sp) {
    const [a, b] = BANDS[sp.kind] || BANDS.fish;
    g.gx = rand(0.1, 0.9) * (this.W || 1000);
    g.gy = rand(a + 0.05, b - 0.05) * (this.H || 700);
    g.t = rand(5, 10);
  }

  /* ───────── Per-frame ───────── */
  update(dt) {
    if (!this.ready) return;
    this.t += dt;
    const t = this.t;
    // parallax pointer
    const p = this.pointer;
    if (this.opts.interactive === false || !p.active) {
      p.tx = 0.5 + Math.sin(t * 0.07) * 0.18;
      p.ty = 0.5;
    }
    p.x += (p.tx - p.x) * Math.min(1, dt * 1.5);
    this.reef.update(dt, t, p.x, p.y);

    for (const g of this.groups) {
      g.t -= dt;
      if (g.panic > 0) g.panic -= dt;
      if (g.t <= 0 && g.members.length) this.pickGoal(g, g.members[0].sp);
    }
    this.updateFood(dt);
    this.updateRare(dt);

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      c.life -= dt;
      if (c.life < 0) {
        c.fade = Math.max(0, c.fade - dt * 0.6);
        if (c.fade <= 0) {
          this.removeCreature(c, i);
          continue;
        }
      } else if (c.fade < 1) c.fade = Math.min(1, c.fade + dt * 0.8);
      if (c.kind === "jelly") this.updateJelly(c, dt, t);
      else this.updateSwimmer(c, dt, t);
      this.render(c, dt, t);
    }
  }

  removeCreature(c, i) {
    if (c.group) {
      const k = c.group.members.indexOf(c);
      if (k >= 0) c.group.members.splice(k, 1);
    }
    c.s.destroy();
    this.creatures.splice(i, 1);
  }

  nearestFood(c, range) {
    let best = null,
      bd = range * range;
    for (const f of this.food) {
      const dx = f.x - c.x,
        dy = f.y - c.y,
        d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  updateSwimmer(c, dt, t) {
    const S = this.reef.S;
    if (c.dragging) {
      const d = this.drag;
      const tx = d.px + d.ox,
        ty = d.py + d.oy;
      const nx = c.x + (tx - c.x) * Math.min(1, dt * 20),
        ny = c.y + (ty - c.y) * Math.min(1, dt * 20);
      c.vx = c.vx * 0.6 + ((nx - c.x) / dt) * 0.4;
      c.vy = c.vy * 0.6 + ((ny - c.y) / dt) * 0.4;
      c.x = nx;
      c.y = ny;
      c.phase += dt * 14;
      return;
    }
    const base = this.baseSpeed(c);
    if (c.pause > 0) {
      c.pause -= dt;
      c.speed *= 1 - Math.min(1, dt * 7);
      c.phase += dt * 9;
    } else {
      let sx = Math.cos(c.heading),
        sy = Math.sin(c.heading);
      const w = wallForce(c.x, c.y, this.box(c));
      sx += w.fx * 2.4;
      sy += w.fy * 2.4;
      const gk = c.free > 0 ? 0.3 : 1;
      if (c.group) {
        const g = c.group;
        const f = schoolForces(c, g.members, c.cw * 0.95);
        sx += (f.cx * 1.0 + f.ax * 0.9 + f.sx * 2.4) * gk;
        sy += (f.cy * 1.0 + f.ay * 0.9 + f.sy * 2.4) * gk;
        const gx = g.gx - c.x,
          gy = g.gy - c.y,
          gl = Math.hypot(gx, gy) || 1;
        sx += (gx / gl) * 0.55 * gk;
        sy += (gy / gl) * 0.55 * gk;
        if (g.panic > 0 && !c.ambient) {
          const ax = c.x - g.px,
            ay = c.y - g.py,
            al = Math.hypot(ax, ay) || 1;
          sx += (ax / al) * 3 * Math.min(1, g.panic);
          sy += (ay / al) * 3 * Math.min(1, g.panic);
        }
      } else {
        // smooth, natural wandering
        const nz =
          Math.sin(t * 0.32 * c.agility + c.phase) * 0.7 +
          Math.sin(t * 0.71 + c.ph2) * 0.3;

        c.heading += nz * 0.16 * c.agility * dt;
      }
      let spd = base;
      if (c.scatter > 0) {
        c.scatter -= dt;
        sx += c.fleeX * 3.6;
        sy += c.fleeY * 3.6;
        spd *= 2.2;
      }
      if (c.free > 0) c.free -= dt;
      if (c.fed > 0) c.fed -= dt;
      else if (
        !c.ambient &&
        this.food.length &&
        c.kind !== "whale" &&
        c.kind !== "ray"
      ) {
        const f = this.nearestFood(c, 340 * S);
        if (f) {
          const fx = f.x - c.x,
            fy = f.y - c.y,
            fl = Math.hypot(fx, fy) || 1;
          sx += (fx / fl) * 3.2;
          sy += (fy / fl) * 3.2;
          spd *= 1.5;
          if (fl < Math.max(14 * S, c.cw * 0.32)) this.eat(c, f);
        }
      }
      // occasional darts for solo fish
      if (!c.group && c.kind === "fish") {
        c.dart -= dt;
        if (c.dart <= 0) {
          c.dartT = 0.55;
          c.dart = rand(6, 14);
        }
      }
      if (c.dartT > 0) {
        c.dartT -= dt;
        spd *= 1.7;
      }
      if (c.boost > 0) {
        c.boost -= dt;
        spd *= 1.8;
      }

      const desired = Math.atan2(sy, sx);
      const turn =
        c.kind === "whale"
          ? 0.5
          : c.kind === "turtle" || c.kind === "ray"
            ? 0.9
            : c.kind === "seahorse"
              ? 1.6
              : 1.8;
      c.heading += angleDiff(c.heading, desired) * Math.min(1, turn * dt);
      c.speed += (spd - c.speed) * Math.min(1, dt * 1.6);
      c.phase += dt * (3 + (c.speed * 0.045) / S);
    }
    let vx = Math.cos(c.heading) * c.speed,
      vy = Math.sin(c.heading) * c.speed;
    if (c.kind !== "turtle" && c.kind !== "ray")
      vy = clamp(vy, -0.55 * Math.abs(c.speed), 0.55 * Math.abs(c.speed));
    c.vx += (vx - c.vx) * Math.min(1, dt * 3.5);
    c.vy += (vy - c.vy) * Math.min(1, dt * 3.5);
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.kind === "seahorse") c.y += Math.sin(t * 1.6 + c.ph2) * 7 * S * dt;
    // hard safety margins so nothing is ever lost off-screen
    c.x = clamp(c.x, -c.cw * 0.4, this.W + c.cw * 0.4);
    c.y = clamp(c.y, this.H * 0.02, this.H * 0.93);
  }

  updateJelly(c, dt, t) {
    const S = this.reef.S;
    if (c.dragging) {
      this.updateSwimmer(c, dt, t);
      return;
    }
    c.phase += dt * (c.boost > 0 ? 5.2 : 3.4);
    const thrust = Math.max(0, Math.cos(c.phase));
    let ty = 7 * S - thrust * (c.boost > 0 ? 70 : 30) * S;
    if (c.y < this.H * 0.12) ty += 24 * S;
    if (c.y > this.H * 0.72) ty -= 22 * S;
    if (c.boost > 0) c.boost -= dt;
    const drift =
      Math.sin(t * 0.17 + c.ph2) * 16 * S +
      (c.scatter > 0 ? c.fleeX * 80 * S : 0);
    c.scatter = Math.max(0, c.scatter - dt);
    let tx = drift;
    if (c.x < 80 * S) tx += 30 * S;
    if (c.x > this.W - 80 * S) tx -= 30 * S;
    c.vx += (tx - c.vx) * Math.min(1, dt * 1.5);
    c.vy += (ty - c.vy) * Math.min(1, dt * 2.2);
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }

  render(c, dt, t) {
    const s = c.s;
    s.position.set(c.x, c.y);
    s.alpha = c.ambient ? 0.34 * c.fade : c.fade;
    let sx = 1,
      sy = 1;
    if (c.eatPulse > 0) {
      c.eatPulse -= dt;
      const e = Math.sin((c.eatPulse / 0.35) * Math.PI);
      sx += e * 0.12;
      sy -= e * 0.1;
    }
    c.puff += ((c.puffT || 0) - c.puff) * Math.min(1, dt * 6);
    if (c.puffT && (c.puffUntil -= dt) < 0) c.puffT = 0;
    const pf = 1 + c.puff * 0.42;
    const lift = c.dragging ? 1.12 : 1;

    switch (c.kind) {
      case "jelly": {
        const pl = Math.sin(c.phase);
        s.scale.set(c.k * (1 + 0.08 * pl) * lift, c.k * (1 - 0.12 * pl) * lift);
        s.rotation =
          clamp(c.vx * 0.004, -0.2, 0.2) + (c.dragging ? c.vx * 0.0006 : 0);
        s.skew.x = Math.sin(t * 0.9 + c.ph2) * 0.05;
        break;
      }
      case "turtle":
      case "ray": {
        const target = c.dragging ? Math.atan2(c.vy, c.vx || 1) : c.heading;
        c.tilt += angleDiff(c.tilt, target) * Math.min(1, dt * 4);
        s.rotation = c.tilt;
        const fl =
          1 + Math.sin(c.phase * 0.55) * (c.kind === "ray" ? 0.05 : 0.035);
        s.scale.set(c.k * lift * sx, c.k * fl * lift * sy);
        break;
      }
      default: {
        // fish, seahorse, whale — side-on creatures that flip to face travel
        const want =
          Math.abs(c.vx) > 3 ? Math.sign(c.vx) : c.facing >= 0 ? 1 : -1;
        c.facing +=
          (want - c.facing) * Math.min(1, dt * (c.kind === "whale" ? 2 : 8));
        if (c.kind === "seahorse") {
          s.rotation = Math.sin(t * 1.1 + c.ph2) * 0.09 + c.vy * 0.0015;
        } else {
          const tiltT = clamp(
            Math.atan2(c.vy, Math.abs(c.vx) + 20),
            -0.18,
            0.18,
          );
          c.tilt += (tiltT - c.tilt) * Math.min(1, dt * 5);
          s.rotation =
            c.tilt *
            (c.facing >= 0 ? 1 : -1) *
            Math.min(1, Math.abs(c.facing) * 2);
        }
        const wig = Math.sin(c.phase * 2);
        s.skew.y =
          c.kind === "whale"
            ? wig * 0.015
            : wig * 0.07 * (c.pause > 0 ? 1.6 : 1) * c.facing;
        s.scale.set(
          c.k * c.facing * pf * lift * sx * (1 + wig * 0.012),
          c.k * pf * lift * sy,
        );
      }
    }
  }

  /* ───────── Food ───────── */
  dropFood(x, y, n = 4) {
    if (this.food.length > 45) return;
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.reef.tex.pellet);
      s.anchor.set(0.5);
      s.scale.set((0.38 + Math.random() * 0.18) * this.reef.S);
      const f = {
        s,
        x: x + rand(-22, 22),
        y: y + rand(-12, 8),
        vy: rand(22, 34) * this.reef.S,
        ph: Math.random() * 6.28,
        life: 0,
        floor: false,
      };
      this.reef.fx.addChild(s);
      this.food.push(f);
    }
    this.reef.ripple(x, y, 0.45);
    this.opts.sound?.("plop");
  }
  updateFood(dt) {
    const floorY = this.H * 0.93;
    for (let i = this.food.length - 1; i >= 0; i--) {
      const f = this.food[i];
      f.life += dt;
      if (!f.floor) {
        f.y += f.vy * dt;
        f.x += Math.sin(f.life * 2 + f.ph) * 8 * dt;
        if (f.y >= floorY) f.floor = true;
      }
      f.s.position.set(f.x, f.y);
      if (f.floor) f.s.alpha = Math.max(0, 1 - (f.life - 8) / 3);
      if (f.life > 12 || f.s.alpha <= 0) {
        f.s.destroy();
        this.food.splice(i, 1);
      }
    }
  }
  eat(c, f) {
    const i = this.food.indexOf(f);
    if (i < 0) return;
    f.s.destroy();
    this.food.splice(i, 1);
    c.fed = 3.2;
    c.eatPulse = 0.35;
    this.reef.burst(f.x, f.y, { n: 4, color: 0xf6d58a, speed: 40, size: 0.4 });
    this.reef.spawnBubbleBurst(f.x, f.y, 1);
    this.opts.sound?.("nibble");
    this.opts.onInteract?.(c.sp.id, "feed", f.x, f.y);
  }
  feedRandom() {
    this.dropFood(rand(0.2, 0.8) * this.W, this.H * 0.08, 5);
  }

  /* ───────── Rare visitors ───────── */
  updateRare(dt) {
    if (!this.rareSp) return;
    if (this.rareTimer > 0) {
      this.rareTimer -= dt;
      if (this.rareTimer <= 0) {
        const left = Math.random() < 0.5;
        const c = this.addCreature(this.rareSp, {
          x: left ? -80 : this.W + 80,
          y: rand(0.25, 0.55) * this.H,
          depth: 1.05,
          fadeIn: true,
        });
        c.heading = left ? 0 : Math.PI;
        c.life = 45;
        this.rareC = c;
        this.opts.onRare?.(this.rareSp.id);
      }
    } else if (this.rareC && !this.creatures.includes(this.rareC)) {
      this.rareC = null;
      this.rareTimer = rand(25, 50);
    }
    if (this.rareC && Math.random() < dt * 5)
      this.reef.sparkle(
        this.rareC.x + rand(-30, 30),
        this.rareC.y + rand(-20, 20),
        0.5,
      );
  }

  /* ───────── Input ───────── */
  local(e) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hitCreature(x, y) {
    let best = null;
    for (const c of this.creatures) {
      if (c.ambient || c.fade < 0.5) continue;
      const cy = c.y + (0.5 - c.ay) * c.ch;
      const pad = Math.max(10, 34 - c.cw * 0.25);
      const rx = (c.kind === "seahorse" ? c.cw * 0.5 : c.cw * 0.5) + pad,
        ry = (c.kind === "seahorse" ? c.ch * 0.5 : c.ch * 0.42) + pad;
      const dx = (x - c.x) / rx,
        dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && (!best || c.s.zIndex > best.s.zIndex))
        best = c;
    }
    return best;
  }

  pointerDown(e) {
    if (!this.ready || this.opts.interactive === false) return;
    const { x, y } = this.local(e);
    this.opts.onFirstGesture?.();
    this.pointer.active = true;
    this.pointer.tx = x / this.W;
    this.pointer.ty = y / this.H;
    if (this.reef.popBubbleAt(x, y)) {
      this.opts.sound?.("pop");
      return;
    }
    const c = this.hitCreature(x, y);
    if (c) {
      try {
        this.app.canvas.setPointerCapture?.(e.pointerId);
      } catch (err) {
        /* noop */
      }
      c.dragging = true;
      c.pause = 0;
      this.drag = {
        c,
        px: x,
        py: y,
        ox: c.x - x,
        oy: c.y - y,
        sx: x,
        sy: y,
        t0: performance.now(),
        id: e.pointerId,
      };
      return;
    }
    const p = this.reef.hitProp(x, y);
    if (p) {
      this.touchProp(p, x, y);
      return;
    }
    if (this.feedMode) this.dropFood(x, Math.min(y, this.H * 0.5), 4);
    else {
      this.reef.ripple(x, y, 1);
      this.scare(x, y, 170 * this.reef.S);
      this.opts.sound?.("splash");
    }
  }

  pointerMove(e) {
    if (!this.app) return;
    const { x, y } = this.local(e);
    this.pointer.active = true;
    this.pointer.tx = clamp(x / this.W, 0, 1);
    this.pointer.ty = clamp(y / this.H, 0, 1);
    if (this.drag) {
      this.drag.px = clamp(x, 0, this.W);
      this.drag.py = clamp(y, this.H * 0.04, this.H * 0.92);
    }
  }

  pointerUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const c = d.c;
    c.dragging = false;
    const moved = Math.hypot(d.px - d.sx, d.py - d.sy),
      dur = performance.now() - d.t0;
    const S = this.reef.S;
    if (moved < 9 && dur < 400) {
      this.tapCreature(c);
    } else {
      // released: swim away from where it was let go, never snap back
      const sp = Math.hypot(c.vx, c.vy);
      const away =
        sp > 140
          ? Math.atan2(c.vy, c.vx)
          : Math.random() < 0.5
            ? rand(-0.5, 0.5)
            : Math.PI + rand(-0.5, 0.5);
      c.heading = away;
      c.speed = Math.max(this.baseSpeed(c) * 1.8, Math.min(sp, 520 * S));
      c.free = 2.4;
      c.scatter = 0;
      if (c.kind === "jelly") c.boost = 1.2;
      this.reef.ripple(c.x, c.y, 0.7);
      this.reef.spawnBubbleBurst(c.x, c.y, 3);
      this.opts.sound?.("splash");
      this.opts.onInteract?.(c.sp.id, "drag", c.x, c.y);
    }
  }

  tapCreature(c) {
    const S = this.reef.S;
    this.reef.sparkle(c.x, c.y, 0.55);
    this.reef.ripple(c.x, c.y, 0.5);
    this.opts.onInteract?.(c.sp.id, "tap", c.x, c.y);
    switch (c.kind) {
      case "jelly":
        c.boost = 1.6;
        this.opts.sound?.("bloop");
        break;
      case "turtle":
      case "whale":
      case "ray":
        c.pause = 0.6;
        this.opts.sound?.("bloop");
        break;
      default:
        c.pause = 1.15;
        if (c.sp.id === "pufferfish") {
          c.puffT = 1;
          c.puffUntil = 2.4;
          this.opts.sound?.("puff");
        } else this.opts.sound?.("bloop");
        this.reef.spawnBubbleBurst(c.x + c.facing * c.cw * 0.4, c.y, 2);
    }
    if (c.group) this.panicGroup(c.group, c.x, c.y, 0.5);
  }

  touchProp(p, x, y) {
    this.reef.ripple(p.x, p.y - p.h * 0.3, 0.6);
    if (p.kind === "anemone") {
      this.reef.retractAnemone(p);
      this.reef.burst(p.x, p.y - p.h * 0.5, {
        n: 6,
        color: p.sp.art.fin ? toInt(p.sp.art.fin) : 0xff8e83,
        speed: 50,
      });
      this.opts.sound?.("bloop");
      this.opts.onInteract?.(p.sp.id, "tap", p.x, p.y);
    } else if (p.kind === "shell") {
      if (!p.open) {
        this.reef.openShell(p);
        this.reef.sparkle(p.x, p.y - p.h * 0.4, 0.8);
        this.opts.sound?.("chime");
        this.opts.onInteract?.(p.sp.id, "open", p.x, p.y);
      } else {
        this.reef.sparkle(p.pearl.x, p.pearl.y, 1.2);
        this.reef.burst(p.pearl.x, p.pearl.y, {
          n: 12,
          color: 0xf4f4ec,
          speed: 110,
        });
        this.opts.sound?.("chime");
        this.opts.onPearl?.();
        this.reef.closeShell(p);
      }
    }
  }

  scare(x, y, radius) {
    for (const c of this.creatures) {
      if (c.ambient || c.dragging || c.kind === "whale") continue;
      const dx = c.x - x,
        dy = c.y - y,
        d = Math.hypot(dx, dy);
      if (d < radius + c.cw * 0.4) {
        c.scatter = 0.9 + Math.random() * 0.5;
        c.pause = 0;
        c.fleeX = dx / (d || 1);
        c.fleeY = dy / (d || 1);
        if (c.group) this.panicGroup(c.group, x, y, 1);
      }
    }
  }
  panicGroup(g, x, y, k) {
    g.panic = 1.1 * k;
    g.px = x;
    g.py = y;
  }

  /* ───────── Resize ───────── */
  resize() {
    if (this.destroyed || !this.app) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h || (w === this.W && h === this.H)) return;
    this.W = w;
    this.H = h;
    this.app.renderer.resize(w, h);
    this.reef.layout(w, h);
    for (const c of this.creatures) this.sizeCreature(c);
    for (const g of this.groups)
      if (g.members[0]) this.pickGoal(g, g.members[0].sp);
  }
}
