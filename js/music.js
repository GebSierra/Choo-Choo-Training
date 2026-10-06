// The theme song (assets/audio/music/theme.mp3, 61 s): it plays once through, never loops, each time the Home (the pathway
// page) opens, and fades out when the Home is left. Two rules from the owner: it never starts on top of a celebration (the
// station-complete ride or a level party: the Home says when that is over), and it ducks, quieter, while the voice speaks or a
// jingle rings. It starts by itself when the Home opens (owner): it tries to play at once, which works wherever the browser
// allows it (Android Chrome for an app added to the home screen, a native store build, or after any earlier tap in this page
// session); where the browser blocks sound before a first tap, the attempt fails quietly and the theme starts on that tap.
//
// The train whistle (a sample in js/sfx.js) sounds together with the theme at the first Home of each app launch only.
//
// One HTMLAudioElement (made with createElement so the test stub for `new Audio()` never sees it); no animation loop: a
// fade or a duck is a few setTimeout steps, then nothing runs.
//
//   music.playTheme()            start from the beginning, unless it is already playing (then it just carries on)
//   music.stopTheme({ fade })    a short volume fade, then pause
//   music.duck(on)               quieter while on (the voice and the jingles do this by themselves)
//   music.enterHome({ hold })    the Home opened; hold() is true while a celebration must finish first
//   music.leaveHome()            the Home was left: stop the theme (and cancel a start that was waiting)
const SRC = 'assets/audio/music/theme.mp3';
const LEVEL = 0.45, DUCKED = 0.15, RAMP_MS = 250;

function createMusic() {
  let store = null, sfx = null, el = null, unlocked = false, playing = false, stopping = false;
  let homeOpen = false, hold = null, holdTimer = 0, whistled = false, startedThisVisit = false, trying = false;
  let rampTimer = 0, rampId = 0;
  const ducks = { manual: false, speech: false, jingle: false };
  let jingleTimer = 0;

  const on = () => !!store && store.settings.music !== false;
  const ducked = () => ducks.manual || ducks.speech || ducks.jingle;
  const target = () => (ducked() ? DUCKED : LEVEL);

  function ensure() {
    if (el) return el;
    try {
      el = document.createElement('audio');
      el.preload = 'auto'; el.loop = false; el.volume = LEVEL;
      el.addEventListener('ended', () => { playing = false; });
      el.src = SRC;
    } catch { el = null; }
    return el;
  }

  // A few volume steps with setTimeout (a finite ramp, not a loop). A newer ramp replaces the one before.
  function ramp(to, ms, done) {
    clearTimeout(rampTimer);
    const id = ++rampId;
    if (!el) { if (done) done(); return; }
    const from = el.volume, steps = 5;
    let n = 0;
    const tick = () => {
      if (id !== rampId) return;
      n++;
      try { el.volume = Math.max(0, Math.min(1, from + (to - from) * (n / steps))); } catch { /* fine */ }
      if (n < steps) rampTimer = setTimeout(tick, ms / steps); else if (done) done();
    };
    rampTimer = setTimeout(tick, ms / steps);
  }

  function pauseNow() {
    clearTimeout(rampTimer); rampId++;
    stopping = false; playing = false;
    if (el) { try { el.pause(); el.currentTime = 0; el.volume = target(); } catch { /* fine */ } }
  }

  function playTheme() {
    if (!on() || !unlocked || (typeof document !== 'undefined' && document.hidden)) return false;
    if (!ensure()) return false;
    if (stopping) pauseNow();               // a fade was still running: it is over, start again from the beginning
    if (playing) return true;               // already playing: carry on
    try {
      clearTimeout(rampTimer); rampId++;
      el.currentTime = 0; el.volume = target();
      playing = true;
      const p = el.play();
      if (p && p.catch) p.catch(() => { playing = false; });
    } catch { playing = false; return false; }
    return true;
  }

  function stopTheme({ fade = 600 } = {}) {
    if (!el || !playing || stopping) return;
    if (!fade) { pauseNow(); return; }
    stopping = true;
    ramp(0, fade, () => { if (stopping) pauseNow(); });
  }

  function duck(flag, who = 'manual') {
    ducks[who] = !!flag;
    if (el && playing && !stopping) ramp(target(), RAMP_MS);
  }

  // The Home may start the theme now: it is open, unlocked and nothing is celebrating.
  function tryStart() {
    clearTimeout(holdTimer); holdTimer = 0;
    if (!homeOpen || startedThisVisit || trying) return;
    ensure(); // begin loading, even before the first tap
    if (hold && hold()) { holdTimer = setTimeout(tryStart, 250); return; } // a finite wait: one check every quarter second until the party is over
    if (!unlocked) { autoStart(); return; }
    startedThisVisit = true;
    playTheme();
    if (!whistled) { whistled = true; if (sfx) sfx.play('whistle'); }
  }

  // No tap yet: try to play anyway. If the browser allows it, this counts as the unlock (the whistle's audio context is resumed
  // too); if it refuses, nothing is heard and the first tap starts both, as before.
  function autoStart() {
    if (!on() || !ensure() || (typeof document !== 'undefined' && document.hidden)) return;
    trying = true;
    let p;
    try { el.currentTime = 0; el.volume = target(); p = el.play(); } catch { trying = false; return; }
    Promise.resolve(p).then(() => {
      trying = false;
      if (!homeOpen) { try { el.pause(); } catch { /* fine */ } return; }
      unlocked = true; playing = true; startedThisVisit = true;
      if (sfx && sfx.unlock) sfx.unlock();
      if (!whistled) { whistled = true; if (sfx) sfx.play('whistle'); }
    }, () => { trying = false; playing = false; });
  }

  return {
    init({ store: s, speech, sfx: x }) {
      store = s; sfx = x;
      if (speech && speech.onChange) speech.onChange(({ speaking }) => duck(speaking, 'speech'));
      if (sfx && sfx.onJingle) sfx.onJingle((seconds) => {
        clearTimeout(jingleTimer);
        duck(true, 'jingle');
        jingleTimer = setTimeout(() => duck(false, 'jingle'), seconds * 1000 + 200);
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (playing && el) { try { el.pause(); } catch { /* fine */ } } }
        else if (playing && el) { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch { /* fine */ } }
      });
    },
    // The first tap of the page session (the same gesture that unlocks sfx and speech).
    unlock() { if (unlocked) return; unlocked = true; tryStart(); },
    enterHome(opts = {}) {
      homeOpen = true; startedThisVisit = false; hold = opts.hold || null;
      tryStart();
    },
    leaveHome() {
      homeOpen = false; hold = null; clearTimeout(holdTimer); holdTimer = 0;
      stopTheme();
    },
    playTheme, stopTheme, duck,
    // tests read these
    get playing() { return playing; },
    get element() { return el; },
  };
}

export const music = createMusic();
