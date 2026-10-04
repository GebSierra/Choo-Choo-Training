// The Smooth Ride detector: pure, no DOM, so it runs in node. It is fed one loudness reading (dBFS) per animation frame
// and says when the voice is on, when it has stopped, and at the end of a try whether the sounds ran together.
//
//   const det = createDetector({ offHoldMs: 40, onHoldMs: 30, gapMs: 100, minRunMs: 500, endMs: 600 });
//   det.push(db, tMs) -> { phase: 'calibrating' | 'listening' | 'done', voiced, level01, k, result: null | 'smooth' | 'gap' | 'quiet' }
//
// Timing, and why:
//  - The first 300 ms are calibration: the noise floor is the median reading. On = max(floor + 12, -52) dB, off = on - 5
//    (hysteresis, so a held "sss" that flickers by a few dB does not stutter).
//  - voiced turns true when the level has stayed above "on" for onHoldMs (a click or a lip smack is shorter than that), and
//    false when it has stayed below "off" for offHoldMs. That is the visible cut: the screen reads voiced every frame.
//  - The verdict is separate. A silence of at least gapMs followed by more voice is a gap. The one exception is a word that
//    ends in a clipped sound (the t in "mat"): a burst under 120 ms that is the end of the try counts as the last
//    consonant, not a new run. Silences shorter than gapMs stop the train but never fail the try.
//  - The try ends endMs after the voice ends, or maxMs after calibration at the latest.
// Audio is only ever a number here: nothing is stored, sent or kept beyond the run list of a try.
export const DEFAULTS = { offHoldMs: 40, onHoldMs: 30, gapMs: 100, minRunMs: 500, endMs: 600, calibMs: 300, maxMs: 5000, onFloor: -52, onMargin: 12, hysteresisDb: 5, tailMs: 120, quietMs: 250, quietMargin: 8, quietLowest: -80 };

const median = (list) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : -90; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// opts.quiet: a quiet child (the screen sets it after two tries in a row with no voice): on = floor + 8, with no -52 minimum.
export function createDetector(options = {}) {
  const o = { ...DEFAULTS, ...options };
  let t0 = null, last = 0, floor = -90, on = o.onFloor, off = o.onFloor - o.hysteresisDb;
  let phase = 'calibrating', voiced = false, result = null;
  const calib = [];
  let aboveSince = null, belowSince = null; // the start of the current stretch above on / below off
  let runStart = null;                      // when the voice that is on now began
  const runs = [];                          // [{ start, end }] of every voiced stretch
  let lastVoiceEnd = null, listenStart = null;
  let level01 = 0, k = 0;

  function verdict() {
    // Drop a final burst under tailMs after a silence: the closure and release of a clipped last sound.
    const list = runs.map((r) => ({ ...r }));
    if (list.length > 1 && list[list.length - 1].end - list[list.length - 1].start < o.tailMs) list.pop();
    if (!list.length || Math.max(...list.map((r) => r.end - r.start)) < o.quietMs) return 'quiet';
    // Join stretches with a hiccup (a gap shorter than gapMs); a longer silence between two stretches is a real gap.
    const chains = [{ ...list[0] }];
    for (let i = 1; i < list.length; i++) {
      const c = chains[chains.length - 1];
      if (list[i].start - c.end >= o.gapMs) chains.push({ ...list[i] }); else c.end = list[i].end;
    }
    if (chains.length > 1) return 'gap';
    return chains[0].end - chains[0].start >= o.minRunMs ? 'smooth' : 'gap';
  }

  function push(db, tMs) {
    const v = Number.isFinite(db) ? Math.max(-100, Math.min(0, db)) : -100;
    if (t0 === null) { t0 = Math.max(0, tMs); last = t0; }
    const t = Math.max(last, tMs); // a time that goes backwards counts as no time passing
    last = t;
    const since = t - t0;
    if (result) return { phase: 'done', voiced: false, level01: 0, k: 0, result };

    if (phase === 'calibrating') {
      calib.push(v);
      if (since >= o.calibMs) {
        floor = median(calib);
        on = o.quiet ? Math.max(floor + o.quietMargin, o.quietLowest) : Math.max(floor + o.onMargin, o.onFloor);
        off = on - o.hysteresisDb;
        phase = 'listening';
        listenStart = t;
      }
      return { phase, voiced: false, level01: 0, k: 0, result: null };
    }

    level01 = clamp01((v - floor) / 40);
    k = clamp01((v - on) / 20);
    if (!voiced) {
      if (v >= on) {
        if (aboveSince === null) aboveSince = t;
        if (t - aboveSince >= o.onHoldMs) { voiced = true; runStart = aboveSince; belowSince = null; }
      } else aboveSince = null;
    } else if (v < off) {
      if (belowSince === null) belowSince = t;
      if (t - belowSince >= o.offHoldMs) {
        voiced = false; aboveSince = null;
        runs.push({ start: runStart, end: belowSince });
        lastVoiceEnd = belowSince; runStart = null; belowSince = null;
      }
    } else belowSince = null;

    const outOfTime = t - listenStart >= o.maxMs;
    const finished = !voiced && lastVoiceEnd !== null && t - lastVoiceEnd >= o.endMs;
    if (outOfTime || finished) {
      if (voiced && runStart !== null) { runs.push({ start: runStart, end: t }); voiced = false; }
      result = verdict();
      return { phase: 'done', voiced: false, level01: 0, k: 0, result };
    }
    return { phase, voiced, level01: voiced ? level01 : 0, k: voiced ? k : 0, result: null };
  }

  return { push, get thresholds() { return { floor, on, off }; }, get runs() { return runs.map((r) => ({ ...r })); } };
}
