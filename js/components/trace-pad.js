import { h, reduced } from '../dom.js';
import { GLYPHS, STROKE_WIDTH, XHEIGHT_TOP, BASELINE, strokePoints } from '../glyphs.js';
import { accentOf } from '../theme.js';

export function tracePad({ letter, onStroke }) {
  const accent = accentOf(letter);
  // Box of the glyph (in glyph units) that the pad fits into: the letter's own width, so it fills the pad.
  const GL = GLYPHS[letter];
  // A tall letter (d, t, f ...) or one with a tail (g, p) makes the box taller, so the whole letter always fits the pad.
  const top = Math.min(XHEIGHT_TOP, GL.minY), bottom = Math.max(BASELINE, GL.maxY);
  const BOX = { x: GL.minX - 10, y: top - 12, w: GL.maxX - GL.minX + 20, h: bottom - top + 24 };
  const guide = h('canvas', { class: 'tp-guide', 'aria-hidden': 'true' });
  const ink = h('canvas', { class: 'tp-ink', role: 'img', 'aria-label': 'Drawing area. Trace the letter with a finger.' });
  const fx = h('canvas', { class: 'tp-fx', 'aria-hidden': 'true' });
  const pad = h('div', { class: 'trace-pad', style: { '--accent': accent } }, guide, ink, fx);
  const strokes = strokePoints(letter, 120);
  let w = 0, hgt = 0, dpr = 1, s = 1, ox = 0, oy = 0;
  let showing = false, raf = 0, lastW = 0, lastH = 0;
  const inked = []; // the child's strokes as fractions of the pad, so a resize can redraw them

  const map = ([x, y]) => [ox + x * s, oy + y * s];

  function layout() {
    const r = pad.getBoundingClientRect();
    if (!r.width || (r.width === lastW && r.height === lastH)) return;
    lastW = r.width; lastH = r.height;
    dpr = window.devicePixelRatio || 1;
    w = r.width; hgt = r.height;
    for (const c of [guide, ink, fx]) { c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr); }
    s = Math.min((w * 0.86) / BOX.w, (hgt * 0.86) / BOX.h);
    ox = (w - BOX.w * s) / 2 - BOX.x * s;
    oy = (hgt - BOX.h * s) / 2 - BOX.y * s;
    drawGuide();
    redrawInk();
  }

  function drawGuide() {
    const g = guide.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hgt);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // Soft band showing the letter shape.
    g.strokeStyle = accent + '2E'; g.lineWidth = STROKE_WIDTH * s * 1.25;
    strokes.forEach((st) => { g.beginPath(); st.pts.forEach((p, i) => { const [x, y] = map(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
    // Dashed centre line.
    g.strokeStyle = accent + '99'; g.lineWidth = Math.max(2, s * 1.4); g.setLineDash([s * 2.2, s * 3]);
    strokes.forEach((st) => { g.beginPath(); st.pts.forEach((p, i) => { const [x, y] = map(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
    g.setLineDash([]);
    // Arrowheads along each stroke.
    strokes.forEach((st) => {
      if (st.len < 10) return; // the dot on i is too short for an arrow
      const i = Math.floor(st.pts.length * 0.4);
      const a = map(st.pts[i - 2]), b = map(st.pts[i + 2]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const [cx, cy] = map(st.pts[i]);
      g.save(); g.translate(cx, cy); g.rotate(ang);
      g.fillStyle = accent; g.beginPath(); const k = Math.max(7, s * 2.4);
      g.moveTo(k, 0); g.lineTo(-k * 0.7, -k * 0.8); g.lineTo(-k * 0.7, k * 0.8); g.closePath(); g.fill(); g.restore();
    });
    // Numbered start dots.
    const placed = [];
    strokes.forEach((st, i) => {
      let [x, y] = map(st.start);
      const r = Math.max(12, s * 3.6);
      // Keep neighbouring dots 10 px apart (the two starts of "a" are close).
      for (const q of placed) {
        const d = Math.hypot(x - q.x, y - q.y), need = 2 * r + 10;
        if (d < need) { x = q.x + ((x - q.x) / (d || 1)) * need; y = q.y + ((y - q.y) / (d || 1)) * need; }
      }
      placed.push({ x, y });
      g.fillStyle = '#1E2140'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `800 ${Math.round(r * 1.15)}px Nunito, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i + 1), x, y + 1);
    });
  }

  function redrawInk() {
    const c = ink.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = accent; c.fillStyle = accent; c.lineWidth = width();
    for (const st of inked) {
      const p = st.map(([x, y]) => [x * w, y * hgt]);
      if (p.length === 1) { c.beginPath(); c.arc(p[0][0], p[0][1], width() * 0.25, 0, Math.PI * 2); c.fill(); continue; }
      c.beginPath(); c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
      c.stroke();
    }
  }

  // ---- the child's ink ----
  let drawing = false, pts = [], t0 = 0;
  const width = () => w * 0.06;
  const ictx = () => { const c = ink.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = accent; return c; };
  const pos = (e) => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  ink.addEventListener('pointerdown', (e) => {
    if (showing) return;
    e.preventDefault();
    ink.setPointerCapture(e.pointerId);
    drawing = true; t0 = performance.now(); pts = [pos(e)];
    inked.push([[pts[0][0] / w, pts[0][1] / hgt]]);
    const c = ictx();
    // The round cap grows in over 80 ms at the start of each stroke.
    c.fillStyle = accent; c.beginPath(); c.arc(pts[0][0], pts[0][1], width() * 0.25, 0, Math.PI * 2); c.fill();
  });
  ink.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const c = ictx();
    for (const ev of (list.length ? list : [e])) {
      const p = pos(ev);
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.2) continue;
      pts.push(p);
      const stroke = inked[inked.length - 1];
      if (stroke) stroke.push([p[0] / w, p[1] / hgt]);
      const grow = reduced() ? 1 : Math.min(1, 0.25 + (performance.now() - t0) / 80 * 0.75);
      c.lineWidth = width() * grow;
      const n = pts.length;
      const a = pts[n - 2], b = pts[n - 1];
      const prev = pts[n - 3] || a;
      // Quadratic smoothing through segment midpoints.
      const m0 = [(prev[0] + a[0]) / 2, (prev[1] + a[1]) / 2], m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      c.beginPath(); c.moveTo(m0[0], m0[1]); c.quadraticCurveTo(a[0], a[1], m1[0], m1[1]); c.stroke();
    }
  });
  const end = () => { if (drawing) { drawing = false; if (onStroke) onStroke(); } };
  ink.addEventListener('pointerup', end);
  ink.addEventListener('pointercancel', end);

  pad.clear = () => { drawing = false; pts = []; inked.length = 0; // a stroke in progress ends here, so its next move has nothing to draw into
    const c = ink.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, ink.width, ink.height); };

  // "Show me": a glowing dot walks each stroke in order, leaving a fading trail.
  pad.showMe = () => new Promise((resolve) => {
    if (showing) return resolve();
    showing = true;
    const c = fx.getContext('2d');
    const speed = 95; // glyph units per second
    const path = strokes.map((st) => ({ pts: st.pts.map(map), len: st.len }));
    let si = 0, dist = 0, last = performance.now();
    const trail = [];
    const frame = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; // a frame's timestamp can be a hair earlier than the moment it was asked for
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, hgt);
      const st = path[si];
      if (st) {
        dist += speed * dt * (reduced() ? 6 : 1);
        const f = st.len > 0 ? Math.max(0, Math.min(1, dist / st.len)) : 1;
        const idx = f * (st.pts.length - 1), i0 = Math.floor(idx), i1 = Math.min(i0 + 1, st.pts.length - 1), t = idx - i0;
        const p = [st.pts[i0][0] + (st.pts[i1][0] - st.pts[i0][0]) * t, st.pts[i0][1] + (st.pts[i1][1] - st.pts[i0][1]) * t];
        trail.push({ p, born: now, brk: f === 0 });
        if (f >= 1) { si++; dist = 0; trail.push({ p, born: now, brk: true }); }
        c.fillStyle = accent; c.shadowColor = accent; c.shadowBlur = 18;
        c.beginPath(); c.arc(p[0], p[1], width() * 0.75, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      }
      for (let k = trail.length - 1; k >= 0; k--) {
        const age = now - trail[k].born;
        if (age > 700) { trail.splice(0, k + 1); break; }
        c.globalAlpha = 0.45 * (1 - age / 700);
        c.fillStyle = accent; c.beginPath(); c.arc(trail[k].p[0], trail[k].p[1], width() * 0.5, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      if (si < path.length || trail.length) raf = requestAnimationFrame(frame);
      else { c.clearRect(0, 0, w, hgt); showing = false; resolve(); }
    };
    raf = requestAnimationFrame(frame);
  });

  new ResizeObserver(layout).observe(pad);
  requestAnimationFrame(layout);
  pad.cleanup = () => cancelAnimationFrame(raf);
  return pad;
}
