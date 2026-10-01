// Letter Hunt's dealer, tested on its own with a seeded random number generator (no browser needed).
// Run alone with `node test/deal.mjs`, or as part of test/smoke.mjs.
import path from 'node:path';
import { deal, skyCells } from '../js/screens/tasks/hunt-deal.js';

export const mulberry32 = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// The scenes of the three test viewports (the sky's width and height), as the game measures them.
export const SCENES = [[388, 633, 'portrait'], [639, 364, 'landscape'], [336, 498, 'small phone']];
const DISTRACTORS = { m: ['a', 's', 'o', 't', 'l', 'i'], a: ['m', 's', 't', 'l', 'i', 'n'], s: ['m', 'a', 't', 'l', 'i', 'o'] };

export function dealerChecks(ok) {
  for (const [W, H, what] of SCENES) {
    for (const [target, distractors] of Object.entries(DISTRACTORS)) {
      const positions = skyCells(W, H);
      const tag = `dealer, ${what}, target ${target}`;
      const xs = positions.map((p) => p.x), ys = positions.map((p) => p.y);
      const midX = (Math.min(...xs) + Math.max(...xs)) / 2, midY = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rng = mulberry32(W * 31 + H + target.charCodeAt(0));
      const history = [], counts = new Set(), perSlot = Array(positions.length).fill(0);
      let aBad = 0, bBad = 0, cBad = 0, letterBad = 0, countBad = 0, sameLayout = 0, clash = 0;
      let nearest = Infinity;
      for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) nearest = Math.min(nearest, Math.hypot(xs[i] - xs[j], ys[i] - ys[j]));
      const side = (i, j) => Math.hypot(xs[i] - xs[j], ys[i] - ys[j]) <= nearest * 1.2; // side by side or one above the other
      // The most targets that can sit with no two side by side (so we know whether that is avoidable at all).
      let independent = 0;
      for (let mask = 0; mask < 1 << positions.length; mask++) {
        const pick = positions.map((_, i) => i).filter((i) => mask & (1 << i));
        if (pick.length > independent && pick.every((a, x) => pick.slice(x + 1).every((b) => !side(a, b)))) independent = pick.length;
      }
      for (let d = 0; d < 300; d++) {
        const r = deal({ positions, history, rng, target, distractors });
        const t = r.targets;
        counts.add(t.length);
        if (t.length < 4 || t.length > 5 || new Set(t).size !== t.length) countBad++;
        if (history.length && t.some((s) => history[history.length - 1].includes(s))) aBad++;                      // (a)
        const window = [...history.slice(-3), t];
        if (window.length === 4 && positions.some((_, s) => window.filter((w) => w.includes(s)).length >= 3)) bBad++; // (b)
        if (!(t.some((s) => xs[s] <= midX + 1) && t.some((s) => xs[s] >= midX - 1) && t.some((s) => ys[s] <= midY + 1) && t.some((s) => ys[s] >= midY - 1))) cBad++; // (c)
        if (history.length && JSON.stringify(history[history.length - 1]) === JSON.stringify(t)) sameLayout++;
        for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (side(t[i], t[j])) { clash++; break; }
        // Letters: the target exactly on the target slots, every other letter a distractor, none more than twice.
        const freq = {};
        r.letters.forEach((ch, s) => { if (t.includes(s) !== (ch === target)) letterBad++; if (ch !== target) freq[ch] = (freq[ch] || 0) + 1; });
        if (r.letters.length !== positions.length || Object.values(freq).some((v) => v > 2) || Object.keys(freq).some((c) => !distractors.includes(c))) letterBad++;
        t.forEach((s) => { perSlot[s]++; });
        history.push(t);
      }
      ok(positions.length >= 14 && positions.length <= 16, `${tag}: a grid of 14 to 16 slots (${positions.length})`);
      ok(aBad === 0, `${tag}: no slot holds a target two deals running (${aBad} times in 300 deals)`);
      ok(bBad === 0, `${tag}: no slot holds a target in three of any four deals (${bBad} times)`);
      ok(cBad === 0, `${tag}: targets are always spread over all four halves (${cBad} times)`);
      ok(countBad === 0 && counts.has(4) && counts.has(5), `${tag}: always four or five targets, and both happen (${[...counts].join(', ')})`);
      ok(letterBad === 0, `${tag}: letters are the target on its slots and otherwise distractors, none more than twice`);
      ok(sameLayout === 0, `${tag}: a deal is never the layout before it`);
      ok(Math.max(...perSlot) / 300 <= 0.45, `${tag}: no slot hosts a target more than 45% of the time (most: ${Math.round((Math.max(...perSlot) / 300) * 100)}%)`);
      ok(independent < 5 || clash / 300 < 0.1, `${tag}: targets side by side are rare when that is avoidable (${Math.round((clash / 300) * 100)}% of deals; ${independent} slots can be kept apart)`);
    }
  }
  // Short scenes (the browser's bars showing): still a full sky of at least 12 letters with at least 6 distractors, no overlap.
  for (const [W, H] of [[780, 360], [640, 360]]) {
    const positions = skyCells(W, H), r = deal({ positions, rng: mulberry32(W + H), target: 'm', distractors: DISTRACTORS.m });
    const touching = positions.some((p, i) => positions.slice(i + 1).some((q) => Math.abs(p.x - q.x) < 56 + 12 - 2 * (p.jx) && Math.abs(p.y - q.y) < 56 + 12 - 2 * (p.jy)));
    ok(positions.length >= 12 && positions.length - r.targets.length >= 6 && !touching, `short scene ${W}x${H}: ${positions.length} slots, ${positions.length - r.targets.length} distractors, none touching`);
  }
  let threw = '';
  try { deal({ positions: skyCells(388, 633), rng: mulberry32(1), target: 'm', distractors: [] }); } catch (e) { threw = e.message; }
  ok(/distractor/.test(threw), `an empty distractor list is a clear error, not an endless loop (${threw})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  dealerChecks(ok);
  console.log(`deal: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
