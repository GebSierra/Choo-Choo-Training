// Prototype 2 (Grownups > Previews): worlds, the world gateway, the "Did you know?" card, and the journey board. Each preview is reached only from the Previews fold in Grownups; nothing in the child's normal flow uses
// them yet. They show real data (curriculum.worlds, data/tips.json) and never change progress.
import { h, icon, reduced } from '../dom.js';
import { homeScreen } from './home.js';
import { tipCard, nextTip, loadTips } from '../components/tip-card.js';
import { journeyBoard } from '../components/journey-board.js';
import { currentWorld, nextWorld, lessonsIn } from '../worlds.js';

export const CARD_MIN_MS = 3000, CARD_FADE_MS = 380;

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

// The world gateway. The current world's Home (only its stations): the train rolls into a tunnel at the end of the line, the
// screen fades to a loading card ("Next stop: <world>", the world's colour, a tip), then the next world's Home is built and
// its train rolls out of a tunnel at the start. Without the 3D railway the same card shows between two flat maps.
export async function gatewayPreview(ctx) {
  const { curriculum, store } = ctx;
  const worlds = (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length);
  let from = currentWorld(store, curriculum), to = from && nextWorld(curriculum, from.id);
  if (!to) { from = worlds[0]; to = from && nextWorld(curriculum, from.id); } // the current world is the last built one: preview the first gateway
  if (!to) return h('div', { class: 'retry-card' }, h('p', {}, 'There is only one world so far.'), h('button', { class: 'btn', type: 'button', onclick: () => backToGrownups(ctx) }, 'Back'));

  const host = h('div', { class: 'gateway-host', dataset: { from: from.id, to: to.id } });
  let home = null, card = null, disposed = false, nextHome = null;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const still = reduced();

  const build = async (world, mode, onEnter) => { ctx.preview = { world: world.id, mode, onEnter }; return homeScreen(ctx); };
  const dispose = (el) => { if (el && el.cleanup) { try { el.cleanup(); } catch { /* fine */ } } if (el) el.remove(); };

  const showCard = async () => {
    if (disposed || card) return;
    const tip = nextTip(store, await loadTips());
    const shownAt = performance.now();
    card = h('div', { class: 'world-card', role: 'status', style: { '--wc': to.color }, dataset: { world: to.id } },
      h('div', { class: 'wg-panel' },
        h('div', { class: 'wg-head' },
          h('div', { class: 'wg-badge', 'aria-hidden': 'true' }, String(to.n)),
          h('p', { class: 'wg-next' }, 'Next stop:'),
          h('h2', { class: 'wg-name' }, to.name)),
        h('div', { class: 'wg-more' },
          tip ? h('div', { class: 'wg-tip' }, h('strong', {}, 'Did you know?'), h('p', {}, tip.text)) : null,
          h('p', { class: 'wg-hint' }, 'Tap to go'))));
    card.addEventListener('click', () => dismiss());
    host.append(card);
    void card.offsetWidth;
    card.classList.add('in');
    // once the card is solid the old world goes and the new one is built behind it
    later(async () => {
      if (disposed) return;
      dispose(home); home = null;
      nextHome = await build(to, 'in', null);
      if (disposed) { dispose(nextHome); return; }
      host.insertBefore(nextHome, card);
      card.dataset.ready = '1';
      later(() => dismiss(), Math.max(0, CARD_MIN_MS - (performance.now() - shownAt)));
    }, still ? 60 : CARD_FADE_MS);
  };

  let dismissed = false;
  const dismiss = () => {
    if (dismissed || disposed || !card || !nextHome) return; // a tap before the next world is built waits for it
    dismissed = true;
    card.classList.remove('in');
    card.classList.add('out');
    later(() => {
      card.remove(); card = null;
      home = nextHome;
      if (home.gatewayGo) home.gatewayGo();
    }, still ? 0 : CARD_FADE_MS);
  };

  home = await build(from, 'out', () => { showCard(); });
  host.append(home, backChip(ctx));
  if (!home.gatewayGo) later(() => showCard(), 1800); // the flat map has no tunnel: the card comes by itself
  host.cleanup = () => { disposed = true; timers.forEach(clearTimeout); timers.clear(); dispose(home); if (nextHome !== home) dispose(nextHome); };
  return host;
}

