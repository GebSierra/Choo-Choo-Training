import { h } from '../dom.js';
import { makeShell } from './shell.js';
import { build as sack } from './sack.js';

// A checkpoint is a bonus review game between lessons (the sound sack). It uses the task shell, with one progress
// dot per round, and ends on the same two-step finish screen as a lesson.
export function checkpointScreen(ctx, id) {
  const { store, router, curriculum } = ctx;
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id);
  if (!ck || !store.isCheckpointUnlocked(ck)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const shell = makeShell({ ctx, title: ck.title, color: 'mint', steps: ck.rounds, pos: 0, from: -1, isLast: true, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Round', seenKeys: ['checkpoint'], autoOpen: false, skipUntilDone: true });
  const current = sack({ ...ctx, checkpoint: ck, refresh: shell.refresh, setProgress: shell.setPos, setDone: shell.setDone });
  return shell.mount(current, () => router.go(`/checkpoint/${ck.id}/finish`));
}
