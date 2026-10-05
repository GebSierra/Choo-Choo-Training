// Sound effects: little musical sounds for things that get completed, made with the Web Audio API (no audio files, so
// nothing to precache and it works offline). They never say or imitate a letter sound or a word: they are bells.
//
// One shared AudioContext, created on the first tap (the same gesture that lets the phone speak). Everything goes
// through a master gain and a soft limiter, so nothing is ever loud or harsh. Each sound is a short list of soft
// bell notes from the C major pentatonic scale, so anything heard together is pleasant. Every call is wrapped: a missing
// or blocked AudioContext never throws and never blocks the screen.
//
//   sfx.play('sparkle' | 'pop' | 'star' | 'win' | 'lesson' | 'unlock' | 'checkpoint' | 'toot', { step, delay, bloop })
//
// 'toot' is the little train's whistle: two soft pentatonic notes (G5 then E5), each a breathy sine that slides up into
// its pitch. It is a short sound, so callers play it when no jingle is ringing (before a jingle, or once it has ended).
//
// There is no sound for ordinary taps, Next, Again, navigation or a wrong touch.

// C major pentatonic: C5 D5 E5 G5 A5 C6. Nothing is ever sounded above C6 (2 kHz at most with its one partial).
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5;
const POP_STEPS = [C5, D5, E5, G5, A5]; // the train's progress in Letter Hunt, one step up per right touch
const LEVEL = 0.22;                     // master gain at the default volume setting
const DEFAULT_VOLUME = 0.6;
const JINGLES = new Set(['win', 'lesson', 'unlock', 'checkpoint']); // the long ones: they cancel the short ones ringing
const PATIENT = new Set(['win', 'lesson', 'unlock', 'checkpoint']); // these wait for a voice that has just started

// A sound as notes: [frequency, start (s), decay (s), relative loudness]. The last two of a list may be the shimmer.
const SOUNDS = {
  sparkle: [[C5, 0, 0.45, 1], [E5, 0.11, 0.45, 1], [G5, 0.22, 0.55, 1], [C6, 0.3, 0.9, 0.45]],
  star: [[G5, 0, 0.45, 1], [C6, 0.13, 0.75, 1]],
  win: [[C5, 0, 0.4, 1], [D5, 0.12, 0.4, 1], [E5, 0.24, 0.4, 1], [G5, 0.36, 0.45, 1], [A5, 0.48, 0.5, 1], [C6, 0.66, 0.9, 1.1], [C6 * 1.005, 0.66, 0.9, 0.4]],
  lesson: [[C5, 0, 0.5, 1], [E5, 0.2, 0.5, 1], [G5, 0.4, 0.5, 1], [A5, 0.6, 0.55, 1], [G5, 0.85, 0.55, 1], [C6, 1.05, 0.75, 1], [C5, 1.1, 0.7, 0.5], [E5, 1.1, 0.7, 0.45], [G5, 1.1, 0.7, 0.4]],
  unlock: [[C5, 0, 0.45, 1], [E5, 0.11, 0.45, 1], [G5, 0.22, 0.55, 1], [C6, 0.3, 0.9, 0.45], [E5, 0.42, 0.5, 1], [C6, 0.56, 0.8, 1]],
  checkpoint: [[C5, 0, 0.4, 1], [D5, 0.12, 0.4, 1], [E5, 0.24, 0.4, 1], [G5, 0.36, 0.45, 1], [A5, 0.48, 0.5, 1], [E5, 0.78, 0.4, 1], [G5, 0.9, 0.4, 1], [A5, 1.02, 0.45, 1], [C6, 1.2, 1, 1.1], [C6 * 1.005, 1.2, 1, 0.4], [C5, 1.25, 0.9, 0.5], [E5, 1.25, 0.9, 0.45], [G5, 1.25, 0.9, 0.4]],
};

function createSfx() {
  let store = null, speech = null, ctx = null, master = null, unlocked = false, broken = false;
  let active = [];           // voices still ringing: { end, jingle, gains, oscs }
  let speechStartedAt = 0, wasSpeaking = false, waiting = [], sleepTimer = 0;

  const enabled = () => !broken && store && store.settings.sfx !== false;
  const volume = () => { const v = store && Number(store.settings.sfxVolume); return Math.max(0, Math.min(1, Number.isFinite(v) ? v : DEFAULT_VOLUME)); };

  function context() {
    if (ctx || broken) return ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) { broken = true; return null; }
      ctx = new Ctor();
      master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor(); // a soft limiter: nothing is ever harsh
      limiter.threshold.value = -14; limiter.knee.value = 24; limiter.ratio.value = 6; limiter.attack.value = 0.003; limiter.release.value = 0.25;
      master.connect(limiter); limiter.connect(ctx.destination);
    } catch { broken = true; ctx = null; }
    return ctx;
  }

  // One soft bell: a sine and one quiet partial an octave up (only where that stays under about 2.1 kHz).
  function bell(c, f, at, decay, loud, event, jingle) {
    const peak = 0.5 * loud;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.005);                 // a fast 5 ms attack
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);          // a soft decay
    gain.connect(master);
    const oscs = [];
    const partials = [[f, 1, false]];
    if (f * 2 <= 2100) partials.push([f * 2, 0.22, true]);
    for (const [freq, rel, partial] of partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, at);
      osc.eventName = event; osc.partial = partial;
      const g = c.createGain();
      g.gain.value = rel;
      osc.connect(g); g.connect(gain);
      osc.start(at); osc.stop(at + decay + 0.05);
      oscs.push(osc);
    }
    active.push({ end: at + decay + 0.05, jingle, gains: [gain], oscs });
  }

  // One whistle note: a slower, breathy attack, a little scoop up into the pitch, a held tone and a soft release.
  function whistle(c, f, at, hold, loud, event) {
    const peak = 0.42 * loud;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.04);
    gain.gain.setValueAtTime(peak * 0.85, at + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + hold + 0.16);
    gain.connect(master);
    const oscs = [];
    for (const [mult, rel, partial] of [[1, 1, false], [2, 0.12, true]]) {
      if (f * mult > 2100) continue;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * mult * 0.96, at);
      osc.frequency.exponentialRampToValueAtTime(f * mult, at + 0.06);
      osc.eventName = event; osc.partial = partial; osc.whistle = true;
      const g = c.createGain();
      g.gain.value = rel;
      osc.connect(g); g.connect(gain);
      osc.start(at); osc.stop(at + hold + 0.2);
      oscs.push(osc);
    }
    active.push({ end: at + hold + 0.2, jingle: false, gains: [gain], oscs });
  }

  // A tiny downward bloop under the Sound Sack drop.
  function bloop(c, at, event) {
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.35, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    gain.connect(master);
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(392, at);
    osc.frequency.exponentialRampToValueAtTime(196, at + 0.14);
    osc.eventName = event; osc.bloop = true;
    osc.connect(gain);
    osc.start(at); osc.stop(at + 0.2);
    active.push({ end: at + 0.2, jingle: false, gains: [gain], oscs: [osc] });
  }

  // A new long jingle cuts short anything still ringing; a short sound never starts over a ringing jingle.
  function ringing(now) { active = active.filter((v) => v.end > now); return active; }
  function cutShort(c) {
    const now = c.currentTime;
    for (const v of active) {
      v.gains.forEach((g) => { try { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0.0001, now, 0.02); } catch { /* fine */ } });
      v.oscs.forEach((o) => { try { o.stop(now + 0.12); } catch { /* already stopped */ } });
    }
    active = [];
  }

  // A running AudioContext keeps the phone's audio hardware awake even in silence, so it is suspended half a second
  // after the last sound has rung out, and resumed (in schedule) when the next one is due.
  function sleepLater() {
    clearTimeout(sleepTimer);
    const c = ctx;
    if (!c) return;
    const left = Math.max(0, ...active.map((v) => v.end - c.currentTime));
    sleepTimer = setTimeout(() => {
      try { if (ringing(c.currentTime).length === 0 && c.state === 'running' && c.suspend) c.suspend().catch(() => {}); } catch { /* fine */ }
    }, (left + 0.5) * 1000);
  }

  function schedule(name, opts) {
    if (document.hidden) return; // nothing sounds while the page is out of sight
    const c = context();
    if (!c) return;
    if (c.state === 'suspended' && c.resume) c.resume().catch(() => {});
    const now = c.currentTime, jingle = JINGLES.has(name);
    const live = ringing(now);
    if (jingle) cutShort(c);
    else if (live.some((v) => v.jingle)) return;
    master.gain.setValueAtTime(LEVEL * (volume() / DEFAULT_VOLUME), now);
    const at = now + 0.02 + (opts.delay || 0);
    if (name === 'toot') { whistle(c, G5, at, 0.2, 1, name); whistle(c, E5, at + 0.3, 0.38, 0.9, name); }
    else if (name === 'pop') bell(c, POP_STEPS[Math.max(0, Math.min(POP_STEPS.length - 1, opts.step || 0))], at, 0.6, 1, name, false);
    else {
      for (const [f, start, decay, loud] of SOUNDS[name] || []) bell(c, f, at + start, decay, loud, name, jingle);
      if (opts.bloop) bloop(c, at, name);
    }
    sleepLater();
  }

  function play(name, opts = {}) {
    try {
      if (!enabled() || !unlocked || document.hidden) return;
      const speaking = speech && speech.speaking;
      if (speaking && !PATIENT.has(name)) return; // never talk over the voice
      if (speaking && PATIENT.has(name) && performance.now() - speechStartedAt < 1000) {
        // The voice has only just started: let it finish, then celebrate.
        const go = () => { try { schedule(name, opts); } catch { /* never throws */ } };
        waiting.push({ name, go, at: performance.now() });
        return;
      }
      schedule(name, opts);
    } catch { /* a sound must never break the screen */ }
  }

  return {
    init({ store: s, speech: sp }) {
      store = s; speech = sp;
      if (speech && speech.onChange) speech.onChange(({ speaking }) => {
        if (speaking && !wasSpeaking) speechStartedAt = performance.now();
        if (!speaking && wasSpeaking && waiting.length) {
          const due = waiting.filter((w) => performance.now() - w.at < 5000); // not one that waited too long to matter
          waiting = [];
          due.forEach((w) => w.go());
        }
        wasSpeaking = speaking;
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) waiting = []; // a jingle that was waiting for the voice is dropped, not played later
        if (!ctx) return;
        try { if (document.hidden) { clearTimeout(sleepTimer); cutShort(ctx); ctx.suspend && ctx.suspend().catch(() => {}); } else sleepLater(); } catch { /* fine */ } // it wakes when the next sound is due
      });
    },
    // The first tap of the page session: only now may sound start.
    unlock() { unlocked = true; if (enabled()) { const c = context(); if (c && c.state === 'suspended' && c.resume) c.resume().catch(() => {}); sleepLater(); } },
    // 'none' before the first sound, then the AudioContext's state (tests and the frame check read it).
    state() { return ctx ? ctx.state : 'none'; },
    play,
  };
}

export const sfx = createSfx();
