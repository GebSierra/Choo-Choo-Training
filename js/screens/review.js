import { h } from '../dom.js';
import { makeShell } from './shell.js';
import { BUILDERS } from './task.js';
import { TASK_TYPES } from '../lessons.js';
import { TAP_GAMES } from '../games-data.js';

// A Review Stop (checkpoint kind "review"): a short run of the lesson games on letters already taught, nothing new
// (docs/LESSON-REBUILD.md section 10). `ck.plan` lists the activities, each with the lesson whose sound it is about; the task
// screens are the very ones the lessons use, handed that lesson's data, so Letter Hunt, Green Light, Wagon Parade, Station Board
// and Ticket Check behave exactly as they do there. The finish screen is the checkpoint's (the grown-up's "Yes" saves the result).
const TIP = 'This is a review. Let your child try first. Only if your child misses, say the sound, then have your child say it after you.';
const lastIndex = {}; // the previous activity per stop, so the progress pill can glide

export function reviewTaskScreen(ctx, id, idx = 0) {
  const { store, router, curriculum } = ctx;
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id && c.kind === 'review');
  const index = Number(idx);
  if (!ck || !store.isCheckpointUnlocked(ck) || !Number.isInteger(index) || index < 0 || index >= ck.plan.length) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const step = ck.plan[index];
  const task = { type: step.task, ...TASK_TYPES[step.task] };
  const isLast = index === ck.plan.length - 1;
  const base = curriculum.lessons.find((l) => l.number === step.lesson);
  // The tap games run their short round counts (as in a lesson with several games); the sound is the planned lesson's.
  const lesson = { ...base, games: ck.plan.map((p) => p.task).filter((t) => TAP_GAMES.includes(t)) };
  const sound = curriculum.sounds[lesson.sound];
  const shell = makeShell({ ctx, title: task.name, color: task.color, steps: ck.plan.length, pos: index, from: lastIndex[ck.id] === undefined ? -1 : lastIndex[ck.id], isLast, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to the path', stepNoun: 'Game', autoAdvance: true, world: ck.world || 'W1',
    tip: TIP, tipKey: 'tip:review', autoOpen: !['hunt', 'signals', 'wagons', 'board'].includes(task.type), seenKeys: [task.type] });
  const current = BUILDERS[task.type]({ ...ctx, lesson, sound, refresh: shell.refresh, setDone: shell.setDone });
  const advance = () => {
    lastIndex[ck.id] = index;
    router.go(isLast ? `/checkpoint/${ck.id}/finish` : `/checkpoint/${ck.id}/task/${index + 1}`);
  };
  return shell.mount(current, advance);
}
