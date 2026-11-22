// Procedural scenery — every coral, rock, ruin and light texture in AQUARIA is generated in code,
// so the project ships with zero binary art assets. SVG strings are pure (Node-testable);
// the canvas helpers at the bottom only run in the browser.
import { mulberry32, mix, rgba } from '../lib/rng.js';

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
const f = (n) => n.toFixed(1);

/* ───────────── Corals ───────────── */

export function branchCoralSVG(color, seed = 1) {
  const r = mulberry32(seed * 97 + 3);
  const dk = mix(color, '#1a0f3a', 0.5), lt = mix(color, '#ffffff', 0.4);
  let out = '';
  const grow = (x, y, a, len, w, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const bend = (r() - 0.5) * len * 0.5;
    const mx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, my = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
    const col = mix(dk, lt, 1 - d / 4);
    out += `<path d="M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"/>`;
    if (d <= 0) {
      out += `<circle cx="${f(x2)}" cy="${f(y2)}" r="${f(w * 0.75)}" fill="${lt}"/>`;
      return;
    }
    const kids = d > 2 ? 2 : r() < 0.5 ? 2 : 3;
    for (let i = 0; i < kids; i++) {
      const spread = (i - (kids - 1) / 2) * (0.55 + r() * 0.25);
      grow(x2, y2, a + spread + (r() - 0.5) * 0.2, len * (0.7 + r() * 0.12), w * 0.72, d - 1);
    }
  };
  grow(100, 238, -Math.PI / 2, 52, 13, 4);
  return svg(200, 240, out);
}

export function fanCoralSVG(color, seed = 1) {
  const r = mulberry32(seed * 53 + 9);
  const dk = mix(color, '#1a0f3a', 0.4), lt = mix(color, '#ffffff', 0.3);
  let ribs = '', mesh = '';
  const n = 17;
  for (let i = 0; i < n; i++) {
    const a = (-170 + (i / (n - 1)) * 160) * (Math.PI / 180);
    const len = 150 + r() * 28;
    const ex = 100 + Math.cos(a) * len, ey = 232 + Math.sin(a) * len;
    ribs += `<path d="M100 232 Q${f(100 + Math.cos(a) * len * 0.5 + (r() - 0.5) * 14)} ${f(232 + Math.sin(a) * len * 0.5)} ${f(ex)} ${f(ey)}" stroke="${i % 2 ? dk : color}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
  for (let k = 1; k < 6; k++) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (-170 + (i / (n - 1)) * 160) * (Math.PI / 180);
      const rad = k * 28 + 8;
      d += `${i ? 'L' : 'M'}${f(100 + Math.cos(a) * rad)} ${f(232 + Math.sin(a) * rad)} `;
    }
    mesh += `<path d="${d}" stroke="${lt}" stroke-opacity="0.55" stroke-width="1.3" fill="none"/>`;
  }
  return svg(200, 240, `<path d="M96 240 L98 226 L104 226 L106 240Z" fill="${dk}"/>${mesh}${ribs}`);
}

export function brainCoralSVG(color, seed = 1) {
  const r = mulberry32(seed * 31 + 7);
  const dk = mix(color, '#1a0f3a', 0.45), lt = mix(color, '#ffffff', 0.35);
  let lines = '';
  for (let y = 40; y < 104; y += 7) {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 160; x += 10) d += ` Q${x + 5} ${f(y + (r() - 0.5) * 14)} ${x + 10} ${f(y + (r() - 0.5) * 6)}`;
    lines += `<path d="${d}" stroke="${dk}" stroke-opacity="0.55" stroke-width="2.6" fill="none"/>`;
  }
  const dome = 'M8 104 C8 52 44 22 80 22 C116 22 152 52 152 104 Z';
  return svg(160, 110,
    `<clipPath id="bc${seed}"><path d="${dome}"/></clipPath>
     <path d="${dome}" fill="url(#bg${seed})"/><g clip-path="url(#bc${seed})">${lines}</g>
     <path d="M28 66 C40 40 70 30 96 32" stroke="#fff" stroke-opacity="0.35" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<linearGradient id="bg${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset="1" stop-color="${color}"/></linearGradient>`);
}

export function tubeCoralSVG(color, seed = 1) {
  const r = mulberry32(seed * 17 + 11);
  const dk = mix(color, '#1a0f3a', 0.45), lt = mix(color, '#ffffff', 0.35);
  let t = '';
  const xs = [28, 56, 84, 112, 140];
  xs.forEach((x, i) => {
    const h = 70 + r() * 90, w = 20 + r() * 8, top = 200 - h;
    t += `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" rx="${f(w / 2)}" fill="url(#tc${seed})"/>
          <ellipse cx="${x}" cy="${f(top + 2)}" rx="${f(w / 2)}" ry="${f(w / 4)}" fill="${dk}"/>
          <ellipse cx="${x}" cy="${f(top + 3)}" rx="${f(w / 2 - 4)}" ry="${f(w / 5)}" fill="${mix(dk, '#000', 0.4)}"/>
          <path d="M${f(x - w / 2 + 3)} ${f(top + 14)} L${f(x - w / 2 + 3)} ${f(top + h * 0.7)}" stroke="#fff" stroke-opacity="0.3" stroke-width="2.4" stroke-linecap="round"/>`;
  });
  return svg(168, 210, t, `<linearGradient id="tc${seed}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lt}"/><stop offset="0.6" stop-color="${color}"/><stop offset="1" stop-color="${dk}"/></linearGradient>`);
}

export function tableCoralSVG(color, seed = 1) {
  const dk = mix(color, '#1a0f3a', 0.45), lt = mix(color, '#ffffff', 0.4);
  return svg(220, 130, `
    <path d="M100 128 C102 100 104 84 108 70 L120 70 C122 86 124 102 128 128Z" fill="${dk}"/>
    <ellipse cx="112" cy="64" rx="104" ry="24" fill="${dk}"/>
    <ellipse cx="112" cy="58" rx="104" ry="24" fill="url(#tb${seed})"/>
    <ellipse cx="112" cy="58" rx="86" ry="17" fill="none" stroke="${lt}" stroke-opacity="0.55" stroke-width="2"/>
    <ellipse cx="112" cy="58" rx="62" ry="11" fill="none" stroke="${lt}" stroke-opacity="0.45" stroke-width="2"/>
    <ellipse cx="112" cy="58" rx="36" ry="6" fill="none" stroke="${lt}" stroke-opacity="0.4" stroke-width="2"/>`,
    `<radialGradient id="tb${seed}" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="${lt}"/><stop offset="1" stop-color="${color}"/></radialGradient>`);
}

/* ───────────── Rocks & floor ───────────── */

function blobPath(cx, cy, rx, ry, r, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.78 + r() * 0.3;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    if (i === 0) d += `M${f((pts[n - 1][0] + p[0]) / 2)} ${f((pts[n - 1][1] + p[1]) / 2)}`;
    d += ` Q${f(p[0])} ${f(p[1])} ${f(mx)} ${f(my)}`;
  }
  return d + 'Z';
}

export function rockSVG(base, seed = 1, accent = '#C77DFF') {
  const r = mulberry32(seed * 71 + 13);
  const lt = mix(base, '#9fc4ff', 0.35), dk = mix(base, '#04101c', 0.55);
  const path = blobPath(150, 105, 128, 78, r, 10);
  let specks = '';
  for (let i = 0; i < 16; i++) {
    const x = 50 + r() * 200, y = 40 + r() * 80;
    specks += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 3)}" fill="${i % 3 ? mix(accent, base, 0.4) : lt}" opacity="${f(0.25 + r() * 0.3)}"/>`;
  }
  return svg(300, 190, `
    <path d="${path}" fill="url(#rk${seed})"/>
    <path d="${path}" fill="none" stroke="${lt}" stroke-opacity="0.25" stroke-width="2"/>
    ${specks}
    <path d="M60 80 C90 50 150 40 200 56" stroke="${lt}" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M40 150 C100 176 200 176 262 148 L270 190 L30 190Z" fill="${dk}" opacity="0.35"/>`,
    `<linearGradient id="rk${seed}" x1="0.2" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${dk}"/></linearGradient>`);
}

export function floorSVG(sand, sandDark, seed = 1) {
  const r = mulberry32(seed * 19 + 5);
  const W = 1600, H = 240;
  let top = `M0 ${H}`;
  for (let x = 0; x <= W; x += 100) top += ` L${x} ${f(70 + Math.sin(x / 210 + seed) * 22 + r() * 16)}`;
  top += ` L${W} ${H}Z`;
  let ripples = '';
  for (let i = 0; i < 16; i++) {
    const y = 110 + r() * 110, x = r() * W, w = 90 + r() * 200;
    ripples += `<path d="M${f(x)} ${f(y)} q${f(w / 2)} -8 ${f(w)} 0" stroke="#fff" stroke-opacity="${f(0.1 + r() * 0.12)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  let pebbles = '';
  for (let i = 0; i < 36; i++) pebbles += `<ellipse cx="${f(r() * W)}" cy="${f(130 + r() * 100)}" rx="${f(3 + r() * 8)}" ry="${f(2 + r() * 4)}" fill="${sandDark}" opacity="${f(0.25 + r() * 0.35)}"/>`;
  return svg(W, H, `<path d="${top}" fill="url(#fl)"/>${ripples}${pebbles}`,
    `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(sand, '#ffffff', 0.25)}"/><stop offset="0.5" stop-color="${sand}"/><stop offset="1" stop-color="${sandDark}"/></linearGradient>`);
}

/* ───────────── Far-layer silhouettes ───────────── */

function column(x, base, h, w, broken, fill) {
  const top = base - h;
  let s = `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>`;
  if (!broken) s += `<rect x="${x - w * 0.8}" y="${top - 10}" width="${w * 1.6}" height="10" fill="${fill}"/><rect x="${x - w * 0.7}" y="${top - 16}" width="${w * 1.4}" height="6" fill="${fill}"/>`;
  else s += `<path d="M${x - w / 2} ${top} l${w * 0.3} -10 l${w * 0.3} 8 l${w * 0.4} -6 v8Z" fill="${fill}"/>`;
  s += `<rect x="${x - w * 0.75}" y="${base - 8}" width="${w * 1.5}" height="8" fill="${fill}"/>`;
  return s;
}

export function farSVG(kind, colors, seed = 1) {
  const r = mulberry32(seed * 13 + 1);
  const W = 1600, H = 520;
  const c1 = mix(colors.fog, '#ffffff', 0.12), c2 = mix(colors.fog, colors.deep, 0.7);
  const defs = `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
  const fill = 'url(#fg)';
  let b = '';
  if (kind === 'ruins') {
    // temple on the right
    b += `<rect x="1020" y="${H - 22}" width="470" height="22" fill="${fill}"/><rect x="1040" y="${H - 40}" width="430" height="18" fill="${fill}"/>`;
    for (let i = 0; i < 6; i++) b += column(1080 + i * 76, H - 40, 250 - (i === 4 ? 90 : 0) - r() * 14, 30, i === 4, fill);
    b += `<rect x="1050" y="${H - 306}" width="410" height="26" fill="${fill}"/><path d="M1040 ${H - 306} L1255 ${H - 380} L1470 ${H - 306}Z" fill="${fill}" opacity="0.95"/>`;
    // arch on the left
    b += `<rect x="190" y="${H - 20}" width="360" height="20" fill="${fill}"/>`;
    b += `<rect x="220" y="${H - 250}" width="54" height="${230}" fill="${fill}"/><rect x="466" y="${H - 210}" width="54" height="${190}" fill="${fill}"/>`;
    b += `<path d="M220 ${H - 250} C240 ${H - 360} 450 ${H - 380} 520 ${H - 214} L466 ${H - 214} C440 ${H - 300} 300 ${H - 300} 274 ${H - 250}Z" fill="${fill}"/>`;
    // scattered
    for (let i = 0; i < 6; i++) b += column(620 + i * 60 + r() * 20, H, 40 + r() * 110, 22, true, fill);
    b += `<rect x="760" y="${H - 34}" width="120" height="22" rx="6" fill="${fill}" transform="rotate(-9 820 ${H - 24})"/>`;
  } else if (kind === 'kelpfar') {
    for (let i = 0; i < 26; i++) {
      const x = 20 + (i / 26) * W + r() * 30, h = 260 + r() * 250, w = 10 + r() * 12;
      let d = `M${f(x)} ${H}`;
      const steps = 8;
      for (let k = 1; k <= steps; k++) d += ` Q${f(x + (k % 2 ? 26 : -26) * r())} ${f(H - (h * (k - 0.5)) / steps)} ${f(x + Math.sin(k + i) * 14)} ${f(H - (h * k) / steps)}`;
      b += `<path d="${d}" stroke="${fill}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"/>`;
    }
  } else if (kind === 'meadow') {
    for (let layer = 0; layer < 3; layer++) {
      let d = `M0 ${H}`;
      for (let x = 0; x <= W; x += 80) d += ` L${x} ${f(H - 90 - layer * 50 - Math.sin(x / 190 + layer * 2) * 40 - r() * 20)}`;
      b += `<path d="${d} L${W} ${H}Z" fill="${fill}" opacity="${0.55 + layer * 0.15}"/>`;
    }
    for (let i = 0; i < 80; i++) {
      const x = r() * W, h = 60 + r() * 90;
      b += `<path d="M${f(x)} ${H} q${f((r() - 0.5) * 30)} ${f(-h / 2)} ${f((r() - 0.5) * 26)} ${f(-h)}" stroke="${fill}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    }
  } else {
    // deep: seamounts
    for (let i = 0; i < 4; i++) {
      const cx = 160 + i * 400 + r() * 100, w = 340 + r() * 220, h = 200 + r() * 200;
      b += `<path d="M${f(cx - w / 2)} ${H} C${f(cx - w / 4)} ${f(H - h * 0.8)} ${f(cx - w / 10)} ${f(H - h)} ${f(cx)} ${f(H - h)} C${f(cx + w / 10)} ${f(H - h)} ${f(cx + w / 4)} ${f(H - h * 0.8)} ${f(cx + w / 2)} ${H}Z" fill="${fill}" opacity="${f(0.6 + r() * 0.3)}"/>`;
    }
  }
  return svg(W, H, b, defs);
}

/* ───────────── Browser canvas generators ───────────── */

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
};

export function makeBackground(w, h, world) {
  const [c, g] = mk(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
  const k = world.colors;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, k.top); grad.addColorStop(0.38, k.mid); grad.addColorStop(0.78, k.bottom); grad.addColorStop(1, k.deep);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.55, -h * 0.1, 0, w * 0.55, -h * 0.1, h * 0.95);
  glow.addColorStop(0, rgba(k.ray, 0.5)); glow.addColorStop(0.5, rgba(k.ray, 0.12)); glow.addColorStop(1, rgba(k.ray, 0));
  g.fillStyle = glow; g.fillRect(0, 0, w, h);
  return c;
}

export function makeRayTexture() {
  const [c, g] = mk(128, 512);
  const v = g.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.55, 'rgba(255,255,255,0.35)'); v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v; g.fillRect(0, 0, 128, 512);
  g.globalCompositeOperation = 'destination-in';
  const hz = g.createLinearGradient(0, 0, 128, 0);
  hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(0.5, 'rgba(0,0,0,1)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hz; g.fillRect(0, 0, 128, 512);
  return c;
}

export function makeCausticTexture(seed = 3) {
  const S = 256, r = mulberry32(seed * 7 + 2);
  const [c, g] = mk(S, S);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.2; g.lineCap = 'round';
  try { g.filter = 'blur(1.4px)'; } catch (e) { /* older Safari */ }
  const TAU = Math.PI * 2;
  for (let i = 0; i < 26; i++) {
    const base = r() * S, a1 = 6 + r() * 14, a2 = 3 + r() * 8;
    const f1 = 1 + Math.floor(r() * 3), f2 = 2 + Math.floor(r() * 4), p1 = r() * TAU, p2 = r() * TAU;
    for (const off of [-S, 0, S]) {
      g.beginPath();
      for (let x = 0; x <= S; x += 4) {
        const y = base + off + a1 * Math.sin((TAU * f1 * x) / S + p1) + a2 * Math.sin((TAU * f2 * x) / S + p2);
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return c;
}

export function makeBubbleTexture() {
  const [c, g] = mk(96, 96);
  const rg = g.createRadialGradient(48, 48, 10, 48, 48, 44);
  rg.addColorStop(0, 'rgba(255,255,255,0.02)'); rg.addColorStop(0.78, 'rgba(184,232,245,0.12)'); rg.addColorStop(1, 'rgba(255,255,255,0.8)');
  g.fillStyle = rg; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.beginPath(); g.arc(48, 48, 43, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(33, 29, 11, 6, -0.7, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(62, 64, 6, 3, -0.7, 0, 7); g.fill();
  return c;
}

export function makeMoteTexture() {
  const [c, g] = mk(48, 48);
  const rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 48, 48);
  return c;
}

export function makeRingTexture() {
  const [c, g] = mk(160, 160);
  const rg = g.createRadialGradient(80, 80, 52, 80, 80, 78);
  rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.72, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 160, 160);
  return c;
}

export function makeSparkTexture() {
  const [c, g] = mk(64, 64);
  g.translate(32, 32);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rad = i % 2 ? 7 : 30;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath(); g.fill();
  return c;
}

export function makePelletTexture() {
  const [c, g] = mk(24, 24);
  const rg = g.createRadialGradient(9, 9, 1, 12, 12, 10);
  rg.addColorStop(0, '#FFF3C9'); rg.addColorStop(0.6, '#F6D58A'); rg.addColorStop(1, '#E0963F');
  g.fillStyle = rg; g.beginPath(); g.arc(12, 12, 9, 0, 7); g.fill();
  return c;
}
