// Grownups > Progress: the journey board's railway (the worlds, the train at the current one, the gold level stars) and, for
// each world, a short summary for the grown-up: lessons done of total, the unit and sounds the child is on, the level stars
// earned there and the date of the last lesson finished. Plain DOM; shows the real state when the page opens.
import { h } from '../dom.js';
import { journeyMap } from './journey-board.js';
import { worldSummary } from '../worlds.js';
import { NUMBER_WORDS } from '../levels.js';

const dateText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

export function progressBody({ curriculum, store }) {
  const map = journeyMap({ curriculum, store });
  const worlds = curriculum.worlds || [];
  const rows = worlds.map((w) => ({ w, s: worldSummary(store, curriculum, w.id) })).filter((r) => r.s.built).map(({ w, s }) => {
    const lines = [
      h('span', { class: 'gp-lessons' }, `${s.done} of ${s.total} lessons done`),
      s.unit ? h('span', { class: 'gp-unit' }, s.unit.sounds.length ? `Now: unit ${s.unit.id}, sounds ${s.unit.sounds.join(' ')}` : `Now: unit ${s.unit.id}`) : null,
      s.levels.length ? h('span', { class: 'gp-levels' }, s.levels.map((v) => `Level ${NUMBER_WORDS[v.n - 1]} star: ${v.earned ? 'earned' : 'not yet'}`).join(' · ')) : null,
      h('span', { class: 'gp-last' }, s.lastDone && dateText(s.lastDone) ? `Last lesson finished: ${dateText(s.lastDone)}` : 'No lesson finished here yet'),
    ];
    return h('li', { class: `gp-world is-${s.state}`, style: { '--wc': w.color }, dataset: { world: w.id, state: s.state, done: String(s.done), total: String(s.total) } },
      h('span', { class: 'gp-dot', 'aria-hidden': 'true' }, String(w.n)),
      h('div', { class: 'gp-text' }, h('strong', {}, w.name, s.state === 'done' ? h('em', {}, ' · finished') : s.state === 'current' ? h('em', {}, ' · you are here') : null), ...lines));
  });
  const later = worlds.filter((w) => !worldSummary(store, curriculum, w.id).built);
  return [
    h('div', { class: 'gp-map' }, map.el),
    h('ol', { class: 'gp-list', 'aria-label': 'Each world' }, ...rows),
    later.length ? h('p', { class: 'gu-note gp-later' }, `${later.length === 1 ? 'One more world is' : `${later.length} more worlds are`} coming later: ${later.map((w) => w.name).join(', ')}.`) : null,
  ];
}
