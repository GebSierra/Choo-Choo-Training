import { h, animate, icon, reduced } from '../dom.js';
import { makeShell } from './shell.js';
import { glyphSvg, wordSvg } from '../glyphs.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';
import { starSvg } from '../art.js';
import { sparkle } from '../components/sparkle.js';
import { pipSvg } from '../art/pip.js';
import { kidSvg } from '../art/kid.js';
import { makeFill, INK } from './tasks/proto/kit.js';
import { build as warmup } from './tasks/proto/warmup.js';
import { build as recall } from './tasks/proto/recall.js';
import { build as newSound } from './tasks/proto/new-sound.js';
import { build as blendIt } from './tasks/proto/blend-it.js';
import { build as readIt } from './tasks/proto/read-it.js';
import { build as buildIt } from './tasks/proto/build-it.js';
import { build as readStory } from './tasks/proto/read-story.js';

// PROTOTYPE 4: one full lesson in the new eight-step daily loop (docs/CURRICULUM.md section 7), for the sound f, which comes
// after m a s i t p. It lives at #/proto/f (an overview) and #/proto/f/task/0 to 7, reached from Grownups > Previews. Its content is
// data/proto-lesson-f.json; the 13 real lessons are untouched, and nothing here marks a lesson done or touches progress.
// Steps 1 to 7 are tasks in the ordinary task shell (header and progress dots, the "Say this" bar with the grown-up tip,
// Again and Next); step 8 is the celebration.
const STEPS = [warmup, recall, newSound, blendIt, readIt, buildIt, readStory];
let dataPromise = null;
export const loadProto = () => dataPromise || (dataPromise = fetch('data/proto-lesson-f.json').then((r) => { if (!r.ok) throw new Error('proto lesson ' + r.status); return r.json(); }).catch((e) => { dataPromise = null; throw e; }));
let lastIndex = -1;

// ---- the overview ----
export async function protoIntro(ctx) {
  const { router } = ctx;
  const data = await loadProto();
  lastIndex = -1;
  const rows = data.steps.map((s, i) => h('li', { class: 'pv-row', dataset: { step: String(i) } },
    h('span', { class: `pv-num c-${s.color}` }, String(i + 1)),
    h('span', { class: 'pv-text' }, h('strong', {}, s.name), h('span', {}, s.about))));
  const root = h('div', { class: 'grownups proto-intro' },
    h('header', { class: 'gu-head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onclick: () => router.back() }, icon('back', 28)), h('h1', {}, data.title)),
    h('div', { class: 'gu-body pv-body' },
      h('section', { class: 'gu-card' },
        h('p', { class: 'pv-lead' }, 'A preview of one whole lesson in the new eight-step daily loop, for the sound f. It is a try-out: it does not change your child\'s progress.'),
        h('ol', { class: 'pv-list' }, ...rows),
        h('button', { class: 'btn big pv-start', type: 'button', onclick: () => router.go('/proto/f/task/0') }, 'Start the lesson', icon('arrowRight', 24)))));
  return root;
}

// ---- steps 1 to 8 ----
export async function protoTask(ctx, idx) {
  const { router, curriculum } = ctx;
  const data = await loadProto();
  const index = Number(idx), total = data.steps.length;
  if (!(index >= 0 && index < total)) { queueMicrotask(() => router.replace('/proto/f')); return h('div'); }
  if (index === total - 1) return celebrate(ctx, data);
  const step = data.steps[index];
  const fill = makeFill(curriculum.sounds);
  const shell = makeShell({ ctx, title: step.name, color: step.color, steps: total, pos: index, from: lastIndex, isLast: false, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the preview', stepNoun: 'Step', autoAdvance: true,
    tip: step.tip, tipKey: `tip:proto-f:${step.id}`, autoOpen: true, seenKeys: [`proto-f:${step.id}`] });
  const current = STEPS[index]({ ...ctx, data, step, fill, refresh: shell.refresh, setDone: shell.setDone });
  const advance = () => { lastIndex = index; router.go(`/proto/f/task/${index + 1}`); };
  const root = shell.mount(current, advance);
  root.classList.add('proto-task'); // the title fits one line on a small phone
  return root;
}

// ---- step 8: celebrate ----
// The finish screen's celebration (stars, Pip and the child cheering), for this lesson: "You read your first f words!", the
// three new words as tiles, and a calm "Did you know?" card for the grown-up (CURRICULUM.md section 13, tip 14, verbatim).
function celebrate(ctx, data) {
  const { router, speech, store } = ctx;
  const C = data.celebrate, accent = accentOf(data.sound);
  lastIndex = data.steps.length - 1;
  const badge = glyphSvg(data.sound, { color: accent, label: 'lesson letter' });
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const stars = h('div', { class: 'pf-stars', 'aria-hidden': 'true' }, [0, 1, 2].map(() => starSvg()));
  const tiles = h('ul', { class: 'pf-words', 'aria-label': 'Your new words' }, C.words.map((w) => {
    const s = wordSvg(w, { color: INK, all: true, label: w });
    s.style.width = `calc(var(--cap, 40px) * ${Number(s.dataset.width) / Number(s.dataset.height)})`;
    s.style.maxWidth = '100%';
    return h('li', { class: 'pf-word', dataset: { word: w } }, s);
  }));
  const back = h('button', { class: 'btn big pf-back', type: 'button', onclick: () => { sfx.play('unlock'); router.go('/home'); } }, 'Back to the railway', icon('arrowRight', 24));
  const tip = h('section', { class: 'pf-tip', 'aria-label': 'Did you know?' }, h('strong', {}, 'Did you know?'), h('p', {}, C.didYouKnow));
  const glyph = h('div', { class: 'finish-glyph', style: { '--accent': accent } }, ring, badge, h('span', { class: 'finish-pip' }, pipSvg({ pose: 'cheer' })), h('span', { class: 'finish-kid', 'aria-hidden': 'true' }, kidSvg({ ...store.character(), pose: 'cheer' })));
  const root = h('div', { class: 'proto-finish', dataset: { step: 'celebrate' } }, glyph, h('h1', {}, C.heading), stars, tiles, back, tip);
  animate(badge, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: 0.7, offset: 0.2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 560, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  [...stars.children].forEach((s, i) => animate(s, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, delay: 500 + i * 160, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
  [...tiles.children].forEach((t, i) => animate(t, [{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, delay: 700 + i * 120 }));
  // The voice says "Good job." first; the jingle waits for it to finish (see sfx.js).
  const t = setTimeout(() => {
    speech.autoSay([{ tts: 'Good job.' }]); sfx.play('lesson');
    if (!reduced() && badge.isConnected) { const g = glyph.getBoundingClientRect(), o = root.getBoundingClientRect(); sparkle(root, g.left - o.left + g.width / 2, g.top - o.top + g.height / 2, { count: 22, size: [14, 30], reach: [90, 170] }); }
  }, 500);
  root.cleanup = () => clearTimeout(t);
  return root;
}
