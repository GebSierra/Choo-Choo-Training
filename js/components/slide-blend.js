import { animate, reduced } from '../dom.js';
import { accentOf } from '../theme.js';
import { sparkle } from './sparkle.js';

// Slide-to-blend for a word drawn with wordSvg(): the child drags a finger left to right across the word and each
// letter lights up as the finger passes its left edge, while the grown up says the word slowly in time. It is silent.
// Dragging back un-lights letters. Reaching the right edge of the last letter lifts the word and bursts a few stars, the
// lit word holds for 700 ms and then starts again from unlit. Lifting early keeps the lit state for 500 ms, then fades.
//
// The gesture is built not to get lost. The surface is `band`, a generous transparent strip with touch-action: none, so
// a touch that starts anywhere in it never scrolls the stage. The pointer is captured on pointerdown, only horizontal
// movement counts (vertical drift is ignored), a finger that starts left of the word counts from zero and one that
// starts in the middle lights everything to its left as passed. A pointercancel or lost capture does not end the slide:
// it waits a moment for the next move, and only then lets go. A move of under 8 px is a tap.
//
//   band      the element that takes pointer events          svg   the wordSvg whose letters light
//   host      a positioned ancestor for the sparkle            lift  what rises at the end (default: the svg)
//   bar       optional .blend-bar with one <i> inside          accent one colour for every letter (default: each letter's own)
//   onTouch() every touch that lands on the band (stop any demonstration)
//   onTap()   a touch that lands and lifts with under 8 px of movement
//   onProgress(p) 0 to 1 across the word as the finger moves (a wash over a picture)
export function slideBlend({ band, svg, host, lift, bar, accent, onTouch, onTap, onProgress }) {
  const letters = [...svg.querySelectorAll('.glyph-letter')];
  const fill = bar && bar.firstChild;
  letters.forEach((g) => g.style.setProperty('--accent', accent || accentOf(g.dataset.letter)));
  let edges = [], lit = 0, pointer = null, moved = false, startX = 0, startY = 0, busy = false, blocked = false, swallow = false;
  let offTimer = 0, doneTimer = 0, swallowTimer = 0, lostTimer = 0;

  // Edges in screen pixels, from the letters' own geometry (the pop scale never changes them).
  const measure = () => {
    const r = svg.getBoundingClientRect(), k = r.width / Number(svg.dataset.width);
    edges = letters.map((g) => ({ l: r.left + Number(g.dataset.x0) * k, r: r.left + Number(g.dataset.x1) * k }));
  };

  function paint(n, current, progress) {
    lit = n;
    letters.forEach((g, i) => { g.classList.toggle('lit', i < n); g.classList.toggle('current', i === current); });
    band.dataset.lit = String(n);
    if (bar) { bar.style.setProperty('--accent', accent || accentOf(letters[Math.max(0, current)].dataset.letter)); fill.style.transform = `scaleX(${progress})`; }
    if (onProgress) onProgress(progress);
  }
  const clear = () => paint(0, -1, 0);

  function update(x) {
    const first = edges[0], last = edges[edges.length - 1];
    const n = edges.filter((e) => x >= e.l).length;
    let current = edges.findIndex((e) => x >= e.l && x <= e.r);
    if (current < 0) current = n - 1;
    paint(n, current, Math.max(0, Math.min(1, (x - first.l) / (last.r - first.l))));
    if (x >= last.r) complete();
  }

  function complete() {
    busy = true;
    paint(letters.length, letters.length - 1, 1);
    if (!reduced()) animate(lift || svg, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    const h0 = host.getBoundingClientRect(), r0 = svg.getBoundingClientRect();
    sparkle(host, r0.left - h0.left + r0.width / 2, r0.top - h0.top + r0.height / 2, { count: 12, size: [12, 24], reach: [44, 92], sound: 'sparkle' });
    doneTimer = setTimeout(() => { busy = false; blocked = pointer !== null; clear(); }, 700);
  }

  const tie = () => { swallow = true; clearTimeout(swallowTimer); swallowTimer = setTimeout(() => { swallow = false; }, 120); }; // the click that follows is not a second tap
  function letGo() {
    const wasMoved = moved;
    pointer = null; moved = false;
    clearTimeout(lostTimer);
    if (!wasMoved) return;
    tie();
    if (!busy) offTimer = setTimeout(clear, 500);
  }

  band.addEventListener('pointerdown', (e) => {
    if (pointer !== null) return; // a second finger is ignored
    clearTimeout(offTimer); clearTimeout(lostTimer);
    if (onTouch) onTouch();
    measure();
    pointer = e.pointerId; moved = false; startX = e.clientX; startY = e.clientY;
    try { band.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer: fine */ }
  });
  band.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    clearTimeout(lostTimer); // the pointer is still with us after a cancel: carry on
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return; // a tap is not a slide
    moved = true;
    if (blocked && e.clientX < edges[edges.length - 1].r) blocked = false;
    if (!busy && !blocked) update(e.clientX);
  });
  band.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointer) return;
    const wasTap = !moved;
    letGo();
    if (wasTap) { tie(); if (onTap) onTap(); }
  });
  // A cancel or a lost capture is not the end: wait a moment for the next move before letting go.
  const slip = (e) => {
    if (e.pointerId !== pointer) return;
    clearTimeout(lostTimer);
    lostTimer = setTimeout(letGo, 350);
    try { band.setPointerCapture(e.pointerId); } catch { /* already gone */ }
  };
  band.addEventListener('pointercancel', slip);
  band.addEventListener('lostpointercapture', slip);
  // Belt and braces: if the browser still wants to pan during a slide, refuse.
  band.addEventListener('touchmove', (e) => { if (pointer !== null && e.cancelable) e.preventDefault(); }, { passive: false });

  return {
    // True once after a tap or a slide, so a stage's own click handler can ignore the click that ends it.
    swallowClick() { const s = swallow; swallow = false; return s; },
    get lit() { return lit; },
    cleanup() { clearTimeout(offTimer); clearTimeout(doneTimer); clearTimeout(swallowTimer); clearTimeout(lostTimer); },
  };
}

// Puts a band over the focus element: the host's full width, at least 140 px tall (as far as the host allows), centred on
// the focus. Kept in place when the host or the focus changes size.
export function placeBand(band, host, focus, minH = 140) {
  const place = () => {
    const hr = host.getBoundingClientRect(), fr = focus.getBoundingClientRect();
    if (!hr.height || !fr.height) return;
    const tall = Math.min(hr.height, Math.max(minH, fr.height + 80));
    const top = Math.max(0, Math.min(hr.height - tall, fr.top - hr.top + fr.height / 2 - tall / 2));
    Object.assign(band.style, { left: '0px', right: '0px', top: top + 'px', height: tall + 'px' });
  };
  const ro = new ResizeObserver(place);
  ro.observe(host); ro.observe(focus);
  place();
  return { place, stop: () => ro.disconnect() };
}
