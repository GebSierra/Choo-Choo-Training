// Worlds and units (curriculum.worlds, curriculum.units; docs/CURRICULUM.md sections 9 and 11). A world is one stretch of
// track with its own stations; a unit is a group of new sounds inside it. Pure helpers, no DOM.
export const worldById = (curriculum, id) => (curriculum.worlds || []).find((w) => w.id === id) || null;
export const worldOf = (curriculum, lessonNumber) => {
  const l = curriculum.lessons.find((x) => x.number === lessonNumber);
  return l ? worldById(curriculum, l.world) : null;
};
export const lessonsIn = (curriculum, worldId) => curriculum.lessons.filter((l) => l.world === worldId);
export const checkpointsIn = (curriculum, worldId) => (curriculum.checkpoints || []).filter((k) => k.world === worldId);
// The world's units in order. A unit the plan has not built yet (stages 3 to 10) is { id, stage, sounds: [] }.
export function unitsIn(curriculum, worldId) {
  const w = worldById(curriculum, worldId);
  if (!w) return [];
  return w.units.map((id) => (curriculum.units || []).find((u) => u.id === id) || { id, stage: Number(id.split('.')[0]), sounds: [] });
}
export const lessonsOfUnit = (curriculum, unitId) => curriculum.lessons.filter((l) => l.unit === unitId);
// A unit is done when it has lessons and every one of them is done.
export function unitDone(store, curriculum, unitId) {
  const ls = lessonsOfUnit(curriculum, unitId);
  return ls.length > 0 && ls.every((l) => store.isDone(l.number));
}
export function worldDone(store, curriculum, worldId) {
  const ls = lessonsIn(curriculum, worldId);
  return ls.length > 0 && ls.every((l) => store.isDone(l.number));
}
// The world of the first lesson that is open and not done, else the last world that has lessons.
export function currentWorld(store, curriculum) {
  const n = store.currentLesson(curriculum.lessons.length);
  if (n !== null) return worldOf(curriculum, n);
  const withLessons = (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length);
  return withLessons[withLessons.length - 1] || null;
}
// The unit the child is on: the first unit with lessons that is not done, else the last unit with lessons.
export function currentUnit(store, curriculum, worldId) {
  const us = unitsIn(curriculum, worldId).filter((u) => lessonsOfUnit(curriculum, u.id).length);
  return us.find((u) => !unitDone(store, curriculum, u.id)) || us[us.length - 1] || null;
}
// The next world after worldId that has lessons, or null.
export function nextWorld(curriculum, worldId) {
  const ws = curriculum.worlds || [], i = ws.findIndex((w) => w.id === worldId);
  return ws.slice(i + 1).find((w) => lessonsIn(curriculum, w.id).length) || null;
}
// The world that follows worldId in the list, built or not (the portal at a world's end names it, so the child sees there is more).
export function worldAfter(curriculum, worldId) {
  const ws = curriculum.worlds || [], i = ws.findIndex((w) => w.id === worldId);
  return i >= 0 ? ws[i + 1] || null : null;
}
// What the Home shows. The world of the first open lesson that is not done, except that the Home first finishes the world
// the child last saw (state.worlds.seen) when that world is now done: then `cross` is { from, to } and the Home plays the
// crossing once. The first look (no record), a world reached by a Grownups unlock, and a reset only record the world.
// Returns { world, cross }; world is null when the curriculum has no worlds.
export function planHome(store, curriculum) {
  const cur = currentWorld(store, curriculum);
  if (!cur) return { world: null, cross: null };
  const seenId = store.worlds().seen;
  let world = cur, cross = null;
  if (seenId !== cur.id) {
    const from = seenId ? worldById(curriculum, seenId) : null;
    const next = from ? nextWorld(curriculum, from.id) : null;
    if (from && next && next.id === cur.id && worldDone(store, curriculum, from.id)) { world = from; cross = { from, to: cur }; }
    store.setWorlds({ seen: cur.id });
  }
  return { world, cross };
}

// What a grown-up wants to know about one world (Grownups > Progress): lessons done of total, the state, the gold level stars
// the world holds (a level belongs to the world of the lesson it comes after), the date of the last lesson finished there, and,
// for the current world, the unit the child is on and its sounds. `lastDone` is an ISO date string or null.
export function worldSummary(store, curriculum, worldId) {
  const ls = lessonsIn(curriculum, worldId);
  const done = ls.filter((l) => store.isDone(l.number));
  const cur = currentWorld(store, curriculum);
  const levels = (curriculum.levels || []).filter((v) => v.after !== null && ls.some((l) => l.number === v.after)).map((v) => ({ id: v.id, n: v.n, earned: store.isDone(v.after) }));
  const dates = ls.map((l) => store.lesson(l.number)).filter((o) => o.result === 'got-it' && typeof o.completedAt === 'string').map((o) => o.completedAt).sort();
  const finished = ls.length > 0 && done.length === ls.length;
  const unit = cur && cur.id === worldId ? currentUnit(store, curriculum, worldId) : null;
  return {
    total: ls.length, done: done.length, built: ls.length > 0,
    state: finished ? 'done' : cur && cur.id === worldId ? 'current' : ls.length ? 'later' : 'soon',
    levels, lastDone: dates.length ? dates[dates.length - 1] : null,
    unit: unit ? { id: unit.id, sounds: unit.sounds } : null,
  };
}
