import { build as sack } from '../sack.js';
import { practiceRounds, taughtBy } from '../../lessons.js';
// Task 9: Practicing Words. The Loading Dock game inside a lesson: the grown-up says "Find the mmmilk".
export function build(ctx) {
  const plan = practiceRounds(ctx.curriculum, ctx.lesson);
  return sack({ ...ctx, checkpoint: { id: `practice-${ctx.lesson.number}`, sounds: taughtBy(ctx.curriculum, ctx.lesson.number), rounds: plan.length, plan }, setProgress: () => {} });
}
