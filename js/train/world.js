// Shared pieces of the 3D railway: the palette, a seeded random, a bag that remembers every geometry, material and
// texture made (so leaving Home disposes all of them), and the line itself: one winding track whose stations sit at
// fixed distances along it, built from the number of stops in curriculum.json.
import * as THREE from '../../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../../vendor/three/RoundedBoxGeometry.js';

export { THREE };

export const PAL = {
  grass: '#4FC97E', grassDark: '#3DB56C', cream: '#F3E6CF', rail: '#8A6E5A', sleeper: '#B8926A', water: '#5AC8FA',
  red: '#E5484D', sun: '#FFD166', navy: '#2B2D5C', skyTop: '#BFE8FF', horizon: '#FFF6E5', wood: '#C99A5B', woodLight: '#E3BC84',
  greens: ['#3DB56C', '#2FA35E', '#6BD38F'], trunk: '#9A6B4A', locked: '#C9C4BA', ink: '#1E2140',
};

// The same small random every time, so the island looks the same on every visit.
export function rng(seed = 7) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Everything made through the bag is disposed with it.
export function makeBag() {
  const items = new Set();
  const add = (x) => { items.add(x); return x; };
  const cache = new Map();
  return {
    add,
    // A painted-wood material, shared per colour and options.
    paint(color, opts = {}) {
      const key = color + JSON.stringify(opts);
      if (!cache.has(key)) cache.set(key, add(new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts })));
      return cache.get(key);
    },
    box(w, h, d, r = 0.15, seg = 2) {
      const key = `box${w},${h},${d},${r},${seg}`;
      if (!cache.has(key)) cache.set(key, add(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999)));
      return cache.get(key);
    },
    geo(key, make) { if (!cache.has(key)) cache.set(key, add(make())); return cache.get(key); },
    dispose() { for (const x of items) { try { x.dispose(); } catch { /* fine */ } } items.clear(); cache.clear(); },
    get size() { return items.size; },
  };
}

// A rounded box mesh in one call, casting and receiving soft shadows.
export function block(bag, w, h, d, color, { r, shadow = true, opts } = {}) {
  const m = new THREE.Mesh(bag.box(w, h, d, r === undefined ? Math.min(w, h, d) * 0.15 : r), bag.paint(color, opts));
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

export const SPACING = 9;    // between two stops along the line
export const FIRST = 7;      // the first stop's distance from the start of the line
export const LEAD = 14;      // track before the start (behind the camera at the first stop)
export const TAIL = 26;      // track after the last stop

// The track's centre line: it winds gently left and right as it runs away from the camera (toward -z).
const xOf = (z) => 2.1 * Math.sin(z * 0.075 + 0.3) + 0.8 * Math.sin(z * 0.19 + 1.7);

// The line: points every 0.25 along z, their running length, and at(s) for any distance s along it.
export function makeLine(stops) {
  const need = FIRST + (stops - 1) * SPACING + TAIL;
  const xs = [], zs = [], len = [];
  let s = -LEAD, z = -LEAD;
  for (let k = 0; ; k++) {
    const x = xOf(z);
    if (k) s += Math.hypot(x - xs[k - 1], -z - zs[k - 1]);
    xs.push(x); zs.push(-z); len.push(s);
    if (s > need) break;
    z += 0.25;
  }
  const n = xs.length;
  // at(s): position, unit direction of travel and its heading (rotation about y) at distance s.
  function at(s, out = {}) {
    s = Math.max(len[0], Math.min(len[n - 1], s));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] <= s) lo = mid; else hi = mid; }
    const t = (s - len[lo]) / (len[hi] - len[lo] || 1);
    out.x = xs[lo] + (xs[hi] - xs[lo]) * t; out.z = zs[lo] + (zs[hi] - zs[lo]) * t;
    const dx = xs[hi] - xs[lo], dz = zs[hi] - zs[lo], l = Math.hypot(dx, dz) || 1;
    out.dx = dx / l; out.dz = dz / l;
    out.heading = Math.atan2(out.dx, out.dz); // object.rotation.y that points local +z along the line
    out.nx = -out.dz; out.nz = out.dx;        // the right-hand side when looking along the line (toward -z, that is +x)
    return out;
  }
  return { at, start: len[0], end: len[n - 1], stop: (i) => FIRST + i * SPACING, samples: { xs, zs, len } };
}
