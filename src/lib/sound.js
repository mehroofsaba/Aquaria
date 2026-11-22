// Sound — every effect is synthesised at runtime into a tiny WAV and played through Howler.js,
// so the project needs no audio files. Everything is optional and respects the Sound setting.
import { Howl, Howler } from 'howler';

const RATE = 22050;

function toWavURI(f32) {
  const n = f32.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f32[i])) * 32767, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return 'data:audio/wav;base64,' + btoa(bin);
}

const buf = (dur) => new Float32Array(Math.floor(RATE * dur));
// Adds a sine tone sweeping f0→f1 with a soft attack and exponential decay.
function tone(b, { t0 = 0, dur = 0.15, f0 = 440, f1 = f0, vol = 0.5, decay = 6 }) {
  const s0 = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < b.length; i++) {
    const u = i / n, f = f0 + (f1 - f0) * u;
    ph += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, i / (RATE * 0.004)) * Math.exp(-decay * u);
    b[s0 + i] += Math.sin(ph) * vol * env;
  }
}
function noise(b, { t0 = 0, dur = 0.3, vol = 0.4, lp = 0.2, decay = 5 }) {
  const s0 = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  let y = 0;
  for (let i = 0; i < n && s0 + i < b.length; i++) {
    y += (Math.random() * 2 - 1 - y) * lp;
    const u = i / n;
    b[s0 + i] += y * vol * Math.min(1, i / (RATE * 0.01)) * Math.exp(-decay * u);
  }
}

const DEFS = {
  pop: () => { const b = buf(0.14); tone(b, { dur: 0.12, f0: 780, f1: 170, vol: 0.55, decay: 7 }); noise(b, { dur: 0.04, vol: 0.2, lp: 0.6, decay: 4 }); return b; },
  splash: () => { const b = buf(0.45); noise(b, { dur: 0.42, vol: 0.55, lp: 0.12, decay: 4.5 }); return b; },
  plop: () => { const b = buf(0.2); tone(b, { dur: 0.16, f0: 360, f1: 130, vol: 0.5, decay: 6 }); return b; },
  nibble: () => { const b = buf(0.2); tone(b, { dur: 0.05, f0: 620, f1: 480, vol: 0.35 }); tone(b, { t0: 0.07, dur: 0.05, f0: 700, f1: 540, vol: 0.3 }); return b; },
  bloop: () => { const b = buf(0.25); tone(b, { dur: 0.2, f0: 240, f1: 460, vol: 0.5, decay: 5 }); return b; },
  puff: () => { const b = buf(0.4); noise(b, { dur: 0.3, vol: 0.4, lp: 0.2, decay: 3 }); tone(b, { dur: 0.3, f0: 160, f1: 320, vol: 0.35, decay: 4 }); return b; },
  chime: () => { const b = buf(1.0); [880, 1318.5, 1760].forEach((f, i) => tone(b, { t0: i * 0.09, dur: 0.8, f0: f, vol: 0.32, decay: 4.5 })); return b; },
  discover: () => { const b = buf(1.3); [1046.5, 1568, 2093, 2637].forEach((f, i) => tone(b, { t0: i * 0.1, dur: 1, f0: f, vol: 0.26, decay: 4 })); return b; },
  catch: () => { const b = buf(0.3); tone(b, { dur: 0.16, f0: 520, f1: 900, vol: 0.5, decay: 5 }); tone(b, { t0: 0.05, dur: 0.18, f0: 780, f1: 1200, vol: 0.25, decay: 5 }); return b; },
  combo: () => { const b = buf(0.45); tone(b, { dur: 0.18, f0: 660, f1: 1100, vol: 0.45, decay: 5 }); tone(b, { t0: 0.08, dur: 0.3, f0: 1320, f1: 1760, vol: 0.3, decay: 5 }); return b; },
  swoosh: () => { const b = buf(0.25); noise(b, { dur: 0.22, vol: 0.35, lp: 0.35, decay: 4 }); return b; },
  tick: () => { const b = buf(0.1); tone(b, { dur: 0.06, f0: 1100, vol: 0.4, decay: 8 }); return b; },
  round: () => { const b = buf(1.0); [523, 659, 784, 1046].forEach((f, i) => tone(b, { t0: i * 0.12, dur: 0.5, f0: f, vol: 0.32, decay: 4 })); return b; },
  over: () => { const b = buf(1.0); [523, 440, 349].forEach((f, i) => tone(b, { t0: i * 0.16, dur: 0.5, f0: f, vol: 0.32, decay: 4 })); return b; },
};

function ambienceBuffer() {
  const dur = 8, b = buf(dur), n = b.length;
  let y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    y += (Math.random() * 2 - 1 - y) * 0.015; z += (y - z) * 0.05;
    const lfo = 0.65 + 0.35 * Math.sin((2 * Math.PI * i) / n * 2);
    b[i] = z * 5 * lfo;
  }
  // crossfade the tail into the head so the loop is seamless
  const x = Math.floor(RATE * 0.5);
  for (let i = 0; i < x; i++) { const k = i / x; b[i] = b[i] * k + b[n - x + i] * (1 - k); }
  return b.subarray(0, n - x);
}

class SoundEngine {
  constructor() { this.howls = {}; this.enabled = true; this.volume = 0.7; this.amb = null; this.started = false; }
  ensure() {
    if (this.started) return;
    this.started = true;
    for (const [k, make] of Object.entries(DEFS)) this.howls[k] = new Howl({ src: [toWavURI(make())], format: ['wav'], volume: 0.7 });
    this.amb = new Howl({ src: [toWavURI(ambienceBuffer())], format: ['wav'], loop: true, volume: 0.35 });
    this.apply();
    if (this.enabled) this.amb.play();
  }
  apply() { Howler.volume(this.volume); Howler.mute(!this.enabled); }
  configure({ sound, volume }) {
    if (sound !== undefined) this.enabled = sound;
    if (volume !== undefined) this.volume = volume;
    if (this.started) { this.apply(); if (this.enabled && this.amb && !this.amb.playing()) this.amb.play(); }
  }
  // Called from a user gesture (browsers keep audio locked until then).
  unlock() { this.ensure(); }
  play(name, pitch = 0) {
    if (!this.enabled || !this.started) return;
    const h = this.howls[name];
    if (!h) return;
    const id = h.play();
    if (pitch) h.rate(Math.min(2, 1 + pitch * 0.06), id);
  }
}

export const sound = new SoundEngine();
