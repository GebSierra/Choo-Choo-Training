// Visiting an earlier world (roadmap 3d). The Home normally shows the world the child is on. A grown-up can go back to a world
// the child has reached (tap the start tunnel, or Grownups > Worlds): the Home then shows that world with its stations done and
// its end tunnel leading forward again. The visit lives only in memory (ctx.visit = { world }), so a reload or the next app open
// is on the current world. A visit is a look back and practice: while a lesson or stop of the visited world is open the store
// ignores every progress write (store.setPractice, set by app.js for those routes), so nothing is recorded, no level or crossing
// happens, and the pace limit is not used. Finishing a replayed lesson returns to the visited world.
import { h, reduced } from './dom.js';
import { currentWorld, reachedWorlds, worldById } from './worlds.js';

// The world a visit shows, or null (and the visit is dropped) when there is none, it is the current world, or it was never reached.
export function activeVisit(ctx) {
  const v = ctx.visit;
  if (!v) return null;
  const cur = currentWorld(ctx.store, ctx.curriculum);
  if (!cur || v.world === cur.id || !reachedWorlds(ctx.store, ctx.curriculum).some((w) => w.id === v.world)) { ctx.visit = null; return null; }
  return worldById(ctx.curriculum, v.world);
}

// Is the lesson or checkpoint at this address part of the visited world (so opening it is practice)? A stop of any other world ends the visit.
export function practiceFor(ctx, path) {
  const v = activeVisit(ctx);
  if (!v) return false;
  const m = path.match(/^\/(lesson|checkpoint)\/([\w-]+)(?:\/|$)/);
  if (!m) return false;
  const item = m[1] === 'lesson' ? ctx.curriculum.lessons.find((l) => l.number === Number(m[2])) : (ctx.curriculum.checkpoints || []).find((c) => c.id === m[2]);
  if (item && item.world === v.id) return true;
  ctx.visit = null;
  return false;
}

// Go to a world on the Home. worldId: any reached world; the current world (or anything else) ends the visit. host: the Home's root
// element, to show the short world card first (a plain fade; reduced motion: no card, at once). Without a host (Grownups) it just goes.
export function goToWorld(ctx, worldId, { host = null, verb = 'Back to' } = {}) {
  const target = reachedWorlds(ctx.store, ctx.curriculum).find((w) => w.id === worldId) || null;
  const cur = currentWorld(ctx.store, ctx.curriculum);
  ctx.visit = target && cur && target.id !== cur.id ? { world: target.id } : null;
  const dest = target || cur;
  const go = () => ctx.router.go('/home');
  if (!host || reduced() || !dest || host.querySelector('.world-card.visit-card')) { go(); return; }
  const card = h('div', { class: 'world-card visit-card', role: 'status', style: { '--wc': dest.color }, dataset: { world: dest.id } },
    h('div', { class: 'wg-panel' }, h('div', { class: 'wg-head' }, h('div', { class: 'wg-badge', 'aria-hidden': 'true' }, String(dest.n)), h('p', { class: 'wg-next' }, verb + ':'), h('h2', { class: 'wg-name' }, dest.name))));
  card.style.cursor = 'default';
  host.append(card);
  void card.offsetWidth;
  card.classList.add('in');
  setTimeout(go, 400);
}
