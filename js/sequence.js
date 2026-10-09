// The station-complete sequence: when Home opens and one more station is done than the last time Home looked, the
// child's figure boards the train at the station just finished and rides to the next one (3D: js/screens/home3d.js,
// 2D: js/screens/home.js). `done` has one entry per stop in line order: false when the stop is not done, else its
// completion time (an ISO string, or null when none was saved). Returns the stop just finished, or -1 for none.
// The count of done stops is kept in settings.trainDone, so the sequence plays once per completion; the first time
// Home is seen (no count yet) it only records the count.
export function finishedStop(store, done, currentIndex) {
  const now = done.filter((d) => d !== false).length;
  const seen = Number.isInteger(store.settings.trainDone) ? store.settings.trainDone : null;
  if (store.settings.trainDone !== now) store.setSetting('trainDone', now);
  if (seen === null || now <= seen) return -1;
  let idx = -1, best = '';
  done.forEach((d, i) => { if (d !== false && i < currentIndex && (idx < 0 || (typeof d === 'string' && d >= best))) { idx = i; if (typeof d === 'string') best = d; } });
  return idx;
}

// The train stops at a Story or a Smooth Ride that comes next after the lessons just finished, instead of riding past it: of the
// checkpoints standing right before the current lesson, the first Story or Smooth Ride not yet done (and unlocked) becomes the
// current stop (grown-ups notice it). `nodes` is the line in order ({ lesson } or { checkpoint }); returns that node's index, or
// -1 when the current stop stays the lesson. Crates (sound sacks) never hold the train.
export function checkpointStopIndex(nodes, currentIndex, store) {
  if (!nodes[currentIndex] || !nodes[currentIndex].lesson) return -1;
  let first = -1;
  for (let i = currentIndex - 1; i >= 0 && nodes[i].checkpoint; i--) {
    const c = nodes[i].checkpoint;
    if ((c.kind === 'book' || c.kind === 'ride') && !store.isCheckpointDone(c) && store.isCheckpointUnlocked(c)) first = i;
  }
  return first;
}
