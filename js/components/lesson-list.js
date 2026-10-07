// The Grownups list of lessons and checkpoints, with the unlock confirm. Flat (one row per lesson, a checkpoint right after
// the lesson it follows) as Grownups shows it today, or grouped (prototype 2): each world a fold with only the current world
// open, and inside it each unit as a heading over its rows. Both use the same rows. Returns { el, paint }.
import { h, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { stopIcon } from '../art/train2d.js';
import { accentOf } from '../theme.js';
import { currentWorld, lessonsIn, unitsIn, lessonsOfUnit } from '../worlds.js';

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };

export function lessonList({ store, curriculum, grouped = false }) {
  const el = h('div', { class: 'gu-list' + (grouped ? ' gu-grouped' : '') });
  let unlocking = null; // what is waiting for the confirm tap: a lesson number or a checkpoint id
  const cks = curriculum.checkpoints || [];
  const cur = grouped ? currentWorld(store, curriculum) : null;
  const open = new Set(cur ? [cur.id] : []); // grouped: the folds that are open (only the current world at first)
  // A lesson, then the checkpoints that follow it.
  const rowsOf = (lessons) => lessons.flatMap((l) => [{ key: l.number, lesson: l }, ...cks.filter((c) => c.after === l.number).map((c) => ({ key: c.id, checkpoint: c }))]);

  const rowEl = (r) => {
    const name = r.lesson ? `lesson ${r.lesson.number}` : `the ${r.checkpoint.title.toLowerCase()}`;
    if (unlocking === r.key) {
      return h('div', { class: 'gu-confirm', role: 'alertdialog', 'aria-label': 'Confirm unlock' },
        h('p', {}, r.lesson ? `Unlock lesson ${r.lesson.number} without finishing the one before it?` : `Unlock the ${r.checkpoint.title.toLowerCase()} without finishing lesson ${r.checkpoint.after}?`),
        h('div', { class: 'gu-actions' },
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => { unlocking = null; paint(); } }, 'Cancel'),
          h('button', { class: 'btn small', type: 'button', onclick: () => { if (r.lesson) store.unlock(r.lesson.number); else store.unlockCheckpoint(r.checkpoint.id); unlocking = null; paint(); } }, 'Unlock')));
    }
    const st = r.lesson ? store.lesson(r.lesson.number) : store.checkpoint(r.checkpoint.id);
    const unlocked = r.lesson ? store.isUnlocked(r.lesson.number) : store.isCheckpointUnlocked(r.checkpoint);
    const doneNow = r.lesson ? store.isDone(r.lesson.number) : store.isCheckpointDone(r.checkpoint); // finishing a lesson completes everything before it
    const status = doneNow && st.result !== 'got-it' ? 'Done (a later lesson is finished)' : st.result === 'got-it' ? `Got it${st.completedAt ? ' on ' + fmt(st.completedAt) : ''}` : st.result === 'practice-again' ? `Practice again${st.completedAt ? ' (' + fmt(st.completedAt) + ')' : ''}` : (unlocked ? 'Open, not finished' : 'Locked');
    return h('div', { class: 'gu-row' },
      h('span', { class: 'gu-glyph' }, r.lesson ? glyphSvg(r.lesson.sound, { color: accentOf(r.lesson.sound), label: name }) : stopIcon(r.checkpoint)),
      h('div', { class: 'gu-row-text' }, h('strong', {}, r.lesson ? `Lesson ${r.lesson.number}` : r.checkpoint.title), h('span', { class: 'gu-sub' }, status)),
      unlocked ? h('span', { class: 'gu-open' }, doneNow ? icon('check', 20) : '') : h('button', { class: 'btn ghost small', type: 'button', 'aria-label': `Unlock ${name}`, onclick: () => { unlocking = r.key; paint(); } }, 'Unlock'));
  };

  const worldFold = (w) => {
    const lessons = lessonsIn(curriculum, w.id);
    const done = lessons.filter((l) => store.isDone(l.number)).length;
    const isOpen = open.has(w.id);
    const id = 'gu-world-' + w.id;
    const units = unitsIn(curriculum, w.id).filter((u) => lessonsOfUnit(curriculum, u.id).length);
    const body = h('div', { class: 'gu-fold-body gu-world-body', id, hidden: !isOpen },
      ...units.flatMap((u) => [
        h('h3', { class: 'gu-unit' }, h('strong', {}, `Unit ${u.id}`), h('span', { class: 'gu-sub' }, u.sounds.join('  '))),
        ...rowsOf(lessonsOfUnit(curriculum, u.id)).map(rowEl),
      ]));
    const head = h('button', { class: 'gu-fold gu-world-head', type: 'button', 'aria-expanded': String(isOpen), 'aria-controls': id, onclick: () => {
      if (open.has(w.id)) open.delete(w.id); else open.add(w.id);
      head.setAttribute('aria-expanded', String(open.has(w.id)));
      body.hidden = !open.has(w.id);
    } }, h('span', { class: 'gu-world-dot', style: { background: w.color }, 'aria-hidden': 'true' }, String(w.n)), h('span', { class: 'gu-world-title' }, h('strong', {}, w.name), h('span', { class: 'gu-sub' }, `${done} of ${lessons.length} lessons done`)), icon('chevronDown', 24));
    return h('section', { class: 'gu-card gu-world', dataset: { world: w.id }, style: { '--wc': w.color } }, h('h2', {}, head), body);
  };

  function paint() {
    if (!grouped) { el.replaceChildren(...rowsOf(curriculum.lessons).map(rowEl)); return; }
    const worlds = (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length);
    const later = (curriculum.worlds || []).length - worlds.length;
    el.replaceChildren(...worlds.map(worldFold), h('p', { class: 'gu-note' }, `${later} more worlds are on the way.`));
  }
  paint();
  return { el, paint };
}
