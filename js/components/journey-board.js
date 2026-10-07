// The journey board (docs/CURRICULUM.md section 9): a full-screen overlay with a badge for each of the eleven worlds
// (the current one lit, finished ones ticked in gold, later ones a soft outline with a lock) and, below, the current
// world opened up as a little track with one station per unit: its number and its sounds in letters, finished units
// ticked and a small Pip standing at the current one. Static DOM and SVG: a short fade and rise on entry (WAAPI, transform
// and opacity only, none under reduced motion) and no loop. "All aboard!" (or the corner button, or Back) closes it. Returns { el, close }.
// Since the journey-board decision the board lives on the Home (the map button), on the world-crossing card (journeyMini) and
// in Grownups > Progress (journeyMap): the worlds are little stations on a railway with a small train at the current one,
// and the gold level stars the old star board showed are inside it.
import { h, icon, animate, reduced } from '../dom.js';
import { pipSvg } from '../art/pip.js';
import { letterFace } from './letter-face.js';
import { accentOf } from '../theme.js';
import { currentWorld, currentUnit, unitsIn, unitDone, worldDone, lessonsOfUnit } from '../worlds.js';
import { starBoard } from './star-board.js';
import { builtLevels } from '../levels.js';
import { TRAIN as C } from '../art/train2d.js';
import { pushSheet } from './back-sheet.js';

const tick = () => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'jb-tick' }, h('path', { d: 'M6 12.5l4 4 8-9', fill: 'none', stroke: '#fff', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

// A little engine facing right (house palette, flat fills), for the railway map. Decoration only.
export function miniTrain() {
  const wheel = (cx) => h('g', {}, h('circle', { cx, cy: 33, r: 5.2, fill: C.red }), h('circle', { cx, cy: 33, r: 2, fill: C.sun }));
  return h('svg', { class: 'jb-train-art', viewBox: '0 0 72 42', 'aria-hidden': 'true' },
    h('ellipse', { cx: 37, cy: 39.5, rx: 30, ry: 2, fill: 'rgba(60,40,20,.18)' }),
    h('rect', { x: 8, y: 27, width: 58, height: 4.5, rx: 2, fill: C.navyLight }),
    h('rect', { x: 10, y: 8, width: 24, height: 21, rx: 5, fill: C.red }), h('rect', { x: 8, y: 5, width: 28, height: 5, rx: 2.5, fill: C.navy }),
    h('rect', { x: 15, y: 13, width: 10, height: 8, rx: 2.5, fill: '#FFF6D6' }),
    h('rect', { x: 32, y: 14, width: 31, height: 15, rx: 7.5, fill: C.navy }), h('rect', { x: 43, y: 14, width: 3, height: 15, fill: C.sun }),
    h('rect', { x: 50, y: 6, width: 8, height: 9, rx: 1.5, fill: C.navy }), h('rect', { x: 48.5, y: 4, width: 11, height: 3.5, rx: 1.75, fill: C.sun }),
    h('circle', { cx: 65, cy: 21, r: 3, fill: C.sun }),
    wheel(18), wheel(35), wheel(53));
}

const worldState = (store, curriculum, w, cur) => (cur && w.id === cur.id ? 'current' : worldDone(store, curriculum, w.id) ? 'done' : 'future');

// The railway of worlds: one station badge per world on a track, the current one with the little train on it, finished ones
// with a gold tick, later ones outlined with a lock, and the gold level stars below. No unit track: that is journeyBoard's.
// Returns { el, list, starCard, stars, badges, cur }.
export function journeyMap({ curriculum, store, hold = null } = {}) {
  const worlds = curriculum.worlds || [];
  const cur = currentWorld(store, curriculum) || worlds[0];
  const badges = worlds.map((w) => {
    const state = worldState(store, curriculum, w, cur);
    const finished = worldDone(store, curriculum, w.id);
    const label = `World ${w.n}, ${w.name}${state === 'current' ? (finished ? ', finished, you are here' : ', you are here') : finished ? ', finished' : ', not yet'}`;
    return h('li', { class: `jb-badge is-${state}`, style: { '--wc': w.color }, role: 'img', 'aria-label': label, dataset: { world: w.id, state, finished: finished ? '1' : '0' } },
      state === 'current' ? h('span', { class: 'jb-train', 'aria-hidden': 'true' }, miniTrain()) : null,
      h('span', { class: 'jb-stop', 'aria-hidden': 'true' },
        h('span', { class: 'jb-badge-n' }, String(w.n)),
        finished ? h('span', { class: 'jb-badge-mark gold' }, tick()) : null,
        state === 'future' ? h('span', { class: 'jb-badge-mark lock' }, icon('lock', 14)) : null));
  });
  const stars = starBoard(curriculum, store, { hold });
  const have = stars.el.querySelectorAll('.level-star.on').length, total = builtLevels(curriculum).length;
  const starCard = h('div', { class: 'jb-stars' },
    h('p', { class: 'jb-stars-title' }, 'Gold stars'),
    stars.el,
    h('p', { class: 'jb-stars-n', dataset: { have: String(have) } }, `${have} of ${total}`));
  const list = h('ol', { class: 'jb-badges', 'aria-label': 'The worlds' }, ...badges);
  const el = h('div', { class: 'jm' }, list, starCard);
  return { el, list, starCard, stars, badges, cur };
}

export function journeyBoard({ host, curriculum, store, onClose }) {
  const map = journeyMap({ curriculum, store });
  const cur = map.cur;
  const curUnit = cur ? currentUnit(store, curriculum, cur.id) : null;
  const still = reduced();
  const badges = map.badges;
  const allDone = worldDone(store, curriculum, cur.id);

  const stations = unitsIn(curriculum, cur.id).map((u) => {
    const built = lessonsOfUnit(curriculum, u.id).length > 0;
    const done = unitDone(store, curriculum, u.id);
    const here = !!curUnit && u.id === curUnit.id;
    const state = done ? 'done' : here ? 'here' : 'later';
    const sounds = u.sounds.length
      ? h('span', { class: 'jb-sounds', 'aria-hidden': 'true' }, ...u.sounds.map((k) => h('span', { class: 'jb-sound' }, letterFace(k, built ? accentOf(k) : '#9A9EB8'))))
      : h('span', { class: 'jb-title' }, u.title || 'Coming');
    return h('li', { class: `jb-stn is-${state}${built ? '' : ' unbuilt'}`, 'aria-label': `Unit ${u.id}${u.sounds.length ? ': ' + u.sounds.join(' ') : ''}${done ? ', finished' : here ? ', you are here' : ''}`, dataset: { unit: u.id, state } },
      here ? h('span', { class: 'jb-pip', 'aria-hidden': 'true' }, pipSvg({ pose: 'wave', still: true })) : null,
      h('span', { class: 'jb-dot', 'aria-hidden': 'true' }, done ? tick() : h('span', { class: 'jb-id' }, u.id)),
      sounds);
  });

  const track = h('ol', { class: 'jb-track', 'aria-label': `The units of ${cur.name}` }, ...stations);
  const go = h('button', { class: 'btn big jb-go', type: 'button', onclick: () => close() }, 'All aboard!', icon('arrowRight', 26));
  const x = h('button', { class: 'jb-x', type: 'button', 'aria-label': 'Close', onclick: () => close() }, icon('close', 26));
  const el = h('div', { class: 'jb' + (still ? ' still' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Your journey' },
    x,
    h('div', { class: 'jb-scroll' },
      h('h2', { class: 'jb-head' }, 'Your journey'),
      h('div', { class: 'jb-map' }, map.list),
      h('section', { class: 'jb-world', style: { '--wc': cur.color } },
        h('p', { class: 'jb-here' }, h('span', { class: 'jb-here-pill' }, 'You are here')),
        h('p', { class: 'jb-world-n' }, `World ${cur.n}`),
        h('h3', { class: 'jb-world-name' }, cur.name),
        track,
        allDone ? h('p', { class: 'jb-more' }, 'Everything here is finished. More worlds are coming!') : null),
      map.starCard),
    h('div', { class: 'jb-foot' }, go));

  let closed = false, release = null;
  function close() {
    if (closed) return;
    closed = true;
    if (release) release();
    el.classList.add('closing');
    setTimeout(() => { el.remove(); if (onClose) onClose(); }, still ? 0 : 250);
  }
  host.append(el);
  release = pushSheet(() => close(), el); // Back (the browser's or the phone's) closes it
  x.focus({ preventScroll: true });
  // The current station is brought to the middle of the track (the track alone scrolls, not the page).
  // (a screen is attached just after it is built, so the centring runs again a moment later, when the track has a width)
  const here = track.querySelector('.is-here');
  // It always comes to rest on a station's left edge, never part-way through one (a half-hidden first letter looked clipped).
  const centre = () => {
    if (!here || !track.clientWidth) return;
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0, want = Math.min(here.offsetLeft - (track.clientWidth - here.offsetWidth) / 2, track.scrollWidth - track.clientWidth);
    const list = [...stations];
    let i = Math.max(0, list.findLastIndex((x) => x.offsetLeft - pad <= want + 1));
    while (i < list.indexOf(here) && here.offsetLeft + here.offsetWidth > list[i].offsetLeft - pad + track.clientWidth) i++; // keep the current station in view
    track.scrollLeft = Math.max(0, list[i].offsetLeft - pad);
  };
  centre();
  setTimeout(centre, 0);
  if (!still) {
    badges.forEach((b, i) => animate(b, [{ opacity: 0, transform: 'translateY(10px) scale(.85)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 80 + i * 40 }));
    animate(el.querySelector('.jb-world'), [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 300 });
    stations.forEach((s, i) => animate(s, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 450 + i * 60 }));
    animate(map.starCard, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 500 });
    const tr = el.querySelector('.jb-train'); // the train rolls a little way onto its station, once
    if (tr) animate(tr, [{ transform: 'translateX(-46px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 520, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }
  return { el, close };
}

// The compact board for the world-crossing card (js/screens/crossing.js): a little railway with a station for each world,
// the finished ones filled, and the train rolling from the world just finished to the next one (one CSS transform
// transition, started a moment after the card shows; with reduced motion it simply stands at the next world).
export function journeyMini({ curriculum, from, to }) {
  const worlds = curriculum.worlds || [];
  const fi = Math.max(0, worlds.findIndex((w) => w.id === from.id)), ti = Math.max(0, worlds.findIndex((w) => w.id === to.id));
  const still = reduced();
  const stations = worlds.map((w, i) => h('li', { class: 'jm-stn ' + (i <= fi ? 'is-done' : i === ti ? 'is-next' : 'is-later') + (i === fi || i === ti ? ' big' : ''), style: { '--wc': w.color }, dataset: { world: w.id }, 'aria-hidden': 'true' },
    i === fi || i === ti ? h('span', { class: 'jm-n' }, String(w.n)) : null));
  const train = h('span', { class: 'jm-train', 'aria-hidden': 'true', style: { '--at': String(still ? ti : fi) } }, miniTrain());
  const el = h('div', { class: 'jm-mini', role: 'img', 'aria-label': `The journey: from ${from.name} to ${to.name}`, style: { '--n': String(worlds.length) }, dataset: { from: from.id, to: to.id, at: String(still ? ti : fi) } },
    h('div', { class: 'jm-lane' }, train), h('ol', { class: 'jm-rail' }, ...stations));
  if (!still) {
    // a moment after the card shows, so the start has been painted; then one transform transition glides the train along
    setTimeout(() => { train.style.transition = 'transform 1.7s cubic-bezier(.45,0,.25,1)'; train.style.setProperty('--at', String(ti)); el.dataset.at = String(ti); }, 450);
  }
  return el;
}
