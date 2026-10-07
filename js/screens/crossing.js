// The crossing between two worlds: the train rides into the tunnel portal at the end of the world it finished, the screen fades
// to a loading card ("Next stop: <world>", the world's colour, a tip), the next world's Home is built behind it, and its train
// rolls out of a tunnel at the start. The same host plays the preview in Grownups > Previews (real: false: nothing is saved).
// Without the 3D railway the same card shows between two flat maps. Nothing here loops: a few timers, then stillness.
import { h, reduced } from '../dom.js';
import { homeScreen } from './home.js';
import { tipCard, nextTip, loadTips } from '../components/tip-card.js';
import { journeyMini } from '../components/journey-board.js';

export const CARD_MIN_MS = 3000, CARD_FADE_MS = 380;

// plan: from planHome (js/worlds.js), plan.cross = { from, to }. Called by homeScreen when a crossing is due; once only, because
// planHome has already recorded the new world.
export function crossingHost(ctx, plan) {
  return worldHost(ctx, { from: plan.cross.from, to: plan.cross.to, real: true });
}

// opts.back: an element to keep on top (the preview's back chip).
export async function worldHost(ctx, { from, to, real, back = null }) {
  const { store } = ctx;
  const host = h('div', { class: 'gateway-host', dataset: { from: from.id, to: to.id, phase: 'home', real: real ? '1' : '0' } });
  const gate = { active: true }; // the theme song waits while this is true (js/music.js hold)
  let home = null, card = null, disposed = false, nextHome = null, dismissed = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const still = reduced();
  const phase = (p) => { host.dataset.phase = p; };
  const finish = () => { gate.active = false; phase('done'); };

  const build = async (world, mode, onEnter) => {
    if (real) ctx.homePlan = mode === 'out' ? { world, cross: { to, gate, onEnter }, hosted: true } : { world, arrive: { gate, onDone: finish }, hosted: true };
    else ctx.preview = { world: world.id, mode, onEnter };
    return homeScreen(ctx);
  };
  const dispose = (el) => { if (el && el.cleanup) { try { el.cleanup(); } catch { /* fine */ } } if (el) el.remove(); };

  const showCard = async () => {
    if (disposed || card) return;
    phase('card');
    const tip = nextTip(store, await loadTips());
    const shownAt = performance.now();
    card = h('div', { class: 'world-card', role: 'status', style: { '--wc': to.color }, dataset: { world: to.id } },
      h('div', { class: 'wg-panel' },
        h('div', { class: 'wg-head' },
          h('div', { class: 'wg-badge', 'aria-hidden': 'true' }, String(to.n)),
          h('p', { class: 'wg-next' }, 'Next stop:'),
          h('h2', { class: 'wg-name' }, to.name)),
        h('div', { class: 'wg-more' },
          journeyMini({ curriculum: ctx.curriculum, from, to }), // the little railway: the train rolls from the finished world to the next
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

  const dismiss = () => {
    if (dismissed || disposed || !card || !nextHome) return; // a tap before the next world is built waits for it
    dismissed = true;
    card.classList.remove('in');
    card.classList.add('out');
    later(() => {
      card.remove(); card = null;
      home = nextHome;
      phase('arrive');
      if (home.gatewayGo) home.gatewayGo(); else finish(); // the flat map has no tunnel to roll out of
    }, still ? 0 : CARD_FADE_MS);
  };

  home = await build(from, 'out', () => { showCard(); });
  host.append(home);
  if (back) host.append(back);
  if (!real && !home.gatewayGo) later(() => showCard(), 1800); // the preview's flat map: the card comes by itself
  host.cleanup = () => { disposed = true; gate.active = false; timers.forEach(clearTimeout); timers.clear(); dispose(home); if (nextHome !== home) dispose(nextHome); };
  return host;
}
