import { h, animate, icon } from '../dom.js';
import { speakButton } from '../components/speak-button.js';
import { tasksFor, lessonByNumber } from '../lessons.js';
import { scriptToParts } from '../scripts.js';
import { richText } from '../letters.js';
import { build as review } from './tasks/review.js';
import { build as newLetter } from './tasks/new-letter.js';
import { build as story } from './tasks/story.js';
import { build as words } from './tasks/words.js';
import { build as sounds } from './tasks/sounds.js';
import { build as writing } from './tasks/writing.js';
import { build as hunt } from './tasks/hunt.js';
import { build as check } from './tasks/check.js';

const BUILDERS = { review, newLetter, story, words, sounds, writing, hunt, check };
let lastIndex = {}; // remembers the previous task per lesson so the progress pill can glide

export function taskScreen(ctx, n, idx) {
  const { store, router, curriculum, speech } = ctx;
  const lesson = lessonByNumber(curriculum, n);
  const tasks = lesson ? tasksFor(lesson) : [];
  const index = Number(idx);
  const task = tasks.find((t) => t.index === index);
  if (!lesson || !task || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace(lesson && store.isUnlocked(lesson.number) ? `/lesson/${n}` : '/home')); return h('div'); }
  const sound = curriculum.sounds[lesson.sound];
  const soundKeys = Object.keys(curriculum.sounds);
  const pos = tasks.indexOf(task);
  const isLast = pos === tasks.length - 1;

  const scriptText = h('p', { class: 'script-text' });
  let current = null;
  const refresh = () => { scriptText.replaceChildren(richText(current ? current.script() : '')); };
  const env = { ...ctx, lesson, sound, refresh };
  current = BUILDERS[task.type](env);

  const advance = () => {
    store.markTask(lesson.number, task.index);
    lastIndex[lesson.number] = task.index;
    router.go(isLast ? `/lesson/${lesson.number}/finish` : `/lesson/${lesson.number}/task/${tasks[pos + 1].index}`);
  };

  // Progress dots: the previous task's dot starts wide and the new one widens.
  const prevPos = tasks.findIndex((t) => t.index === lastIndex[lesson.number]);
  const dots = tasks.map((t, i) => h('i', { class: 'dot' + (i < pos ? ' past' : '') }));
  const pill = h('i', { class: 'dot-pill', style: { '--at': prevPos >= 0 && prevPos !== pos ? prevPos : pos } });
  requestAnimationFrame(() => requestAnimationFrame(() => { pill.style.setProperty('--at', pos); dots.forEach((d, i) => d.classList.toggle('past', i < pos)); }));

  const light = task.color === 'violet' || task.color === 'coral';
  const speaker = speakButton({ speech, getParts: () => current.parts(), label: 'Hear this again' });
  if (light) speaker.classList.add('light');
  const scriptSpeaker = speakButton({ speech, getParts: () => scriptToParts(current.script(), soundKeys, { quiet: !store.settings.playSounds }), label: 'Hear the parent script' });
  scriptSpeaker.classList.add('small');

  const head = h('header', { class: 'task-head' },
    h('button', { class: 'icon-btn light', type: 'button', 'aria-label': 'Back to lesson', onclick: () => router.back() }, icon('back', 28)),
    h('h1', {}, task.name),
    h('span', { class: 'head-spacer' }),
    h('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': tasks.length, 'aria-valuenow': pos + 1, 'aria-label': `Task ${pos + 1} of ${tasks.length}` }, h('span', { class: 'dots-track' }, dots, pill)));

  const stage = h('main', { class: `task-stage c-${task.color}${light ? ' on-dark' : ''}` }, h('div', { class: 'task-activity' + (current.flush ? ' flush' : '') }, current.el), speaker);

  const again = h('button', { class: 'btn again', type: 'button', onclick: () => { current.again(); refresh(); } }, icon('redo', 22), 'Again');
  const next = h('button', { class: 'btn next', type: 'button', disabled: true, onclick: () => { if (current.next && current.next()) { refresh(); return; } advance(); } }, isLast ? 'Finish' : 'Next', icon('arrowRight', 22));
  const foot = h('footer', { class: 'task-foot' },
    h('section', { class: 'script-card', 'aria-label': 'Parent script' },
      h('span', { class: 'script-ic' }, icon('adult', 22)),
      h('div', { class: 'script-body' }, h('span', { class: 'script-tag' }, 'Say this'), scriptText),
      scriptSpeaker),
    h('div', { class: 'task-buttons' }, again, next));
  refresh();

  const root = h('div', { class: 'task-screen' }, head, stage, foot);
  // Speak the child's line on entry once the screen has settled.
  // Next stays dimmed for a second so a quick double tap cannot skip the task.
  const nextTimer = setTimeout(() => { next.disabled = false; }, 1000);
  const timer = setTimeout(() => { if (current.onShow) current.onShow(); speech.autoSay(current.parts()); }, 420);
  root.cleanup = () => { clearTimeout(timer); clearTimeout(nextTimer); speaker.cleanup(); scriptSpeaker.cleanup(); if (current.cleanup) current.cleanup(); };
  // Opacity only: the tap targets must not move while a finger may be heading for them.
  animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 });
  animate(foot, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120 });
  return root;
}
