// Prototype 2 (Grownups > Previews): worlds, the world gateway, the "Did you know?" card, and the journey board. Each preview is reached only from the Previews fold in Grownups; nothing in the child's normal flow uses
// them yet. They show real data (curriculum.worlds, data/tips.json) and never change progress.
import { h, icon, reduced } from '../dom.js';
import { homeScreen } from './home.js';
import { worldHost, CARD_MIN_MS, CARD_FADE_MS } from './crossing.js';
import { tipCard, nextTip, loadTips } from '../components/tip-card.js';
import { journeyBoard } from '../components/journey-board.js';
import { currentWorld, nextWorld, lessonsIn } from '../worlds.js';

export { CARD_MIN_MS, CARD_FADE_MS };

// Back to Grownups, within the ten minutes of the hold that opened it (else Grownups sends the grown-up home).
const backToGrownups = (ctx) => { ctx.gate = { openedAt: ctx.guOpenedAt || Date.now() }; ctx.router.go('/grownups'); };
const backChip = (ctx) => h('button', { class: 'preview-back', type: 'button', 'aria-label': 'Back to Grownups', onclick: () => backToGrownups(ctx) }, icon('back', 22), h('span', {}, 'Grownups'));

// The real Home with the "Did you know?" card over it, as it would appear when the app opens.
export async function tipPreview(ctx) {
  const root = await homeScreen(ctx);
  const tips = await loadTips();
  const tip = nextTip(ctx.store, tips);
  root.append(backChip(ctx));
  if (tip) { const id = setTimeout(() => { if (root.isConnected) tipCard({ host: root, tip }); }, reduced() ? 100 : 700); const c = root.cleanup; root.cleanup = () => { clearTimeout(id); if (c) c(); }; }
  return root;
}

// The real Home with the journey board over it; "All aboard!" closes the board and leaves Home.
export async function boardPreview(ctx) {
  const root = await homeScreen(ctx);
  root.append(backChip(ctx));
  journeyBoard({ host: root, curriculum: ctx.curriculum, store: ctx.store });
  return root;
}

// The world gateway. The current world's Home (only its stations): the train rolls into the portal at the end of the line, the
// screen fades to a loading card ("Next stop: <world>", the world's colour, a tip), then the next world's Home is built and
// its train rolls out of a tunnel at the start (js/screens/crossing.js, the same host the real Home uses; this one saves nothing).
export async function gatewayPreview(ctx) {
  const { curriculum, store } = ctx;
  const worlds = (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length);
  let from = currentWorld(store, curriculum), to = from && nextWorld(curriculum, from.id);
  if (!to) { from = worlds[0]; to = from && nextWorld(curriculum, from.id); } // the current world is the last built one: preview the first gateway
  if (!to) return h('div', { class: 'retry-card' }, h('p', {}, 'There is only one world so far.'), h('button', { class: 'btn', type: 'button', onclick: () => backToGrownups(ctx) }, 'Back'));
  return worldHost(ctx, { from, to, real: false, back: backChip(ctx) });
}
