// The journey board (docs/CURRICULUM.md section 9): a full-screen overlay with a badge for each of the eleven worlds
// (the current one lit, finished ones ticked in gold, later ones a soft outline with a lock) and, below, the current
// world opened up as a little track with one station per unit: its number and its sounds in letters, finished units
// ticked and a small Pip standing at the current one. Static DOM and SVG: a short fade and rise on entry (WAAPI, transform
// and opacity only, none under reduced motion) and no loop. "All aboard!" closes it. Returns { el, close }.
import { h, icon, animate, reduced } from '../dom.js';
import { pipSvg } from '../art/pip.js';
import { letterFace } from './letter-face.js';
import { accentOf } from '../theme.js';
import { currentWorld, currentUnit, unitsIn, unitDone, worldDone, lessonsOfUnit } from '../worlds.js';

const tick = () => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'jb-tick' }, h('path', { d: 'M6 12.5l4 4 8-9', fill: 'none', stroke: '#fff', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

export function journeyBoard({ host, curriculum, store, onClose }) {
  const worlds = curriculum.worlds || [];
  const cur = currentWorld(store, curriculum) || worlds[0];
  const curUnit = cur ? currentUnit(store, curriculum, cur.id) : null;
  const still = reduced();

  const badges = worlds.map((w) => {
    const state = w.id === cur.id ? 'current' : worldDone(store, curriculum, w.id) ? 'done' : 'future';
    const label = `World ${w.n}, ${w.name}${state === 'done' ? ', finished' : state === 'current' ? ', you are here' : ', not yet'}`;
    return h('li', { class: `jb-badge is-${state}`, style: { '--wc': w.color }, 'aria-label': label, dataset: { world: w.id, state } },
      h('span', { class: 'jb-badge-n', 'aria-hidden': 'true' }, String(w.n)),
      state === 'done' ? h('span', { class: 'jb-badge-mark gold', 'aria-hidden': 'true' }, tick()) : null,
      state === 'future' ? h('span', { class: 'jb-badge-mark lock', 'aria-hidden': 'true' }, icon('lock', 14)) : null);
  });

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
  const el = h('div', { class: 'jb' + (still ? ' still' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Your journey' },
    h('div', { class: 'jb-scroll' },
      h('h2', { class: 'jb-head' }, 'Your journey'),
      h('ol', { class: 'jb-badges', 'aria-label': 'The worlds' }, ...badges),
      h('section', { class: 'jb-world', style: { '--wc': cur.color } },
        h('p', { class: 'jb-world-n' }, `World ${cur.n}`),
        h('h3', { class: 'jb-world-name' }, cur.name),
        track)),
    h('div', { class: 'jb-foot' }, go));

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    el.classList.add('closing');
    setTimeout(() => { el.remove(); if (onClose) onClose(); }, still ? 0 : 250);
  }
  host.append(el);
  // The current station is brought to the middle of the track (the track alone scrolls, not the page).
  // (a screen is attached just after it is built, so the centring runs again a moment later, when the track has a width)
  const here = track.querySelector('.is-here');
  const centre = () => { if (here && track.clientWidth) track.scrollLeft = Math.max(0, here.offsetLeft - (track.clientWidth - here.offsetWidth) / 2); };
  centre();
  setTimeout(centre, 0);
  if (!still) {
    badges.forEach((b, i) => animate(b, [{ opacity: 0, transform: 'translateY(10px) scale(.85)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 80 + i * 40 }));
    animate(el.querySelector('.jb-world'), [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 300 });
    stations.forEach((s, i) => animate(s, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 450 + i * 60 }));
  }
  return { el, close };
}
