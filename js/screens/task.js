import { h } from '../dom.js';
import { makeShell } from './shell.js';
import { tasksFor, lessonByNumber } from '../lessons.js';
import { build as review } from './tasks/review.js';
import { build as newLetter } from './tasks/new-letter.js';
import { build as story } from './tasks/story.js';
import { build as words } from './tasks/words.js';
import { build as sounds } from './tasks/sounds.js';
import { build as writing } from './tasks/writing.js';
import { build as hunt } from './tasks/hunt.js';
import { build as barn } from './tasks/barn.js';
import { build as check } from './tasks/check.js';

const BUILDERS = { review, newLetter, story, words, sounds, writing, hunt, barn, check };
let lastIndex = {}; // remembers the previous task per lesson so the progress pill can glide

export function taskScreen(ctx, n, idx) {
  const { store, router, curriculum } = ctx;
  const lesson = lessonByNumber(curriculum, n);
  const tasks = lesson ? tasksFor(lesson) : [];
  const index = Number(idx);
  const task = tasks.find((t) => t.index === index);
  if (!lesson || !task || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace(lesson && store.isUnlocked(lesson.number) ? `/lesson/${n}` : '/home')); return h('div'); }
  const sound = curriculum.sounds[lesson.sound];
  const pos = tasks.indexOf(task);
  const isLast = pos === tasks.length - 1;

  const shell = makeShell({ ctx, title: task.name, color: task.color, steps: tasks.length, pos, from: tasks.findIndex((t) => t.index === lastIndex[lesson.number]), isLast, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to lesson', stepNoun: 'Task',
    // The parent script opens by itself the first time this kind of task, or this lesson, is opened on the device.
    seenKeys: [task.type, ...(pos === 0 && !store.lesson(lesson.number).tasksDone.length ? [`lesson:${lesson.number}`] : [])] });
  const current = BUILDERS[task.type]({ ...ctx, lesson, sound, refresh: shell.refresh });

  const advance = () => {
    store.markTask(lesson.number, task.index);
    lastIndex[lesson.number] = task.index;
    router.go(isLast ? `/lesson/${lesson.number}/finish` : `/lesson/${lesson.number}/task/${tasks[pos + 1].index}`);
  };
  return shell.mount(current, advance);
}
