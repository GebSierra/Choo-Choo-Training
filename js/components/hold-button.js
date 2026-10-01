import { h, icon } from '../dom.js';

// The hold is a safety gate, not decoration: it keeps its full length even under reduced motion.
const run = (el, keyframes, opts) => el.animate(keyframes, { fill: 'backwards', ...opts });

const HOLD_MS = 2000;
const C = 2 * Math.PI * 13; // ring circumference

// Press and hold for 2 s. The ring fills linearly; releasing early rewinds it.
// caption: a permanent small line under the label (null for none).
export function holdButton({ label, caption = 'Hold', hint = 'Press and hold', onComplete, className = '', leading, holdMs = HOLD_MS }) {
  const ring = h('circle', { cx: 16, cy: 16, r: 13, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', class: 'hold-ring', 'stroke-dasharray': C, 'stroke-dashoffset': C, transform: 'rotate(-90 16 16)' });
  const track = h('circle', { cx: 16, cy: 16, r: 13, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, opacity: 0.22 });
  const dial = h('span', { class: 'hold-dial' }, h('svg', { viewBox: '0 0 32 32', width: 32, height: 32, 'aria-hidden': 'true' }, track, ring), leading || icon('slider', 16));
  const hintEl = h('span', { class: 'hold-hint', 'aria-live': 'polite' });
  const btn = h('button', { class: 'hold-btn ' + className, type: 'button', 'aria-label': `${label}. ${hint}.` }, dial, h('span', { class: 'hold-text' }, h('span', { class: 'hold-label' }, label), caption ? h('span', { class: 'hold-cap' }, caption) : null));
  const wrap = h('span', { class: 'hold-wrap' }, btn, hintEl);

  let anim = null, holding = false, done = false, hintTimer = 0, keyTimer = 0, dead = false; // dead: the screen has been left
  const showHint = (msg) => { hintEl.textContent = msg; hintEl.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hintEl.classList.remove('show'), 1600); };

  function start(e) {
    if (holding) return;
    holding = true; done = false;
    btn.classList.add('holding');
    try { btn.setPointerCapture(e.pointerId); } catch {}
    anim = run(ring, [{ strokeDashoffset: C }, { strokeDashoffset: 0 }], { duration: holdMs, easing: 'linear' });
    anim.finished.then(() => {
      if (dead || !btn.isConnected || !holding || done) return; // a hold that outlives its screen does nothing
      done = true;
      if (navigator.vibrate) navigator.vibrate(20);
      btn.classList.remove('holding');
      try { onComplete(); } finally {
        setTimeout(() => { holding = false; ring.style.strokeDashoffset = C; if (anim) anim.cancel(); }, 300);
      }
    }).catch(() => {});
    startedAt = performance.now();
  }
  let startedAt = 0;
  function end() {
    if (!holding || done) return;
    holding = false;
    btn.classList.remove('holding');
    if (performance.now() - startedAt < 400) showHint(hint);
    if (anim) {
      const t = anim.currentTime || 0;
      const from = C * (1 - Math.min(1, t / holdMs));
      anim.cancel();
      const back = run(ring, [{ strokeDashoffset: from }, { strokeDashoffset: C }], { duration: 160 });
      back.finished.then(() => back.cancel()).catch(() => {});
    }
  }
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  // Keyboard users: Enter or Space held down for the same time.
  btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { keyTimer = setTimeout(() => { if (!dead && btn.isConnected) onComplete(); }, holdMs); } });
  btn.addEventListener('keyup', () => clearTimeout(keyTimer));
  wrap.button = btn;
  wrap.cleanup = () => { dead = true; clearTimeout(keyTimer); clearTimeout(hintTimer); if (anim) anim.cancel(); };
  return wrap;
}
