import { h, animate, reduced } from '../dom.js';
import { wordSvg } from '../glyphs.js';
import { engineSvg, puffEl, FUNNEL_TOP } from '../art/train2d.js';
import { pipSvg } from '../art/pip.js';
import { kidSvg } from '../art/kid.js';
import { slideTrack } from '../components/slide-track.js';
import { slideBlend, placeBand, startSweep, handCue } from '../components/slide-blend.js';
import { timers } from '../components/game-kit.js';
import { sfx } from '../sfx.js';
import { pageTurner } from '../components/page-turn.js';
import { bookScene, SCENES } from '../art/scenes.js';

const INK = '#1E2140';
const FRIEND = "Pip's friend"; // when no name is set: fits every sentence of Books 1 and 2

// A book is a checkpoint with kind "book" (data/books/<book>.json). The grown-up reads each page aloud and the child reads
// the one big word on it. Books are silent: page text never goes to text-to-speech (so the child's name never reaches a
// speech engine) and no letter sound is played. Art is a slot per page: a backdrop drawn from the page (its `scene`:
// meadow, track, station, hill, picnic or sunset; js/art/scenes.js) with the 2D Pip, the 2D engine, the kid and emoji in
// front of it; a page with `art.image` shows that picture instead, with no code change. The page is one cream sheet:
// the picture full-bleed across the top, the text on the paper below it, quiet arrows on the page edges.

// Fetches the book and puts the child's name where {name} stands.
export async function loadBook(checkpoint, store) {
  const res = await fetch(`data/books/${checkpoint.book}.json`);
  if (!res.ok) throw new Error('book ' + res.status);
  const book = await res.json();
  const name = store.character().name || FRIEND;
  const fill = (s) => (typeof s === 'string' ? s.replaceAll('{name}', name) : s);
  return {
    ...book, title: fill(book.title),
    pages: book.pages.map((p) => ({ ...p, read: fill(p.read), after: fill(p.after), tap: p.tap ? { ...p.tap, label: fill(p.tap.label) } : undefined })),
  };
}

const TAP_ANIMS = {
  wave: [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)', offset: 0.25 }, { transform: 'rotate(10deg)', offset: 0.6 }, { transform: 'rotate(0)' }],
  giggle: [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-7deg) scale(1.08)', offset: 0.2 }, { transform: 'rotate(7deg) scale(1.08)', offset: 0.45 }, { transform: 'rotate(-4deg) scale(1.04)', offset: 0.7 }, { transform: 'rotate(0) scale(1)' }],
  bounce: [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)', offset: 0.35 }, { transform: 'translateY(0)', offset: 0.65 }, { transform: 'translateY(-9px)', offset: 0.82 }, { transform: 'translateY(0)' }],
  walk: [{ transform: 'translateX(0) translateY(0)' }, { transform: 'translateX(14px) translateY(-6px)', offset: 0.2 }, { transform: 'translateX(28px) translateY(0)', offset: 0.4 }, { transform: 'translateX(42px) translateY(-6px)', offset: 0.6 }, { transform: 'translateX(56px) translateY(0)', offset: 0.8 }, { transform: 'translateX(0)' }],
  toot: [{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.3 }, { transform: 'scale(1)' }],
};
const TAP_MS = { wave: 700, giggle: 800, bounce: 800, walk: 900, toot: 500 };

export function bookBuild({ checkpoint, book, store, refresh, setProgress, setDone }) {
  const pages = book.pages;
  const T = timers();
  const INTERACTIVE = 'button, input, .slide-band, .slide-track, .book-word[data-slider], .book-tile';
  let i = 0, anims = [], blend = null, bandWatch = null, bandEl = null, cue = null, sweepAnim = null, track = null;
  let spread = false, turnId = 0, coverAnim = null;
  const keep = (a) => { anims.push(a); return a; };

  const stage = h('div', { class: 'book-stage', dataset: { page: '0' } });
  const el = stage;
  const block = h('div', { class: 'book-block' });
  // the folded corner and its twin are extra touch targets for the arrows below: hidden from a screen reader and the tab order
  const cornerPrev = h('button', { class: 'book-corner prev', type: 'button', 'aria-hidden': 'true', tabindex: '-1', hidden: true, onclick: () => go(i - 1) });
  const cornerNext = h('button', { class: 'book-corner next', type: 'button', 'aria-hidden': 'true', tabindex: '-1', onclick: () => go(i + 1) });
  block.append(cornerPrev, cornerNext);
  const cover = h('button', { class: 'book-cover', type: 'button', 'aria-label': `Open the book: ${book.title}` },
    h('span', { class: 'cover-front' },
      h('span', { class: 'cover-title' }, book.title),
      h('span', { class: 'cover-plate', 'aria-hidden': 'true' }, bookScene('meadow'),
        h('span', { class: 'cover-pip' }, pipSvg({ pose: 'wave', still: false }), h('span', { class: 'cover-kid' }, kidSvg({ ...store.character(), pose: 'wave', still: false })))),
      h('span', { class: 'cover-hint' }, 'Tap to open')),
    h('span', { class: 'cover-back', 'aria-hidden': 'true' }));
  const bookEl = h('div', { class: 'book', tabindex: '0', dataset: { state: 'closed', spread: '0' } }, block, cover);
  // The grown-up page: shown once per book before the cover; the small "i" on the cover brings it back.
  const introKey = `storyIntro:${checkpoint.id}`;
  const seenMap = () => { const m = store.settings.seenScripts; return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; };
  let introEl = null;
  const infoBtn = h('button', { class: 'book-info', type: 'button', 'aria-label': 'Story time: how to read this book', onclick: () => showIntro() }, 'i');
  function showIntro() {
    if (introEl) return;
    const go = () => { store.setSetting('seenScripts', { ...seenMap(), [introKey]: true }); introEl.remove(); introEl = null; infoBtn.hidden = state() !== 'closed'; if (state() === 'closed') openCover(); };
    introEl = h('div', { class: 'ride-intro book-intro', role: 'dialog', 'aria-labelledby': 'book-intro-t' },
      h('div', { class: 'ride-intro-card' },
        h('h2', { id: 'book-intro-t' }, 'Story time'),
        h('ul', { class: 'book-intro-list' },
          h('li', {}, 'You read the small words out loud.'),
          h('li', {}, 'Your child reads the big words. They use only sounds your child knows.'),
          h('li', {}, 'Under some words is a slider. Have your child slide a finger along it while saying each sound, then say the whole word.'),
          h('li', {}, 'Tap the pictures to make them move.'),
          h('li', {}, 'Swipe or tap the corner to turn the page.')),
        h('div', { class: 'ride-intro-btns' }, h('button', { class: 'btn primary ride-intro-go book-intro-go', type: 'button', onclick: go }, 'Open the book'))));
    stage.append(introEl); infoBtn.hidden = true;
    try { introEl.querySelector('button').focus({ preventScroll: true }); } catch { /* fine */ }
  }
  stage.append(bookEl, infoBtn);
  const state = () => bookEl.dataset.state;
  const setState = (s) => { bookEl.dataset.state = s; infoBtn.hidden = s !== 'closed'; };
  const turner = pageTurner({ block, spread: () => spread, reducedMotion: reduced });

  function teardown() {
    T.clear();
    anims.forEach((a) => { try { a.cancel(); } catch { /* already gone */ } }); anims = [];
    if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; }
    if (cue) { cue.stop(); cue = null; }
    if (blend) { blend.cleanup(); blend = null; }
    if (bandWatch) { bandWatch.stop(); bandWatch = null; }
    if (bandEl) { bandEl.remove(); bandEl = null; }
    if (track) { track.cleanup(); track = null; }
  }

  // ---- the picture ----
  function scene(page) {
    const a = page.art || {};
    const kind = SCENES.includes(page.scene) ? page.scene : SCENES.includes(a.scene) ? a.scene : 'meadow';
    const art = h('div', { class: 'book-art' + (a.train ? ' has-train' : ''), dataset: { scene: kind } });
    if (a.image) { art.append(h('img', { class: 'book-img', src: a.image, alt: '', decoding: 'async', draggable: 'false' })); return { art, parts: {} }; }
    art.append(bookScene(kind));
    const parts = {};
    if (a.train) {
      const p = h('span', { class: 'book-part book-train' }, engineSvg({ pose: a.pip || 'idle', still: true }));
      const puffs = h('span', { class: 'book-puffs', 'aria-hidden': 'true' });
      p.append(puffs, h('span', { class: 'book-smoke', 'aria-hidden': 'true', style: { left: `calc(${FUNNEL_TOP.x * 100}% - 11px)`, top: `calc(${FUNNEL_TOP.y * 100}% - 11px)` } }));
      p.puffs = puffs; parts.train = p;
    } else if (a.pip) {
      parts.pip = h('span', { class: 'book-part book-pip' }, pipSvg({ pose: a.pip, still: false }));
    }
    if (a.friend) parts.friend = h('span', { class: 'book-part book-friend' }, kidSvg({ ...store.character(), pose: page.tap && page.tap.on === 'friend' ? 'idle' : 'wave', still: false, label: store.character().name || FRIEND }));
    if (a.emoji) parts.emoji = h('span', { class: 'book-part book-emojis', role: 'img', 'aria-hidden': 'true' }, a.emoji.map((e) => h('span', { class: 'book-emoji' }, e)));
    const order = ['pip', 'train', 'friend', 'emoji'].filter((k) => parts[k]);
    for (const k of order) {
      if (page.tap && page.tap.on === k) {
        const btn = h('button', { class: 'book-tap', type: 'button', 'aria-label': page.tap.label, onclick: () => tapAnim(page, parts[k]) }, parts[k]);
        parts[k].tapBtn = btn;
        art.append(btn);
      } else art.append(parts[k]);
    }
    return { art, parts };
  }

  function tapAnim(page, node) {
    const name = page.tap.anim;
    if (name === 'toot') {
      sfx.play('toot');
      if (node.puffs) {
        const r = node.firstChild.getBoundingClientRect(), o = node.getBoundingClientRect();
        const p = puffEl();
        Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
        node.puffs.append(p);
        const a = keep(animate(p, [{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: 'translate(-18px,-36px) scale(1.5)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' }));
        a.finished.then(() => p.remove()).catch(() => p.remove());
      }
    }
    const target = node.tapBtn || node;
    keep(animate(target, TAP_ANIMS[name] || TAP_ANIMS.bounce, { duration: TAP_MS[name] || 700, easing: 'ease-in-out', fill: 'none' }));
  }

  // ---- the child's word(s) ----
  function child(page) {
    const words = page.child.split(' ');
    const box = h('div', { class: 'book-child', 'aria-label': page.child, role: 'group' });
    let sliderSvg = null, sliderRow = null;
    const els = words.map((w) => {
      const svg = wordSvg(w, { color: INK, label: w, all: true, font: true });
      svg.style.width = `calc(var(--cap, 84px) * ${Number(svg.dataset.width) / Number(svg.dataset.height)})`;
      svg.style.maxWidth = '100%';
      if (page.slider && w === page.slider && !sliderSvg) {
        sliderSvg = svg;
        const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
        sliderRow = h('span', { class: 'glyph-row book-word', dataset: { slider: '1' } }, svg, sweep);
        sliderRow.sweep = sweep;
        return sliderRow;
      }
      return h('span', { class: 'glyph-row book-word' }, svg);
    });
    box.append(...els);
    return { box, sliderSvg, sliderRow };
  }

  let pending = null; // what start() must mount for the page just painted
  function mountSlider(c, host) {
    const bar = c.bar;
    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    host.append(band); bandEl = band;
    blend = slideBlend({ band, svg: c.sliderSvg, host, lift: c.sliderRow, bar, accent: null, onTouch: stopSweep, onTap: () => {} });
    bandWatch = placeBand(band, host, c.sliderRow);
    sweepAnim = startSweep(c.sliderRow.sweep);
    if (sweepAnim && bar.getBoundingClientRect().width) cue = handCue(host, bar); // in a spread the bar is hidden: the sweep alone shows the way
    bar.dataset.bar = '1';
  }
  const stopSweep = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; } };

  // ---- the page ----
  const liveSheet = (side, kind) => { const s = document.createElement('section'); s.className = `book-sheet paper is-${side} is-live kind-${kind}`; return s; };
  const chevron = (d) => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, h('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  const sceneOf = (page, fallback) => (SCENES.includes(page.scene) ? page.scene : fallback);
  function paint(n) {
    teardown();
    i = n;
    const page = pages[i], kind = page.kind || 'page';
    stage.dataset.page = String(i);
    stage.dataset.kind = kind;

    const read = h('section', { class: 'book-read', 'aria-label': 'Read this aloud' });
    if (i === 0) read.append(h('p', { class: 'book-title' }, book.title));
    read.append(h('p', { class: 'book-text' }, page.read));
    if (page.sound) read.append(h('p', { class: 'book-says' }, 'Your child says: ', h('b', {}, page.sound)));
    if (page.after) read.append(h('p', { class: 'book-after' }, page.after));

    const last = i === pages.length - 1;
    const back = h('button', { class: 'book-arrow book-back', type: 'button', 'aria-label': 'Previous page', disabled: i === 0, onclick: () => go(i - 1) }, chevron('M15 5l-7 7 7 7'));
    const next = last ? null : h('button', { class: 'book-arrow book-next', type: 'button', 'aria-label': 'Next page', onclick: () => go(i + 1) }, chevron('M9 5l7 7-7 7'));
    let art, c = null;
    const rest = []; // under the picture: the child's word, the review tiles

    if (kind === 'drag') {
      const sc = sceneOf(page, 'hill');
      art = h('div', { class: 'book-art book-drag', dataset: { scene: sc } }, bookScene(sc));
      track = slideTrack({ handle: engineSvg({ still: true }), onComplete: () => { track.dataset.done = '1'; sfx.play('toot'); } });
      track.classList.add('book-track');
      art.append(track);
    } else if (kind === 'review') {
      const sc = sceneOf(page, 'sunset');
      art = h('div', { class: 'book-art', dataset: { scene: sc } }, bookScene(sc));
      rest.push(h('div', { class: 'book-tiles' + (page.words.length > 6 ? ' is-many' : '') }, page.words.map((w) => {
        const svg = wordSvg(w, { color: INK, label: w, all: true, font: true });
        svg.style.width = `calc(var(--tile-cap, 60px) * ${Number(svg.dataset.width) / Number(svg.dataset.height)})`;
        svg.style.maxWidth = '100%';
        const tile = h('button', { class: 'book-tile', type: 'button', 'aria-label': w, dataset: { word: w } }, h('span', { class: 'glyph-row' }, svg));
        tile.addEventListener('click', () => {
          tile.classList.add('lit');
          keep(animate(tile, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' }));
        });
        return tile;
      })));
      setDone(true);
    } else {
      art = scene(page).art;
      if (page.child) {
        c = child(page); rest.push(c.box);
        if (c.sliderSvg) { c.bar = h('span', { class: 'blend-bar book-bar', 'aria-hidden': 'true' }, h('i')); rest.push(c.bar); }
      }
    }
    const folio = h('span', { class: 'book-folio', 'aria-hidden': 'true' }, String(i + 1));
    const R = liveSheet('right', kind), L = spread ? liveSheet('left', kind) : null;
    if (spread) {
      L.append(h('div', { class: 'book-body' }, read), back);
      R.append(art, ...(rest.length ? [h('div', { class: 'book-body' }, ...rest)] : []), ...(next ? [next] : []), folio);
    } else R.append(art, h('div', { class: 'book-body' }, read, ...rest), back, ...(next ? [next] : []), folio);
    block.querySelectorAll('.book-sheet.is-live').forEach((s) => s.remove());
    block.prepend(...(L ? [L] : []), R);
    stage.classList.toggle('has-child', !!c);
    cornerPrev.hidden = i === 0;
    cornerNext.hidden = last;
    pending = c && c.sliderSvg ? { c, host: R } : null;
    fit();
    setProgress(i);
    refresh();
  }

  // Fitting one page: the picture has already given way (it is the flexible part, down to its minimum); if the page still
  // does not fit, the child's word and the text step down together, a size at a time. The word never goes below 36 px and
  // the text never below 16 px, so the word stays the biggest thing on the page. Then the arrows are centred on the picture.
  const CAPS = [84, 74, 66, 58, 52, 46, 41, 36];
  function fit() {
    for (const sheet of block.querySelectorAll('.book-sheet.is-live')) {
      const box = sheet.querySelector('.book-child'), rd = sheet.querySelector('.book-read'), art = sheet.querySelector('.book-art');
      sheet.style.removeProperty('--read-fs');
      if (box) box.style.removeProperty('--cap');
      const fs0 = rd ? parseFloat(getComputedStyle(rd).fontSize) || 20 : 20;
      const cap0 = box ? parseFloat(getComputedStyle(box).getPropertyValue('--cap')) || 78 : 0;
      const caps = box ? [cap0, ...CAPS.filter((k) => k < cap0)] : [cap0];
      const fits = () => sheet.scrollHeight <= sheet.clientHeight + 0.5 && (!box || box.getBoundingClientRect().width <= sheet.clientWidth);
      for (let step = 0; step < 16; step++) {
        if (box) box.style.setProperty('--cap', caps[Math.min(step, caps.length - 1)] + 'px');
        if (rd) sheet.style.setProperty('--read-fs', Math.max(16, fs0 - Math.floor(step / 2)) + 'px');
        if (fits()) break;
      }
      if (art && art.offsetHeight) sheet.style.setProperty('--arrow-y', Math.round(art.offsetTop + art.offsetHeight / 2 - 24) + 'px'); else sheet.style.removeProperty('--arrow-y');
    }
  }

  // Runs after a turn (or at once): the parts that need measuring or that run, so nothing is measured mid-turn.
  function start() {
    if (state() !== 'open') return;
    if (pending) { mountSlider(pending.c, pending.host); pending = null; }
  }

  async function go(n) {
    if (n < 0 || n >= pages.length || n === i) return;
    if (state() !== 'open' && state() !== 'turning') return;
    if (turner.busy) turner.finish();
    const my = ++turnId;
    setState('turning');
    await turner.turn(Math.sign(n - i), () => paint(n));
    if (my !== turnId) return;
    setState('open');
    start();
  }

  // ---- fingers ----
  let ds = null;
  const sheetWidth = () => (block.querySelector('.book-sheet.is-live') || block).offsetWidth || 300;
  block.addEventListener('pointerdown', (e) => {
    if (state() !== 'open' || !e.isPrimary || e.button > 0 || e.target.closest(INTERACTIVE)) return;
    ds = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: null, dir: 0, k: 0, samples: [[e.clientX, performance.now()]] };
  });
  block.addEventListener('pointermove', (e) => {
    if (!ds || e.pointerId !== ds.id) return;
    const dx = e.clientX - ds.x, dy = e.clientY - ds.y;
    ds.samples.push([e.clientX, performance.now()]);
    if (ds.samples.length > 6) ds.samples.shift();
    if (!ds.drag) {
      if (Math.abs(dx) <= 12 || Math.abs(dx) <= 1.4 * Math.abs(dy)) return;
      const dir = dx < 0 ? 1 : -1, target = i + dir;
      if (target < 0 || target >= pages.length) { ds = null; return; }
      turnId++; setState('turning');
      ds.dir = dir; ds.origin = i;
      ds.drag = turner.drag(dir, () => paint(target));
      try { block.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer: fine */ }
    }
    if (Math.sign(dx) === -ds.dir || dx === 0) ds.k = Math.min(1, Math.abs(dx) / sheetWidth()); else ds.k = 0;
    ds.drag.move(ds.k);
  });
  const lift = async (e) => {
    if (!ds || e.pointerId !== ds.id) return;
    const d = ds; ds = null;
    if (!d.drag) return;
    const my = ++turnId;
    const [x0, t0] = d.samples[0], [x1, t1] = d.samples[d.samples.length - 1];
    const v = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * -d.dir : 0; // px per ms in the direction of the turn
    const commit = e.type === 'pointerup' && (d.k > 50 / 180 || v > 0.35);
    await d.drag.release(commit, () => paint(d.origin));
    if (my !== turnId) return;
    setState('open');
    start();
  };
  block.addEventListener('pointerup', lift);
  block.addEventListener('pointercancel', lift);
  bookEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  });

  // ---- the cover ----
  const coverMove = (open) => {
    if (reduced()) return cover.animate(open ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
    return cover.animate(open ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }] : [{ transform: 'rotateY(-180deg)' }, { transform: 'rotateY(0deg)' }],
      { duration: open ? 800 : 700, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
  };
  async function openCover() {
    if (state() !== 'closed') return;
    setState('opening');
    coverAnim = coverMove(true);
    try { await coverAnim.finished; } catch { return; }
    coverAnim.cancel(); coverAnim = null;
    cover.hidden = true;
    setState('open');
    start();
    try { bookEl.focus({ preventScroll: true }); } catch { /* fine */ }
  }
  let cs = null;
  cover.addEventListener('click', openCover);
  cover.addEventListener('pointerdown', (e) => { if (e.isPrimary) cs = { id: e.pointerId, x: e.clientX }; });
  cover.addEventListener('pointermove', (e) => { if (cs && e.pointerId === cs.id && cs.x - e.clientX > 40) { cs = null; openCover(); } });
  cover.addEventListener('pointerup', () => { cs = null; });
  cover.addEventListener('pointercancel', () => { cs = null; });

  function close() {
    turner.finish(); teardown();
    return new Promise((resolve) => {
      if (state() === 'closed' || state() === 'closing') return resolve();
      cover.hidden = false;
      setState('closing');
      const a = coverMove(false);
      a.finished.then(resolve, resolve);
    });
  }

  // ---- one page or a spread: the stage decides ----
  const wantSpread = () => { const w = stage.clientWidth, hh = stage.clientHeight; return w >= 1.3 * hh && (w - 40) / 2 >= 262 && hh >= 250; };
  const ro = new ResizeObserver(() => {
    const s = wantSpread();
    if (s === spread) { fit(); return; }
    spread = s; turner.finish(); turnId++;
    bookEl.dataset.spread = s ? '1' : '0';
    if (state() === 'turning') setState('open');
    paint(i); start();
  });
  ro.observe(stage);
  const onVis = () => bookEl.classList.toggle('is-paused', document.hidden);
  document.addEventListener('visibilitychange', onVis);

  paint(0);
  if (!seenMap()[introKey]) showIntro();

  return {
    el, flush: true,
    parts: () => [], // silent: the page text, and so the child's name, never reaches a speech engine
    script: () => 'Read the page aloud. When you reach the big word, point to it and let your child read it. Do not say letter names.',
    gist: () => 'Read; your child reads the big word',
    again: () => { setDone(false); turner.finish(); turnId++; if (state() === 'turning') setState('open'); paint(0); start(); },
    close,
    cleanup() { teardown(); turner.cleanup(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); if (coverAnim) coverAnim.cancel(); },
  };
}
