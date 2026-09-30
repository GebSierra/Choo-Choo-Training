import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { holdButton } from '../components/hold-button.js';
import { speakButton } from '../components/speak-button.js';
import { tasksFor, lessonByNumber, targetsFor, soundPhrase } from '../lessons.js';
import { richText, letterText } from '../letters.js';

// Little illustrations for the task cards, drawn from our own shapes and emoji.
function illustration(task, lesson, curriculum) {
  const s = curriculum.sounds[lesson.sound];
  const wrap = h('div', { class: 'card-art art-' + task.type });
  switch (task.type) {
    case 'review':
      lesson.review.forEach((g, i) => wrap.append(h('span', { class: 'flash', style: { '--r': (i % 2 ? 7 : -7) + 'deg' } }, glyphSvg(g, { color: `var(--${g})` }))));
      break;
    case 'newLetter': wrap.append(h('span', { class: 'big-glyph' }, glyphSvg(lesson.sound, { color: '#fff' }))); break;
    case 'story': wrap.append(h('span', { class: 'play' }, icon('play', 44))); break;
    case 'words': lesson.sayingWords[0].emoji.forEach((e, i) => { wrap.append(h('span', { class: 'emo' }, e)); if (i === 0) wrap.append(h('span', { class: 'plus' }, '+')); }); break;
    case 'sounds': wrap.append(h('span', { class: 'wave' }, h('i'), h('i'), h('i'), h('i'), h('i'))); break;
    case 'writing': wrap.append(h('span', { class: 'big-glyph ghost' }, glyphSvg(lesson.sound, { color: 'currentColor' })), h('span', { class: 'pencil' }, '✏️')); break;
    case 'check': wrap.append(h('span', { class: 'qmark' }, '?')); break;
  }
  return wrap;
}

export function lessonScreen({ store, router, curriculum, speech }, n) {
  const lesson = lessonByNumber(curriculum, n);
  if (!lesson || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const sound = curriculum.sounds[lesson.sound];
  const tasks = tasksFor(lesson);
  const done = store.lesson(lesson.number).tasksDone;
  const nextIndex = tasks.findIndex((t) => !done.includes(t.index));
  const accent = `var(--${sound.glyph})`;

  const header = h('header', { class: 'lo-head' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onclick: () => router.back() }, icon('back', 28)),
    h('div', { class: 'lo-title' }, h('h1', {}, `Lesson ${lesson.number}`), h('p', {}, richText(`Today: the sound ${soundPhrase(sound)}.`, { every: true }))),
    speakButton({ speech, getParts: () => lesson.intro, label: 'Hear the lesson intro', accent }));

  const cards = tasks.map((t, i) => {
    const isDone = done.includes(t.index);
    const targets = targetsFor(t, lesson);
    const chips = targets.map((c) => c.glyph
      ? h('span', { class: 'chip chip-glyph' }, glyphSvg(c.glyph, { color: `var(--${c.glyph})` }))
      : h('span', { class: 'chip' }, letterText(c.text)));
    const card = h('button', { class: `task-card c-${t.color} ${t.dark ? 'dark-ink' : ''} ${isDone ? 'is-done' : ''}`, type: 'button', style: { '--i': i }, onclick: () => router.go(`/lesson/${lesson.number}/task/${t.index}`), 'aria-label': `${t.name}${isDone ? ', done' : ''}` },
      h('span', { class: 'card-num' }, String(i + 1)),
      isDone ? h('span', { class: 'card-tick' }, h('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' }, h('path', { class: 'tick', d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))) : null,
      illustration(t, lesson, curriculum),
      h('span', { class: 'card-body' }, h('span', { class: 'card-name' }, t.name), h('span', { class: 'card-label' }, t.label), h('span', { class: 'chips' }, chips)));
    return card;
  });

  const startLabel = nextIndex === -1 ? 'Do it again' : (done.length ? 'Continue lesson' : 'Start lesson');
  const start = h('button', { class: 'btn primary big start-btn', type: 'button', style: { background: accent }, onclick: () => {
    if (nextIndex === -1) store.resetLessonTasks(lesson.number);
    router.go(`/lesson/${lesson.number}/task/${nextIndex === -1 ? 0 : tasks[nextIndex].index}`);
  } }, startLabel, icon('arrowRight', 24));

  // Optional alphabet song: not one of the tasks, so it never counts toward progress.
  const openSong = () => { const w = window.open(curriculum.alphabetSongUrl, '_blank'); if (w) w.opener = null; };
  const song = h('section', { class: 'song-row', 'aria-label': 'Alphabet song' },
    h('span', { class: 'song-thumb' }, icon('play', 26)),
    h('div', { class: 'song-text' }, h('strong', {}, 'Alphabet song'), h('p', { class: 'parent-note' }, 'Optional: play the alphabet song together, then start the lesson.')),
    holdButton({ label: 'Play', caption: 'Hold to open', hint: 'Press and hold', className: 'song-hold', leading: icon('external', 16), onComplete: openSong }));

  const root = h('div', { class: 'lesson-overview' }, header, song, h('div', { class: 'cards-scroll' }, h('div', { class: 'cards' }, cards)), h('footer', { class: 'lo-foot' }, start));
  cards.forEach((c, i) => animate(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 140 + i * 40 }));
  return root;
}
