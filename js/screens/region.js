// #/world/<id> (W1 .. W11): a read-only look at one world's 3D Home, for the grown-up (Grownups links here). The world's own
// theme (js/train/themes.js), the child's character and Pip as usual, the train at the start, the end portal with its signpost and a
// start tunnel for any later world. A world with no lessons yet gets one locked placeholder station per sound it will teach.
// Nothing is written to the store: no progress, no train position, no first-run flag. Tapping a station only wobbles its sign.
import { h, icon } from '../dom.js';
import { homeScreen } from './home.js';
import { worldById } from '../worlds.js';

const TEN_MIN = 10 * 60 * 1000;
// Back to Grownups while the hold that opened it is still fresh (as the other previews do), else Home.
const back = (ctx) => {
  if (ctx.guOpenedAt && Date.now() - ctx.guOpenedAt < TEN_MIN) { ctx.gate = { openedAt: ctx.guOpenedAt }; ctx.router.go('/grownups'); } else ctx.router.go('/home');
};
const backChip = (ctx) => h('button', { class: 'preview-back', type: 'button', 'aria-label': 'Back to Grownups', onclick: () => back(ctx) }, icon('back', 22), h('span', {}, 'Grownups'));

export async function regionScreen(ctx, id) {
  if (!worldById(ctx.curriculum, id)) return h('div', { class: 'retry-card' }, h('p', {}, 'There is no such world.'), h('button', { class: 'btn', type: 'button', onclick: () => back(ctx) }, 'Back'));
  ctx.preview = { world: id, mode: 'region' };
  const root = await homeScreen(ctx);
  root.append(backChip(ctx));
  return root;
}
