// Pure steering maths — no Pixi, no DOM — so it can be unit-tested in Node.
export const TAU = Math.PI * 2;

export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Cohesion / alignment / separation for one school member against the rest.
export function schoolForces(c, members, sepR = 36) {
  let n = 0, px = 0, py = 0, vx = 0, vy = 0, sx = 0, sy = 0;
  for (const m of members) {
    if (m === c) continue;
    n++; px += m.x; py += m.y; vx += m.vx; vy += m.vy;
    const dx = c.x - m.x, dy = c.y - m.y, d2 = dx * dx + dy * dy;
    if (d2 < sepR * sepR && d2 > 0.01) {
      const d = Math.sqrt(d2), k = 1 - d / sepR;
      sx += (dx / d) * k; sy += (dy / d) * k;
    }
  }
  if (!n) return { cx: 0, cy: 0, ax: 0, ay: 0, sx: 0, sy: 0 };
  px /= n; py /= n; vx /= n; vy /= n;
  const dx = px - c.x, dy = py - c.y, dl = Math.hypot(dx, dy) || 1, vl = Math.hypot(vx, vy) || 1;
  const pull = Math.min(1, dl / 120);
  return { cx: (dx / dl) * pull, cy: (dy / dl) * pull, ax: vx / vl, ay: vy / vl, sx, sy };
}

// Soft push away from the edges of the swim box.
export function wallForce(x, y, box) {
  let fx = 0, fy = 0;
  const m = box.margin;
  if (x < box.x0 + m) fx = (box.x0 + m - x) / m;
  else if (x > box.x1 - m) fx = -(x - (box.x1 - m)) / m;
  if (y < box.y0 + m) fy = (box.y0 + m - y) / m;
  else if (y > box.y1 - m) fy = -(y - (box.y1 - m)) / m;
  return { fx, fy };
}

// Weighted pick by rarity weight.
export function weightedPick(items, weightOf, rnd = Math.random) {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = rnd() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
