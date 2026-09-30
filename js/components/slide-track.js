import { h, animate, reduced } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { accentOf } from '../theme.js';

const HANDLE = 76;
const PAD = 6;

// Drag the letter along the track while saying its sound. The one interaction where a clip
// is tied to a child's gesture: it plays once when the drag starts (skipped if no clip exists).
export function slideTrack({ letter, speech, sound, onComplete }) {
  const accent = accentOf(letter);
  const wavePath = (() => {
    let d = 'M0 20';
    for (let i = 0; i < 8; i++) d += ` q12.5 -14 25 0 t25 0`.replace('t25 0', 't25 0');
    return d;
  })();
  const wave = h('span', { class: 'st-wave', 'aria-hidden': 'true' },
    h('svg', { viewBox: '0 0 400 40', preserveAspectRatio: 'none' }, h('path', { d: 'M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20', fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 5, 'stroke-linecap': 'round' }),
      h('path', { d: 'M0 28 Q25 12 50 28 T100 28 T150 28 T200 28 T250 28 T300 28 T350 28 T400 28', fill: 'none', stroke: 'rgba(255,255,255,.3)', 'stroke-width': 4, 'stroke-linecap': 'round' })));
  const fill = h('span', { class: 'st-fill', style: { background: accent } }, wave);
  const hint = h('span', { class: 'st-hint', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const goal = h('span', { class: 'st-goal', 'aria-hidden': 'true' });
  const bloom = h('span', { class: 'st-bloom', style: { '--accent': accent }, 'aria-hidden': 'true' });
  const glyph = h('span', { class: 'st-glyph' }, glyphSvg(letter, { color: accent, label: 'slide this letter' }));
  const handle = h('button', { class: 'st-handle', type: 'button', 'aria-label': 'Slide the letter and say its sound', style: { '--accent': accent } }, glyph);
  const track = h('div', { class: 'slide-track', style: { '--accent': accent }, dataset: { count: '0' } }, fill, hint, goal, bloom, handle);
  track.classList.add('hold');

  let W = 0, max = 0, x = 0, startX = 0, startPointer = 0, dragging = false, atEnd = false, idleTimer = 0, homeTimer = 0, glide = [], count = 0, keyBusy = false;
  const measure = () => { W = track.clientWidth; max = Math.max(1, W - HANDLE - PAD * 2); };
  const place = (px) => {
    x = Math.max(0, Math.min(max, px));
    handle.style.transform = `translate3d(${x}px,0,0)`;
    fill.style.transform = `translate3d(${x + HANDLE / 2 + PAD - W}px,0,0)`;
  };
  place(0);
  new ResizeObserver(() => { measure(); place(x); }).observe(track);
  requestAnimationFrame(measure);

  const setMoving = () => {
    track.classList.add('moving');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => track.classList.remove('moving'), 140);
  };

  const stopGlide = () => { glide.forEach((a) => a.cancel()); glide = []; };

  function goHome(ms, easing) {
    stopGlide();
    const from = x;
    const a1 = animate(handle, [{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: ms, easing, fill: 'forwards' });
    const a2 = animate(fill, [{ transform: `translate3d(${from + HANDLE / 2 + PAD - W}px,0,0)` }, { transform: `translate3d(${HANDLE / 2 + PAD - W}px,0,0)` }], { duration: ms, easing, fill: 'forwards' });
    glide = [a1, a2];
    x = 0;
    a1.finished.then(() => { place(0); stopGlide(); track.classList.remove('is-end'); atEnd = false; }).catch(() => {});
  }

  function complete() {
    if (atEnd) return; // a drag and a key press cannot both complete
    atEnd = true; dragging = false;
    track.classList.remove('dragging');
    track.classList.add('is-end');
    count++; track.dataset.count = String(count);
    place(max);
    if (navigator.vibrate) navigator.vibrate(20);
    bloom.classList.remove('go'); void bloom.offsetWidth; bloom.classList.add('go');
    if (!reduced()) animate(handle.firstChild, [{ transform: 'scale(1.15)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (onComplete) onComplete();
    clearTimeout(homeTimer);
    homeTimer = setTimeout(() => goHome(reduced() ? 0 : 600, 'ease-in-out'), 600);
  }

  handle.addEventListener('pointerdown', (e) => {
    if (atEnd) return;
    e.preventDefault();
    measure();
    stopGlide(); place(x);
    dragging = true; startPointer = e.clientX; startX = x;
    handle.setPointerCapture(e.pointerId);
    track.classList.add('dragging');
    if (speech) speech.say([{ clip: letter }]);
    setMoving();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const nx = startX + (e.clientX - startPointer);
    if (Math.abs(nx - x) > 0.3) setMoving();
    place(nx);
    if (x >= max - 2) complete();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging', 'moving');
    if (!atEnd) goHome(x > 0 ? 340 : 0, 'cubic-bezier(.2,.8,.2,1)');
  };
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
  handle.addEventListener('lostpointercapture', release);
  // Keyboard: activate to slide it across automatically.
  handle.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !atEnd && !keyBusy) {
      e.preventDefault(); measure(); keyBusy = true;
      if (speech) speech.say([{ clip: letter }]);
      const a = animate(handle, [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${max}px,0,0)` }], { duration: 500, fill: 'forwards' });
      a.finished.then(() => { a.cancel(); keyBusy = false; complete(); }).catch(() => { keyBusy = false; });
    }
  });
  track.cleanup = () => { clearTimeout(homeTimer); clearTimeout(idleTimer); };
  return track;
}
