import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { lessonByNumber } from '../lessons.js';
import { accentOf } from '../theme.js';

// Calm finish: no confetti. The parent decides whether the child got it.
export function finishScreen({ store, router, curriculum, speech }, n) {
  const lesson = lessonByNumber(curriculum, n);
  if (!lesson || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.go('/home')); return h('div'); }
  const accent = accentOf(lesson.sound);
  const total = curriculum.lessons.length;
  const note = h('p', { class: 'finish-note', 'aria-live': 'polite' });
  const res = () => store.lesson(lesson.number).result;
  const paint = () => {
    gotIt.classList.toggle('chosen', res() === 'got-it');
    again.classList.toggle('chosen', res() === 'practice-again');
    note.textContent = res() === 'got-it' ? (lesson.number < total ? `Lesson ${lesson.number + 1} is open.` : 'All three sounds are done.') : res() === 'practice-again' ? 'We will practice this one again.' : '';
  };
  const gotIt = h('button', { class: 'btn big got', type: 'button', onclick: () => { store.setResult(lesson.number, 'got-it'); paint(); } }, icon('check', 24), 'Got it');
  const again = h('button', { class: 'btn big ghost practice', type: 'button', onclick: () => { store.setResult(lesson.number, 'practice-again'); store.resetLessonTasks(lesson.number); paint(); } }, icon('redo', 22), 'Practice again');
  const g = glyphSvg(lesson.sound, { color: accent, label: 'lesson letter' });
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const badge = h('div', { class: 'finish-glyph' }, ring, g);
  const root = h('div', { class: 'finish' },
    badge,
    h('h1', {}, `Lesson ${lesson.number} done`),
    h('section', { class: 'finish-card' }, h('p', { class: 'finish-q' }, 'How did it go?'), h('div', { class: 'finish-choices' }, gotIt, again), note),
    h('button', { class: 'btn ghost back-path', type: 'button', onclick: () => router.go('/home') }, 'Back to path'));
  paint();
  animate(g, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: .7, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 900, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const t = setTimeout(() => speech.autoSay([{ tts: 'Lesson done. Well done.' }]), 500);
  root.cleanup = () => clearTimeout(t);
  return root;
}
