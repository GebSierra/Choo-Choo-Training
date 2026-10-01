// Letter Hunt's sky: where the letters sit (skyCells) and which of them are targets (deal). Both are pure, so the
// dealer can be tested with a seeded random number generator.

const BOX = 56; // touch target of a letter

// Cells of a loose grid in the sky of a scene W by H, clear of the "Find this" card, the speaker button, the sun, the
// goal barn and the grass. At most `count` of them are returned, spread evenly over the grid; each has the room its
// letter may be nudged by (jx, jy), which keeps at least 12 px between neighbours.
// A short scene (a phone with the browser's bars showing) gives the grass less room; if that still leaves under 8
// cells, the grid packs tighter (letters exactly 12 px apart, no nudging). The keep-outs are the art's real size.
export function skyCells(W, H, { goalW = 150, count = 16 } = {}) {
  const bottom = H < 360 ? 50 : 92, y0 = 10, yMax = H - bottom;
  const keepOut = [[0, 0, 120, 80], [W - 76, 0, W, 76], [W * 0.56 - 8, 0, W * 0.56 + 64, 72], [W - goalW - 20, H - (goalW * 0.84 + 50), W, H]];
  const clear = (x, y) => !keepOut.some(([a, b, c2, d]) => x + BOX / 2 > a && x - BOX / 2 < c2 && y + BOX / 2 > b && y - BOX / 2 < d);
  const loose = () => {
    const cols = Math.max(1, Math.floor((W - 20) / 70)), rows = Math.max(1, Math.floor((yMax - y0) / 68));
    const cw = (W - 20) / cols, ch = (yMax - y0) / rows, out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = 10 + cw * (c + 0.5), y = y0 + ch * (r + 0.5);
      if (clear(x, y)) out.push({ x, y, jx: Math.max(0, Math.floor((cw - BOX - 12) / 2)), jy: Math.max(0, Math.floor((ch - BOX - 12) / 2)) });
    }
    return out;
  };
  const tight = () => {
    const pitch = BOX + 12, cols = Math.max(1, Math.floor((W - 20 + 12) / pitch)), rows = Math.max(1, Math.floor((yMax - y0 + 12) / pitch));
    const x0 = 10 + (W - 20 - (cols * pitch - 12)) / 2 + BOX / 2, yTop = y0 + (yMax - y0 - (rows * pitch - 12)) / 2 + BOX / 2, out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (clear(x0 + c * pitch, yTop + r * pitch)) out.push({ x: x0 + c * pitch, y: yTop + r * pitch, jx: 0, jy: 0 });
    return out;
  };
  let out = loose();
  if (out.length < 8) { const t = tight(); if (t.length > out.length) out = t; }
  const n = Math.min(count, out.length);
  return Array.from({ length: n }, (_, i) => out[Math.floor(((i + 0.5) * out.length) / n)]);
}

const shuffle = (list, rng) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Deals one sky. positions: the slots ({x, y}); history: the target slots of earlier deals, oldest first; rng: () in [0, 1).
// Four or five slots get the target letter and the rest a distractor, so where the target sits cannot be learned:
//   (a) no slot that held a target in the previous deal holds one now;
//   (b) no slot holds a target in three deals out of any four in a row;
//   (c) targets are spread: one in each half, left and right, upper and lower;
//   (d) no two targets in neighbouring slots, when that can be avoided.
// (a) and (b) are given up, in that order, only if nothing else can satisfy (c). Distractors are chosen at random,
// with no letter more than twice in a deal (unless the list is too short for that).
// Returns { targets: sorted slot indices, letters: one letter per slot }.
export function deal({ positions, history = [], rng = Math.random, target, distractors, counts = [4, 5] }) {
  const n = positions.length;
  const xs = positions.map((p) => p.x), ys = positions.map((p) => p.y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2, midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  // A slot on the middle line (within a pixel) counts for both halves, so a middle row is never forced to hold a target every time.
  const halves = [(i) => xs[i] <= midX + 1, (i) => xs[i] >= midX - 1, (i) => ys[i] <= midY + 1, (i) => ys[i] >= midY - 1];
  // Neighbours: slots side by side or one above the other (within 1.2 of the closest pair's distance; diagonals are further).
  let nearest = Infinity;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) nearest = Math.min(nearest, Math.hypot(xs[i] - xs[j], ys[i] - ys[j]));
  const near = (i, j) => Math.hypot(xs[i] - xs[j], ys[i] - ys[j]) <= nearest * 1.2;
  const last = history[history.length - 1] || [];
  const recent = history.slice(-3);
  const hits = (i) => recent.filter((d) => d.includes(i)).length;
  const k = Math.min(counts[Math.floor(rng() * counts.length)], Math.max(1, n - 2)); // a very small sky keeps a couple of distractors
  const all = Array.from({ length: n }, (_, i) => i);

  const spread = (pick) => halves.every((inHalf) => pick.some(inHalf));
  const clashes = (pick) => { let c = 0; for (let i = 0; i < pick.length; i++) for (let j = i + 1; j < pick.length; j++) if (near(pick[i], pick[j])) c++; return c; };
  // Slots that have hosted targets more often lately come later in the order, which keeps every slot's share fair.
  const used = (i) => history.filter((d) => d.includes(i)).length / Math.max(1, history.length);
  const attempt = (pool) => {
    if (pool.length < k) return null;
    let best = null, bestClash = Infinity;
    for (let t = 0; t < 300; t++) {
      const order = pool.map((i) => [used(i) * 3 + rng(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      const pick = [];
      const add = (i) => { pick.push(i); };
      const free = (i) => !pick.includes(i) && !pick.some((p) => near(p, i)); // not next to one already chosen
      // First make sure every half has a target, then fill up; side by side only when it cannot be helped.
      for (const inHalf of halves) {
        if (pick.some(inHalf)) continue;
        const c = order.find((i) => inHalf(i) && free(i)) ?? order.find((i) => inHalf(i) && !pick.includes(i));
        if (c !== undefined) add(c);
      }
      for (const i of order) if (pick.length < k && free(i)) add(i);
      for (const i of order) if (pick.length < k && !pick.includes(i)) add(i);
      if (pick.length !== k || !spread(pick)) continue;
      const c = clashes(pick);
      if (c < bestClash) { best = pick; bestClash = c; if (!c) break; }
    }
    return best;
  };
  const pools = [all.filter((i) => !last.includes(i) && hits(i) <= 1), all.filter((i) => !last.includes(i)), all];
  let chosen = null;
  for (const pool of pools) { chosen = attempt(pool); if (chosen) break; }
  if (!chosen) chosen = shuffle(all, rng).slice(0, k);
  const targets = [...chosen].sort((a, b) => a - b);

  if (!distractors.length) throw new Error('Letter Hunt needs at least one distractor letter');
  let bag = shuffle(distractors.flatMap((l) => [l, l]), rng);
  while (bag.length < n - k) bag = bag.concat(shuffle(distractors, rng));
  const letters = all.map((i) => (targets.includes(i) ? target : bag.pop()));
  return { targets, letters };
}
