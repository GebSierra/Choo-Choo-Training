// The camera rig: a perspective camera (fov 35) looking down about 38 degrees at a point on the line, framing that point
// in the lower middle with the line running on into the distance. One finger dragging up or down moves the point along
// the line (never a rotation, never a zoom), with momentum after letting go and soft limits at both ends.
import { THREE } from './world.js';

const PITCH = 38 * Math.PI / 180;
const TAN_V = Math.tan(35 / 2 * Math.PI / 180);
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// across: the units shown across at the look point (a theme may show a little more). sidePortrait: a theme's look-point side offset in portrait (the docks look a little more toward the sea); side: for both.
export function createRig(camera, line, { min, max, side: sideOpt, sidePortrait, across = 8.6 }) {
  let focus = min, vel = 0, glide = null, dist = 20, ahead = 2, side = 1.2, w = 1, h = 1, dragging = false, follow = null;
  const p = {}, look = new THREE.Vector3();

  // Distance from the look point: enough to show about 8.6 units across and 12.5 up and down at that point.
  function frame(width, height) {
    w = width; h = height;
    camera.aspect = w / h;
    const tanH = TAN_V * camera.aspect;
    dist = Math.max(12, Math.min(34, Math.max(across / (2 * tanH), 12.5 / (2 * TAN_V))));
    const portrait = h > w;
    ahead = portrait ? 5 : 3.2;
    side = sideOpt !== undefined ? sideOpt : portrait ? (sidePortrait !== undefined ? sidePortrait : 1.3) : 0.9;
    camera.updateProjectionMatrix();
    apply();
  }
  function apply() {
    line.at(focus + ahead, p);
    look.set(p.x + p.nx * side, 0.6, p.z + p.nz * side);
    camera.position.set(look.x * 0.85 + p.x * 0.15, look.y + dist * Math.sin(PITCH), look.z + dist * Math.cos(PITCH));
    camera.lookAt(look);
  }
  // Units along the line for one pixel of finger travel, at the look point.
  const perPixel = () => (2 * dist * TAN_V) / h / Math.sin(PITCH + 0.25);

  return {
    frame, apply,
    get focus() { return focus; },
    get look() { return look; },
    get dragging() { return dragging; },
    get busy() { return dragging || glide !== null || follow !== null || Math.abs(vel) > 0.01 || focus < min - 0.01 || focus > max + 0.01; },
    jump(s) { focus = s; vel = 0; glide = null; follow = null; apply(); },
    glideTo(s, ms = 1400, t) { glide = { from: focus, to: s, t0: t, ms }; vel = 0; },
    // While the train moves the camera keeps it framed (until a finger takes over).
    follow(fn) { follow = fn; },
    dragStart() { dragging = true; glide = null; follow = null; vel = 0; },
    dragMove(dy, dtSec) {
      let d = dy * perPixel();
      if ((focus < min && d < 0) || (focus > max && d > 0)) d *= 0.35; // resistance past the ends
      focus += d;
      if (dtSec > 0) vel = vel * 0.6 + (d / dtSec) * 0.4;
      apply();
    },
    dragEnd() { dragging = false; if (Math.abs(vel) < 0.5) vel = 0; vel = Math.max(-40, Math.min(40, vel)); },
    // dt in seconds (never negative), t in ms. Returns true while the camera still moves.
    update(dt, t) {
      if (dragging) return true;
      let moving = false;
      if (follow) { const s = follow(); if (s === null) follow = null; else { focus += (s - focus) * Math.min(1, dt * 6); moving = true; } }
      else if (glide) {
        const k = Math.min(1, (t - glide.t0) / glide.ms);
        focus = glide.from + (glide.to - glide.from) * ease(Math.max(0, k));
        if (k >= 1) glide = null;
        moving = true;
      } else if (Math.abs(vel) > 0.01) {
        focus += vel * dt;
        vel *= Math.exp(-dt * 3.2);
        if (Math.abs(vel) < 0.05) vel = 0;
        if (focus < min || focus > max) vel *= Math.exp(-dt * 10);
        moving = true;
      }
      if (!dragging && !glide && !follow) {
        const target = focus < min ? min : focus > max ? max : null;
        if (target !== null) { focus += (target - focus) * Math.min(1, dt * 7); if (Math.abs(target - focus) < 0.01) focus = target; moving = true; }
      }
      if (moving) apply();
      return moving;
    },
  };
}
