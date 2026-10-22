import { h } from '../dom.js';
import { makeShell } from './shell.js';
import { build as sack } from './sack.js';
import { bookBuild, loadBook } from './book.js';
import { rereadBuild } from './reread.js';
import { reviewIntroScreen } from './review.js';

// A checkpoint is a bonus stop on the line. By default a review game (the sound sack: one progress dot per round); with
// kind "book" a story to read (one dot per page); with kind "reread" Read It Again, the repeated-reading station (one dot per sentence); with kind
// "review" a Review Stop (a short run of the lesson games, js/screens/review.js). It uses the task shell and ends on the same two-step finish screen as a lesson.
export async function checkpointScreen(ctx, id) {
  const { store, router, curriculum } = ctx;
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id);
  if (!ck || !store.isCheckpointUnlocked(ck)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const done = () => router.go(`/checkpoint/${ck.id}/finish`);
  if (ck.kind === 'book') {
    const book = await loadBook(ck, store);
    await Promise.race([document.fonts.load('700 20px Andika'), new Promise((r) => setTimeout(r, 600))]).catch(() => {}); // the book's typeface, but never a long wait
    const shell = makeShell({ ctx, title: ck.title, color: 'sky', steps: book.pages.length, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Page', seenKeys: [], autoOpen: false, skipUntilDone: true, noScript: true, noAgain: true });
    const current = bookBuild({ ...ctx, checkpoint: ck, book, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
    return shell.mount(current, () => current.close().then(done));
  }
  if (ck.kind === 'reread') {
    const shell = makeShell({ ctx, title: ck.title, color: 'sun', steps: ck.story.length, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Sentence', seenKeys: ['reread'], autoOpen: true, skipUntilDone: true });
    const current = rereadBuild({ ...ctx, checkpoint: ck, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
    return shell.mount(current, done);
  }
  if (ck.kind === 'review' || ck.kind === 'contrast') return reviewIntroScreen(ctx, id);
  const shell = makeShell({ ctx, title: ck.title, color: 'mint', steps: ck.rounds, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Round', seenKeys: ['checkpoint'], autoOpen: false, skipUntilDone: true });
  const current = sack({ ...ctx, checkpoint: ck, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
  return shell.mount(current, done);
}
