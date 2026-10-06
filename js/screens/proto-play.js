import { h, icon } from '../dom.js';
import { makeShell } from './shell.js';
import { makeFill } from './tasks/proto/kit.js';
import { BUILDERS } from './tasks/proto/play.js';

// PROTOTYPE 6, part A: Stage 1 sound play (docs/CURRICULUM.md section 11), three short lessons before letters. A small chooser
// at #/proto/play and each lesson's steps at #/proto/play/<1|2|3>/task/<n>, reached from Grownups > Previews. Content is
// data/proto-play.json. The steps run in the ordinary task shell. Nothing here marks a lesson done or touches progress.
let dataPromise = null;
export const loadPlay = () => dataPromise || (dataPromise = fetch('data/proto-play.json').then((r) => { if (!r.ok) throw new Error('proto play ' + r.status); return r.json(); }).catch((e) => { dataPromise = null; throw e; }));
let lastIndex = -1;

// Back to Grownups, within the ten minutes of the hold that opened it (else Grownups sends the grown-up home).
const backToGrownups = (ctx) => { ctx.gate = { openedAt: ctx.guOpenedAt || Date.now() }; ctx.router.go('/grownups'); };

// ---- the chooser ----
export async function playIntro(ctx) {
  const data = await loadPlay();
  lastIndex = -1;
  const rows = data.lessons.map((l) => h('li', {},
    h('button', { class: 'pv-row pp-lesson', type: 'button', dataset: { lesson: l.id }, onclick: () => ctx.router.go(`/proto/play/${l.id}/task/0`) },
      h('span', { class: `pv-num c-${l.color}` }, l.unit),
      h('span', { class: 'pv-text' }, h('strong', {}, l.name), h('span', {}, l.about)),
      icon('arrowRight', 24))));
  return h('div', { class: 'grownups proto-intro proto-play-intro' },
    h('header', { class: 'gu-head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onclick: () => backToGrownups(ctx) }, icon('back', 28)), h('h1', {}, data.title)),
    h('div', { class: 'gu-body pv-body' },
      h('section', { class: 'gu-card' },
        h('p', { class: 'pv-lead' }, data.intro),
        h('ul', { class: 'pv-list pp-list' }, ...rows))));
}

// ---- one step of a lesson ----
export async function playTask(ctx, lessonId, idx) {
  const { router, curriculum } = ctx;
  const data = await loadPlay();
  const lesson = data.lessons.find((l) => l.id === lessonId);
  const index = Number(idx);
  if (!lesson || !(index >= 0 && index < lesson.steps.length)) { queueMicrotask(() => router.replace('/proto/play')); return h('div'); }
  const total = lesson.steps.length, step = lesson.steps[index], isLast = index === total - 1;
  const fill = makeFill(curriculum.sounds);
  const shell = makeShell({ ctx, title: lesson.name, color: lesson.color, steps: total, pos: index, from: lastIndex, isLast, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to Sound play', stepNoun: 'Step', autoAdvance: true,
    tip: lesson.tip, tipKey: `tip:proto-play:${lesson.id}`, autoOpen: true, seenKeys: [`proto-play:${lesson.id}`] });
  const current = BUILDERS[step.kind]({ ...ctx, data, step, fill, refresh: shell.refresh, setDone: shell.setDone });
  const advance = () => { if (isLast) { lastIndex = -1; router.go('/proto/play'); } else { lastIndex = index; router.go(`/proto/play/${lesson.id}/task/${index + 1}`); } };
  const root = shell.mount(current, advance);
  root.classList.add('proto-task', 'proto-play-task');
  return root;
}
