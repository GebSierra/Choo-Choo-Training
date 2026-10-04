import { h } from '../dom.js';
import { makeShell } from './shell.js';
import { build as sack } from './sack.js';
import { bookBuild, loadBook } from './book.js';
import { rideBuild } from './ride.js';

// A checkpoint is a bonus stop on the line. By default a review game (the sound sack: one progress dot per round); with
// kind "book" a story to read (one dot per page); with kind "ride" Smooth Ride, the blending station (one dot per word). It uses the task shell and ends on the same two-step finish screen as a lesson.
export async function checkpointScreen(ctx, id) {
  const { store, router, curriculum } = ctx;
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id);
  if (!ck || !store.isCheckpointUnlocked(ck)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const done = () => router.go(`/checkpoint/${ck.id}/finish`);
  if (ck.kind === 'book') {
    const book = await loadBook(ck, store);
    const shell = makeShell({ ctx, title: ck.title, color: 'sky', steps: book.pages.length, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Page', seenKeys: ['book'], autoOpen: true, skipUntilDone: true });
    const current = bookBuild({ ...ctx, checkpoint: ck, book, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
    return shell.mount(current, done);
  }
  if (ck.kind === 'ride') {
    const shell = makeShell({ ctx, title: ck.title, color: 'sun', steps: ck.rounds, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Word', seenKeys: ['ride'], autoOpen: true, skipUntilDone: true });
    const current = rideBuild({ ...ctx, checkpoint: ck, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
    return shell.mount(current, done);
  }
  const shell = makeShell({ ctx, title: ck.title, color: 'mint', steps: ck.rounds, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Round', seenKeys: ['checkpoint'], autoOpen: false, skipUntilDone: true });
  const current = sack({ ...ctx, checkpoint: ck, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
  return shell.mount(current, done);
}
