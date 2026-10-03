// The HTML overlay over the 3D railway: one real button per stop, placed every rendered frame over its sign
// (Vector3.project), at least 64 px, hidden while off screen, too far away to tap, or behind a nearer one. These buttons
// are what a finger, a screen reader or a test touches; nothing is picked by raycasting.
import { THREE } from './world.js';
import { h, icon } from '../dom.js';

const MIN = 64;

// stops: [{ label, state, cls, anchor: Object3D (the sign), onTap }]. bubble: the "Tap to start" button for the current stop.
export function createOverlay(stops, { bubbleIndex, onBubble }) {
  const layer = h('div', { class: 'train-overlay' });
  const buttons = stops.map((s, i) => {
    const b = h('button', { class: `stone station-btn is-${s.cls}`, type: 'button', 'aria-label': s.label, 'aria-disabled': s.cls === 'locked' ? 'true' : null, dataset: { index: String(i), kind: s.kind }, onclick: (e) => s.onTap(b, e) });
    b.style.visibility = 'hidden';
    layer.append(b);
    return b;
  });
  let bubble = null;
  if (bubbleIndex >= 0) {
    bubble = h('button', { class: 'bubble train-bubble', type: 'button', onclick: onBubble }, icon('speaker', 18), h('span', {}, 'Tap to start'));
    bubble.style.visibility = 'hidden';
    layer.append(bubble);
  }
  const v = new THREE.Vector3(), up = new THREE.Vector3(), cam = new THREE.Vector3();
  const shown = [];

  return {
    layer, buttons, bubble,
    // Place every button for this camera; w and h are the canvas size in CSS pixels; blockers: boxes kept clear (the pill and the corner button).
    update(camera, w, hgt, blockers = []) {
      const blocked = (x, y, bw, bh) => blockers.some((o) => x < o.x + o.w && o.x < x + bw && y < o.y + o.h && o.y < y + bh);
      shown.length = 0;
      camera.getWorldPosition(cam);
      const order = stops.map((s, i) => { s.anchor.getWorldPosition(v); return [i, v.distanceToSquared(cam)]; }).sort((a, b) => a[1] - b[1]);
      for (const [i] of order) {
        const s = stops[i], b = buttons[i];
        s.anchor.getWorldPosition(v);
        up.copy(v); up.y += 0.82;
        v.project(camera); up.project(camera);
        const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * hgt;
        const r = Math.abs((up.y - v.y) / 2 * hgt);
        const size = Math.max(MIN, Math.round(r * 2 + 14));
        const box = { x: x - size / 2, y: y - size / 2, s: size };
        const onScreen = v.z < 1 && box.x >= 0 && box.y >= 0 && box.x + size <= w && box.y + size <= hgt;
        const nearEnough = r * 2 >= 30;
        const clear = !shown.some((o) => box.x < o.x + o.s && o.x < box.x + size && box.y < o.y + o.s && o.y < box.y + size);
        const visible = onScreen && nearEnough && clear && !blocked(box.x, box.y, size, size);
        if (visible) shown.push(box);
        b.style.visibility = visible ? 'visible' : 'hidden';
        b.style.pointerEvents = visible ? '' : 'none';
        b.tabIndex = visible ? 0 : -1;
        b.style.width = b.style.height = size + 'px';
        b.style.transform = `translate(${Math.round(box.x)}px,${Math.round(box.y)}px)`;
        b.dataset.shown = visible ? '1' : '0';
        if (bubble && i === bubbleIndex) {
          const bw = bubble.offsetWidth || 150, bh = bubble.offsetHeight || 48;
          const bxTry = Math.max(8, Math.min(w - bw - 8, x - bw / 2));
          const below = box.y - bh - 10 < 4 || blocked(bxTry, box.y - bh - 8, bw, bh);
          const bx = Math.max(8, Math.min(w - bw - 8, x - bw / 2)), by = below ? box.y + size + 8 : box.y - bh - 8;
          bubble.classList.toggle('below', below);
          bubble.style.transform = `translate(${Math.round(bx)}px,${Math.round(by)}px)`;
          bubble.style.setProperty('--tip', `${Math.round(Math.max(18, Math.min(bw - 18, x - bx)))}px`);
          const bVisible = visible && by >= 0 && by + bh <= hgt && !blocked(bx, by, bw, bh);
          bubble.style.visibility = bVisible ? 'visible' : 'hidden';
          bubble.style.pointerEvents = bVisible ? '' : 'none';
        }
      }
    },
  };
}
