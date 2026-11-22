// Procedural SVG art for every creature and plant. Nothing here touches the DOM at import
// time, so the generators can be unit-tested in Node; canvas helpers only run in the browser.
import { mulberry32, mix } from './rng.js';

const dark = (c, t = 0.35) => mix(c, '#0b1d2a', t);
const light = (c, t = 0.35) => mix(c, '#ffffff', t);

/* ───────────────────────── Fish ───────────────────────── */

const FISH_SHAPES = {
  oval: {
    body: 'M18 42 C26 18 58 14 84 20 C102 24 112 34 114 42 C112 50 102 60 84 64 C58 70 26 66 18 42Z',
    tail: 'M24 42 L2 22 C8 36 8 48 2 62 Z',
    top: 'M44 19 C54 6 74 6 84 20 Z',
    bottom: 'M52 65 C58 76 70 76 76 63 Z',
    eye: [97, 37, 5],
  },
  tang: {
    body: 'M20 42 C26 12 60 8 86 16 C104 22 114 34 114 44 C112 54 102 64 84 70 C58 78 26 72 20 42Z',
    tail: 'M24 42 L4 16 C10 34 10 50 4 68 Z',
    top: 'M36 15 C52 4 78 4 90 16 Z',
    bottom: 'M40 70 C54 82 78 82 90 68 Z',
    eye: [97, 36, 5.5],
  },
  slender: {
    body: 'M16 42 C30 30 60 28 86 32 C104 35 114 39 116 42 C114 45 104 49 86 52 C60 56 30 54 16 42Z',
    tail: 'M20 42 L0 27 C6 38 6 46 0 57 Z',
    top: 'M54 30 C62 22 74 22 80 32 Z',
    bottom: 'M60 53 C66 60 74 60 78 52 Z',
    eye: [101, 40, 4],
  },
  angel: {
    body: 'M26 42 C40 16 74 14 96 30 C108 36 114 40 114 42 C114 44 108 48 96 54 C74 70 40 68 26 42Z',
    tail: 'M28 42 L8 24 C12 36 12 48 8 60 Z',
    top: 'M48 21 C52 6 72 2 98 4 C86 10 80 18 82 26 Z',
    bottom: 'M48 63 C52 78 72 82 98 80 C86 74 80 66 82 58 Z',
    eye: [98, 38, 4.5],
  },
  puffer: {
    body: 'M30 42 C30 18 58 10 78 14 C102 18 114 30 114 44 C114 58 102 68 78 72 C58 76 30 68 30 42Z',
    tail: 'M34 42 L14 31 C19 39 19 45 14 53 Z',
    top: 'M54 17 C58 9 66 9 70 15 Z',
    bottom: 'M54 70 C58 78 66 78 70 72 Z',
    eye: [97, 36, 6.5],
    extra: (a) => `<path d="M70 46 C60 52 60 62 72 59Z" fill="${a.fin}"/>`,
  },
  disc: {
    body: 'M30 42 C30 14 70 8 94 18 C108 24 112 34 112 42 C112 50 108 60 94 66 C70 76 30 70 30 42Z',
    tail: 'M36 28 C18 30 18 54 36 56 Z',
    top: 'M56 14 C62 -2 76 -2 82 14 Z',
    bottom: 'M56 70 C62 84 76 84 82 70 Z',
    eye: [98, 36, 4],
  },
  torpedo: {
    body: 'M12 42 C22 26 60 20 92 28 C108 32 116 38 118 42 C116 46 108 52 92 56 C60 64 22 58 12 42Z',
    tail: 'M16 42 L0 18 C6 34 6 50 0 66 Z',
    top: 'M50 24 C60 10 74 12 82 26 Z',
    bottom: 'M54 60 C62 72 72 72 78 58 Z',
    eye: [103, 38, 4],
  },
  needle: {
    body: 'M8 42 C30 37 70 37 96 39 C108 39 116 41 119 42 C116 43 108 45 96 45 C70 47 30 47 8 42Z',
    tail: 'M10 42 L0 36 C3 41 3 43 0 48 Z',
    top: 'M60 38 C64 33 72 33 76 38 Z',
    bottom: 'M60 46 C64 51 72 51 76 46 Z',
    eye: [104, 41, 2.6],
  },
};

export function fishSVG(art, id = 'f') {
  const s = FISH_SHAPES[art.shape] || FISH_SHAPES.oval;
  const rng = mulberry32(id.length * 977 + (art.body ? art.body.charCodeAt(2) : 1));
  const body = art.body, belly = art.belly || light(body, 0.35), fin = art.fin || dark(body, 0.15);
  const uid = 'b' + id.replace(/[^a-z0-9]/gi, '');
  let stripes = '';
  switch (art.stripe) {
    case 'bands':
      stripes = `<g fill="${art.stripeColor}" stroke="${art.accent || '#111'}" stroke-width="1.6">
        <rect x="34" y="0" width="9" height="90"/><rect x="60" y="0" width="14" height="90"/><rect x="88" y="0" width="7" height="90"/></g>`;
      break;
    case 'vbars':
      stripes = `<g fill="${art.stripeColor}"><rect x="40" y="0" width="12" height="90"/><rect x="74" y="0" width="14" height="90"/></g>
        <rect x="100" y="0" width="30" height="90" fill="${art.accent || art.stripeColor}" opacity="0.9"/>`;
      break;
    case 'hstripe':
      stripes = `<path d="M16 41 C40 36 80 36 116 41 L116 46 C80 42 40 42 16 47Z" fill="${art.stripeColor}"/>`;
      break;
    case 'spots': {
      let c = '';
      for (let i = 0; i < 12; i++) c += `<circle cx="${(30 + rng() * 70).toFixed(1)}" cy="${(24 + rng() * 38).toFixed(1)}" r="${(1.6 + rng() * 2.4).toFixed(1)}"/>`;
      stripes = `<g fill="${art.stripeColor}" opacity="0.8">${c}</g>`;
      break;
    }
    case 'half':
      stripes = `<rect x="86" y="0" width="40" height="90" fill="${art.stripeColor}"/><rect x="0" y="0" width="26" height="90" fill="${art.stripeColor}"/>`;
      break;
    default:
      break;
  }
  const glow = art.glow ? `<ellipse cx="60" cy="42" rx="58" ry="40" fill="${art.glow}" opacity="0.28"/>` : '';
  const [ex, ey, er] = s.eye;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="168" viewBox="0 0 120 84">
  <defs>
    <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light(body, 0.12)}"/><stop offset="0.5" stop-color="${body}"/><stop offset="1" stop-color="${belly}"/>
    </linearGradient>
    <clipPath id="${uid}c"><path d="${s.body}"/></clipPath>
  </defs>
  ${glow}
  <path d="${s.tail}" fill="${fin}" opacity="0.92"/>
  <path d="${s.top}" fill="${fin}" opacity="0.95"/>
  <path d="${s.bottom}" fill="${fin}" opacity="0.9"/>
  ${s.extra ? s.extra({ fin }) : ''}
  <path d="${s.body}" fill="url(#${uid}g)"/>
  <g clip-path="url(#${uid}c)">${stripes}
    <ellipse cx="62" cy="${art.shape === 'needle' ? 40 : 28}" rx="28" ry="${art.shape === 'needle' ? 1 : 4}" fill="#fff" opacity="0.22"/>
  </g>
  <path d="${s.body}" fill="none" stroke="${dark(body, 0.55)}" stroke-opacity="0.35" stroke-width="1"/>
  <circle cx="${ex}" cy="${ey}" r="${er + 1.4}" fill="#fff"/>
  <circle cx="${ex + 0.8}" cy="${ey}" r="${er * 0.68}" fill="#0f1c26"/>
  <circle cx="${ex + 0.2}" cy="${ey - er * 0.28}" r="${er * 0.24}" fill="#fff"/>
</svg>`;
}

/* ───────────────────────── Seahorse ───────────────────────── */

export function seahorseSVG(a) {
  const body = a.body, belly = a.belly, fin = a.fin, acc = a.accent;
  let rings = '';
  for (let i = 0; i < 7; i++) {
    const y = 52 + i * 6;
    rings += `<path d="M${34 - i * 0.6} ${y} Q42 ${y + 3} ${50 - i * 0.6} ${y}" stroke="${acc}" stroke-opacity="0.55" stroke-width="1.4" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="220" viewBox="0 0 60 110">
  <defs><linearGradient id="shg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${belly}"/><stop offset="0.55" stop-color="${body}"/><stop offset="1" stop-color="${dark(body, 0.2)}"/></linearGradient></defs>
  <path d="M30 44 C20 40 22 22 32 18 C28 12 34 6 42 8 C44 4 50 4 52 8 L58 12 L52 15 C52 24 48 36 44 44 C48 54 48 66 44 78 C42 90 34 100 24 100 C14 100 12 90 18 86 C22 90 28 92 31 84 C34 74 30 60 30 44Z" fill="url(#shg)" stroke="${dark(body, 0.5)}" stroke-opacity="0.4"/>
  <path d="M32 18 C28 10 34 4 40 6 C36 8 36 12 38 14Z" fill="${fin}"/>
  <path d="M22 52 C12 52 10 64 20 70 C26 66 26 58 22 52Z" fill="${fin}" opacity="0.85"/>
  ${rings}
  <circle cx="43" cy="14" r="3.1" fill="#fff"/><circle cx="43.6" cy="14" r="2" fill="#0f1c26"/><circle cx="43" cy="13.2" r="0.7" fill="#fff"/>
  <path d="M30 44 C24 44 22 38 26 34" stroke="${belly}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>
</svg>`;
}

/* ───────────────────────── Turtle (top-down) ───────────────────────── */

const turtleFlipper = (c, d) => `<path d="M0 0 C-6 -10 -2 -34 22 -44 C28 -32 20 -10 0 0Z" fill="${c}" stroke="${d}" stroke-opacity="0.5" stroke-width="1.2"/>`;

export function turtleBodySVG(a) {
  const { body, belly, accent } = a, d = dark(body, 0.45);
  let plates = '';
  const pts = [[70, 60], [100, 60], [130, 60], [85, 86], [115, 86], [85, 34], [115, 34], [100, 60]];
  pts.forEach(([x, y]) => (plates += `<ellipse cx="${x + 6}" cy="${y}" rx="${14}" ry="${12}" fill="${accent}" opacity="0.35"/>`));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 200 120">
  <path d="M42 60 C30 58 20 62 12 68 C22 66 32 66 42 62Z" fill="${body}"/>
  <path d="M60 28 C48 18 38 20 34 28 C44 28 52 32 60 38Z" fill="${body}" stroke="${d}" stroke-opacity="0.5"/>
  <path d="M60 92 C48 102 38 100 34 92 C44 92 52 88 60 82Z" fill="${body}" stroke="${d}" stroke-opacity="0.5"/>
  <ellipse cx="150" cy="60" rx="22" ry="17" fill="${body}" stroke="${d}" stroke-opacity="0.5"/>
  <circle cx="160" cy="54" r="3" fill="#fff"/><circle cx="161" cy="54" r="1.9" fill="#0f1c26"/>
  <circle cx="160" cy="68" r="3" fill="#fff"/><circle cx="161" cy="68" r="1.9" fill="#0f1c26"/>
  <ellipse cx="96" cy="60" rx="58" ry="40" fill="${mix(accent, '#2f2a14', 0.25)}" stroke="${d}" stroke-opacity="0.6" stroke-width="2"/>
  <ellipse cx="96" cy="60" rx="52" ry="35" fill="${mix(body, '#8a6a2f', 0.35)}"/>
  <ellipse cx="96" cy="60" rx="52" ry="35" fill="none" stroke="${light(body, 0.35)}" stroke-opacity="0.35" stroke-width="2"/>
  <g transform="translate(-4 0)">${plates}</g>
  <path d="M60 42 C84 30 118 32 140 46" stroke="#fff" stroke-opacity="0.25" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
}

// One front flipper, drawn with its shoulder at (0,0) pointing "up" (-y). Mirror it for the other side.
export function turtleFlipperSVG(a) {
  const d = dark(a.body, 0.45);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="-30 -60 60 90">${turtleFlipper(a.fin, d)}</svg>`;
}

export function turtleFullSVG(a) {
  const body = turtleBodySVG(a).replace(/<\/svg>$/, '');
  const d = dark(a.body, 0.45);
  const fl = (sy) => `<g transform="translate(120 ${sy === 1 ? 38 : 82}) rotate(${sy === 1 ? 20 : 160}) scale(1.05 ${sy})">${turtleFlipper(a.fin, d)}</g>`;
  return body + fl(1) + fl(-1) + '</svg>';
}

/* ───────────────────────── Jellyfish ───────────────────────── */

export function jellyBellSVG(a) {
  const c = a.body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 120 80">
  <defs>
    <radialGradient id="jb" cx="0.5" cy="0.75" r="0.8"><stop offset="0" stop-color="${a.belly}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${c}" stop-opacity="0.55"/><stop offset="1" stop-color="${a.fin}" stop-opacity="0.85"/></radialGradient>
  </defs>
  <path d="M8 72 C4 30 30 4 60 4 C90 4 116 30 112 72 C104 66 98 76 90 70 C82 76 74 66 66 72 C58 78 50 66 42 72 C34 76 26 66 20 72 C16 74 12 72 8 72Z" fill="url(#jb)" stroke="${light(c, 0.6)}" stroke-opacity="0.7" stroke-width="1.6"/>
  <ellipse cx="60" cy="42" rx="18" ry="11" fill="${light(a.fin, 0.2)}" opacity="0.35"/>
  <path d="M28 40 C34 20 54 12 70 14" stroke="#fff" stroke-opacity="0.55" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function jellyTentSVG(a) {
  let t = '';
  const xs = [20, 36, 52, 68, 84, 100];
  xs.forEach((x, i) => {
    const s = i % 2 ? 1 : -1;
    t += `<path d="M${x} 0 C${x + 7 * s} 24 ${x - 7 * s} 48 ${x + 5 * s} 74 C${x + 8 * s} 90 ${x - 4 * s} 104 ${x} 120" stroke="${light(a.body, 0.35)}" stroke-opacity="0.8" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  });
  t += `<path d="M44 0 C36 30 56 60 44 96 M76 0 C86 30 66 60 78 96" stroke="${a.fin}" stroke-opacity="0.7" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 120 120">${t}</svg>`;
}

export function jellyFullSVG(a) {
  const bell = jellyBellSVG(a).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const tent = jellyTentSVG(a).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="380" viewBox="0 0 120 190">${tent && `<g transform="translate(0 66)">${tent}</g>`}<g>${bell}</g></svg>`;
}

/* ───────────────────────── Manta ray (top-down) ───────────────────────── */

export function raySVG(a) {
  const { body, belly, fin } = a;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 240 150">
  <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${fin}"/><stop offset="0.6" stop-color="${body}"/><stop offset="1" stop-color="${light(body, 0.1)}"/></linearGradient></defs>
  <path d="M6 75 C20 74 36 72 50 72" stroke="${fin}" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M200 75 C206 54 224 46 238 52 C228 58 224 68 226 75 C224 82 228 92 238 98 C224 104 206 96 200 75Z" fill="${belly}" opacity="0.95"/>
  <path d="M60 75 C70 40 100 6 130 4 C150 12 176 40 204 62 C214 68 214 82 204 88 C176 110 150 138 130 146 C100 144 70 110 60 75Z" fill="url(#rg)" stroke="${dark(body, 0.5)}" stroke-opacity="0.4"/>
  <path d="M96 56 C112 44 140 44 160 56 C168 62 176 70 180 75 C176 80 168 88 160 94 C140 106 112 106 96 94Z" fill="${belly}" opacity="0.2"/>
  <circle cx="198" cy="62" r="3" fill="#fff" opacity="0.9"/><circle cx="198" cy="88" r="3" fill="#fff" opacity="0.9"/>
  <path d="M204 66 C214 60 226 60 234 66 M204 84 C214 90 226 90 234 84" stroke="${fin}" stroke-width="5" stroke-linecap="round" fill="none"/>
</svg>`;
}

/* ───────────────────────── Whale (side) ───────────────────────── */

export function whaleSVG(a) {
  const { body, belly, fin } = a;
  let grooves = '';
  for (let i = 0; i < 9; i++) grooves += `<path d="M${224 + i * 12} ${118 + i * 0.5} Q${250 + i * 12} ${128 + i * 2} ${270 + i * 10} ${126 + i}" stroke="${light(belly, 0.3)}" stroke-opacity="0.4" stroke-width="1.4" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 450 130">
  <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body}"/><stop offset="0.6" stop-color="${mix(body, belly, 0.35)}"/><stop offset="1" stop-color="${belly}"/></linearGradient></defs>
  <path d="M14 30 C6 18 4 8 10 2 C18 10 30 14 42 18 C52 14 62 8 74 6 C70 14 62 22 56 30 C40 42 28 40 14 30Z" fill="${fin}"/>
  <path d="M10 98 C4 110 4 122 12 128 C22 120 34 116 46 112 C56 116 66 122 78 124 C72 116 64 108 58 100Z" fill="${fin}"/>
  <path d="M50 66 C90 40 170 28 250 34 C330 38 400 40 436 54 C444 58 446 66 440 72 C424 94 360 116 270 118 C190 120 100 100 50 66Z" fill="url(#wg)" stroke="${dark(body, 0.5)}" stroke-opacity="0.35"/>
  <path d="M56 70 C100 90 190 112 270 112 C350 112 410 94 436 72" stroke="${light(belly, 0.25)}" stroke-opacity="0.25" stroke-width="3" fill="none"/>
  ${grooves}
  <path d="M290 96 C270 112 262 124 276 128 C292 120 304 108 310 98Z" fill="${fin}"/>
  <circle cx="404" cy="64" r="3.4" fill="#0f1c26"/><circle cx="404.8" cy="63.2" r="1" fill="#fff"/>
  <path d="M420 76 C428 78 436 76 440 72" stroke="${dark(body, 0.5)}" stroke-opacity="0.5" fill="none" stroke-width="1.6"/>
</svg>`;
}

/* ───────────────────────── Anemone + shell ───────────────────────── */

export function anemoneSVG(a, seed = 1) {
  const rng = mulberry32(seed * 31 + 5);
  let t = '';
  const n = 17;
  for (let i = 0; i < n; i++) {
    const x = 20 + (i / (n - 1)) * 80;
    const sway = (rng() - 0.5) * 22;
    const h = 62 + rng() * 34;
    const col = i % 3 === 0 ? a.fin : a.body;
    t += `<path d="M${x} 112 C${x + sway * 0.4} ${112 - h * 0.45} ${x + sway} ${112 - h * 0.75} ${x + sway * 1.3} ${112 - h}" stroke="${col}" stroke-width="5.4" stroke-linecap="round" fill="none"/>
    <circle cx="${(x + sway * 1.3).toFixed(1)}" cy="${(112 - h).toFixed(1)}" r="3.6" fill="${light(col, 0.5)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 120 120">
  ${t}
  <path d="M26 120 C26 100 36 92 60 92 C84 92 94 100 94 120Z" fill="${dark(a.body, 0.2)}"/>
  <path d="M34 112 C44 100 76 100 86 112" stroke="${a.belly}" stroke-opacity="0.5" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function shellSVG(a, open) {
  const { body, belly, fin } = a;
  let ribs = '';
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 10;
    ribs += `<path d="M60 ${open ? 70 : 82} L${x} ${open ? 30 + Math.abs(i - 4) * 4 : 54 + Math.abs(i - 4) * 2}" stroke="${fin}" stroke-opacity="0.5" stroke-width="1.6"/>`;
  }
  if (!open) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160" viewBox="0 0 110 80">
    <path d="M6 66 C6 30 30 8 55 8 C80 8 104 30 104 66 C80 76 30 76 6 66Z" fill="${body}" stroke="${dark(body, 0.4)}" stroke-opacity="0.5" stroke-width="1.5" transform="translate(0 4)"/>
    <g transform="translate(-5 -3) scale(1 0.9)">${ribs}</g>
    <path d="M16 46 C30 24 60 18 84 26" stroke="#fff" stroke-opacity="0.4" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160" viewBox="0 0 110 80">
  <path d="M6 62 C0 30 22 6 55 6 C88 6 110 30 104 62 C84 54 26 54 6 62Z" fill="${body}" stroke="${dark(body, 0.4)}" stroke-opacity="0.5" stroke-width="1.5"/>
  <g transform="translate(-5 4) scale(1 0.95)">${ribs}</g>
  <path d="M8 62 C30 52 80 52 102 62 C100 72 80 78 55 78 C30 78 10 72 8 62Z" fill="${dark(body, 0.2)}" stroke="${dark(body, 0.4)}" stroke-opacity="0.5" stroke-width="1.5"/>
  <path d="M16 62 C34 56 76 56 94 62 C90 68 74 72 55 72 C36 72 20 68 16 62Z" fill="${belly}" opacity="0.9"/></svg>`;
}

export function pearlSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><defs><radialGradient id="pg" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#F4F4EC"/><stop offset="1" stop-color="#B9B5E8"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#pg)"/><circle cx="12" cy="11" r="3" fill="#fff" opacity="0.8"/></svg>`;
}

/* ───────────────────────── Plants ───────────────────────── */

export function kelpSVG(c1, c2, seed = 1) {
  const rng = mulberry32(seed * 101 + 13);
  const H = 520, W = 120;
  const amp = 16 + rng() * 14, wl = 130 + rng() * 60, ph = rng() * 6;
  const L = [], R = [];
  const cx = (y) => W / 2 + Math.sin(y / wl * Math.PI * 2 + ph) * amp * (1 - y / (H * 1.6));
  for (let i = 0; i <= 40; i++) {
    const y = H - (i / 40) * (H - 10);
    const w = 5 + 4 * Math.sin((i / 40) * Math.PI) * (1 - i / 60);
    L.push([cx(y) - w, y]); R.push([cx(y) + w, y]);
  }
  const pts = L.concat(R.reverse());
  const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + 'Z';
  let leaves = '';
  for (let i = 0; i < 9; i++) {
    const y = H - 60 - i * 48, side = i % 2 ? 1 : -1, x = cx(y);
    leaves += `<path d="M${x.toFixed(1)} ${y} C${(x + side * 34).toFixed(1)} ${y - 8} ${(x + side * 44).toFixed(1)} ${y - 30} ${(x + side * 30).toFixed(1)} ${y - 46} C${(x + side * 20).toFixed(1)} ${y - 26} ${(x + side * 6).toFixed(1)} ${y - 16} ${x.toFixed(1)} ${y}Z" fill="${c2}" opacity="0.92"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="kg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${dark(c1, 0.35)}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
  ${leaves}<path d="${d}" fill="url(#kg)"/></svg>`;
}

export function seagrassSVG(c1, c2, seed = 1) {
  const rng = mulberry32(seed * 57 + 3);
  let blades = '';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = 20 + (i / (n - 1)) * 80 + (rng() - 0.5) * 8;
    const h = 220 + rng() * 150, bend = (rng() - 0.5) * 70, w = 4 + rng() * 3;
    const col = i % 2 ? c1 : c2;
    blades += `<path d="M${x - w} 400 C${x - w + bend * 0.2} ${400 - h * 0.4} ${x + bend * 0.7} ${400 - h * 0.7} ${x + bend} ${400 - h} C${x + w + bend * 0.7} ${400 - h * 0.7} ${x + w + bend * 0.2} ${400 - h * 0.4} ${x + w} 400Z" fill="${col}" opacity="${(0.85 + rng() * 0.15).toFixed(2)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="400" viewBox="0 0 120 400">${blades}</svg>`;
}

/* ───────────────────────── Net (Fishing Frenzy) ───────────────────────── */
// Hoop centre is at (150,140) in a 440x440 canvas; handle runs down-right.
export const NET_ANCHOR = { x: 150 / 440, y: 140 / 440, rx: 118, ry: 92 };

export function netSVG() {
  let mesh = '';
  for (let i = -6; i <= 6; i++) mesh += `<path d="M${150 + i * 20} 40 L${150 + i * 14} 240" />`;
  for (let j = 0; j < 8; j++) mesh += `<path d="M20 ${58 + j * 22} Q150 ${74 + j * 26} 280 ${58 + j * 22}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440" viewBox="0 0 440 440">
  <defs>
    <linearGradient id="nh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9B27A"/><stop offset="1" stop-color="#8A5A34"/></linearGradient>
    <clipPath id="nc"><ellipse cx="150" cy="140" rx="116" ry="90"/></clipPath>
  </defs>
  <path d="M236 206 L408 404" stroke="#5E3A1F" stroke-width="22" stroke-linecap="round"/>
  <path d="M236 206 L408 404" stroke="url(#nh)" stroke-width="16" stroke-linecap="round"/>
  <path d="M244 214 L262 236" stroke="#E4E8EA" stroke-width="20" stroke-linecap="round" opacity="0.95"/>
  <ellipse cx="150" cy="140" rx="116" ry="90" fill="#B8DCEB" fill-opacity="0.12"/>
  <g clip-path="url(#nc)" stroke="#F4F4EC" stroke-opacity="0.78" stroke-width="1.8" fill="none">${mesh}</g>
  <ellipse cx="150" cy="140" rx="118" ry="92" fill="none" stroke="#5E3A1F" stroke-width="12"/>
  <ellipse cx="150" cy="140" rx="118" ry="92" fill="none" stroke="url(#nh)" stroke-width="8"/>
  <path d="M62 112 C84 80 128 60 176 62" stroke="#fff" stroke-opacity="0.55" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
}

/* ───────────────────────── Dispatch ───────────────────────── */

// Static illustration for any species — journal cards, toasts, previews.
export function speciesSVG(sp) {
  switch (sp.kind) {
    case 'fish': return fishSVG(sp.art, sp.id);
    case 'seahorse': return seahorseSVG(sp.art);
    case 'turtle': return turtleFullSVG(sp.art);
    case 'jelly': return jellyFullSVG(sp.art);
    case 'ray': return raySVG(sp.art);
    case 'whale': return whaleSVG(sp.art);
    case 'anemone': return anemoneSVG(sp.art, 3);
    case 'shell': return shellSVG(sp.art, true);
    default: return fishSVG(sp.art, sp.id);
  }
}

const uriCache = new Map();
export function svgToDataURI(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export function speciesURI(sp) {
  if (!uriCache.has(sp.id)) uriCache.set(sp.id, svgToDataURI(speciesSVG(sp)));
  return uriCache.get(sp.id);
}

/* ───────────────────────── Browser canvas helpers ───────────────────────── */

const canvasCache = new Map();

export function svgToCanvas(svg, key) {
  if (key && canvasCache.has(key)) return canvasCache.get(key);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 256;
      c.height = img.naturalHeight || 256;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => reject(new Error('SVG failed to load: ' + (key || '')));
    img.src = svgToDataURI(svg);
  });
  if (key) canvasCache.set(key, p);
  return p;
}
