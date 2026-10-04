import { h, animate, reduced } from '../dom.js';
import { wordSvg } from '../glyphs.js';
import { engineSvg, puffEl, FUNNEL_TOP } from '../art/train2d.js';
import { pipSvg } from '../art/pip.js';
import { slideTrack } from '../components/slide-track.js';
import { slideBlend, placeBand, startSweep, handCue } from '../components/slide-blend.js';
import { timers } from '../components/game-kit.js';
import { sfx } from '../sfx.js';

const INK = '#1E2140';
const FRIEND = "Pip's friend"; // when no name is set: fits every sentence of Books 1 and 2

// A book is a checkpoint with kind "book" (data/books/<book>.json). The grown-up reads each page aloud and the child reads
// the one big word on it. Books are silent: page text never goes to text-to-speech (so the child's name never reaches a
// speech engine) and no letter sound is played. Art is a slot per page: the 2D Pip, the 2D engine and emoji for now;
// a page with `art.image` shows that picture instead, with no code change.

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
  let i = 0, anims = [], blend = null, bandWatch = null, bandEl = null, cue = null, sweepAnim = null, track = null;
  const keep = (a) => { anims.push(a); return a; };

  const stage = h('div', { class: 'book-stage', dataset: { page: '0' } });
  const el = stage;

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
    const art = h('div', { class: 'book-art' });
    if (a.image) { art.append(h('img', { class: 'book-img', src: a.image, alt: '', decoding: 'async', draggable: 'false' })); return { art, parts: {} }; }
    const parts = {};
    if (a.train) {
      const p = h('span', { class: 'book-part book-train' }, engineSvg({ pose: a.pip || 'idle', still: true }));
      const puffs = h('span', { class: 'book-puffs', 'aria-hidden': 'true' });
      p.append(puffs); p.puffs = puffs; parts.train = p;
    } else if (a.pip) {
      parts.pip = h('span', { class: 'book-part book-pip' }, pipSvg({ pose: a.pip, still: true }));
    }
    if (a.friend) parts.friend = h('span', { class: 'book-part book-friend', role: 'img', 'aria-label': (store.character().name || FRIEND) }, h('span', { class: 'book-emoji' }, '🧒'));
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
      const svg = wordSvg(w, { color: INK, label: w, all: true });
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

  function mountSlider(c) {
    const bar = h('span', { class: 'blend-bar book-bar', 'aria-hidden': 'true' }, h('i'));
    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    c.box.after(bar);
    stage.append(band); bandEl = band;
    blend = slideBlend({ band, svg: c.sliderSvg, host: stage, lift: c.sliderRow, bar, accent: null, onTouch: stopSweep, onTap: () => {} });
    bandWatch = placeBand(band, stage, c.sliderRow);
    sweepAnim = startSweep(c.sliderRow.sweep);
    if (sweepAnim) cue = handCue(stage, bar);
    bar.dataset.bar = '1';
  }
  const stopSweep = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; } };

  // ---- the page ----
  function render(n) {
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

    const back = h('button', { class: 'btn ghost book-back', type: 'button', 'aria-label': 'Back one page', disabled: i === 0, onclick: () => render(i - 1) }, 'Back');
    const last = i === pages.length - 1;
    const next = h('button', { class: 'btn book-next', type: 'button', onclick: () => render(i + 1) }, 'Next page');
    const nav = h('div', { class: 'book-nav' }, back, last ? null : next);
    const kids = [read];
    let c = null;

    if (kind === 'drag') {
      const art = h('div', { class: 'book-art book-drag' });
      track = slideTrack({ handle: engineSvg({ still: true }), onComplete: () => { track.dataset.done = '1'; sfx.play('toot'); } });
      track.classList.add('book-track');
      art.append(track);
      kids.push(art);
    } else if (kind === 'review') {
      const tiles = h('div', { class: 'book-tiles' }, page.words.map((w) => {
        const svg = wordSvg(w, { color: INK, label: w, all: true });
        svg.style.width = `calc(var(--tile-cap, 60px) * ${Number(svg.dataset.width) / Number(svg.dataset.height)})`;
        svg.style.maxWidth = '100%';
        const tile = h('button', { class: 'book-tile', type: 'button', 'aria-label': w, dataset: { word: w } }, h('span', { class: 'glyph-row' }, svg));
        tile.addEventListener('click', () => {
          tile.classList.add('lit');
          keep(animate(tile, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' }));
        });
        return tile;
      }));
      kids.push(tiles);
      setDone(true);
    } else {
      const s = scene(page);
      kids.push(s.art);
      if (page.child) { c = child(page); kids.push(c.box); }
    }
    stage.classList.toggle('has-child', !!c);
    stage.replaceChildren(...kids, nav);
    if (c && c.sliderSvg) mountSlider(c);
    if (!reduced()) keep(animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'none' }));
    setProgress(i);
    refresh();
  }
  render(0);

  return {
    el, flush: true,
    parts: () => [], // silent: the page text, and so the child's name, never reaches a speech engine
    script: () => 'Read the page aloud. When you reach the big word, point to it and let your child read it. Do not say letter names.',
    gist: () => 'Read; your child reads the big word',
    again: () => { setDone(false); render(0); },
    cleanup: teardown,
  };
}
