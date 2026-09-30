// The app speaks but never listens. Words and instructions use the browser's text to speech;
// isolated sounds (mmm, aaa, sss) only ever come from recorded clips, never from text to speech,
// and those clips play only when the parent turns on "Play recorded letter sounds" (off by default).
//
// say(parts) takes [{tts:'text'} | {clip:'m'} | {src:'path'} | {pause:ms}] and plays them in order.
// A new say() cancels the one before it. The returned promise always resolves, so no screen ever waits
// on speech that never starts.

const START_TIMEOUT = 2000;   // if speech has not started by then, move on
const MAX_UTTERANCE = 15000;  // hard ceiling for one spoken part
const isIsolatedSound = (t) => {
  const s = t.trim().toLowerCase().replace(/[^a-z]/g, '');
  return s.length === 1 || (s.length > 1 && /^(.)\1+$/.test(s));
};

export function normalizeLang(l) { return (l || '').replace('_', '-').toLowerCase(); }

export function pickVoice(voices, savedURI) {
  if (!voices || !voices.length) return null;
  if (savedURI) {
    const saved = voices.find((v) => v.voiceURI === savedURI);
    if (saved) return saved;
  }
  const us = voices.filter((v) => normalizeLang(v.lang) === 'en-us');
  return us.find((v) => /google/i.test(v.name))
    || us.find((v) => /microsoft|natural/i.test(v.name))
    || us[0] || null;
}

export function createSpeech({ store, curriculum }) {
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  let unlocked = false;
  let voices = [];
  let runId = 0;
  let speaking = false;
  let active = null;               // {audio?, done}
  const missing = new Set();       // clip keys that failed to load
  const clipStatus = {};           // key -> true | false
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn({ speaking, missing: [...missing] }));

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    const cur = store.settings.voiceURI;
    if (!cur && voices.length) {
      const v = pickVoice(voices, null);
      if (v) store.setSetting('voiceURI', v.voiceURI);
    }
  }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
    setTimeout(loadVoices, 800); // second try for browsers that never fire voiceschanged
  }

  // A clip is declared as one path (mp3). If a webm recorded with tools/record.html sits next to it, that is tried second.
  const clipUrls = (key) => {
    const c = curriculum.sounds[key] && curriculum.sounds[key].clip;
    if (!c) return [];
    return /\.mp3$/.test(c) ? [c, c.replace(/\.mp3$/, '.webm')] : [c];
  };

  // The clips of a phrase are created up front, so each one is already loaded when its turn comes
  // and a blend like sss-aaa-mmm plays with no gap.
  function preload(list) {
    const els = new Map();
    for (const part of list) {
      const url = part.clip !== undefined && clipUrls(part.clip)[0];
      if (url && !els.has(url)) { const a = new Audio(); a.preload = 'auto'; a.src = url; els.set(url, a); }
    }
    return els;
  }

  // Resolves 'played', 'missing' (the file failed to load) or 'skipped' (cancelled, blocked by the
  // browser or timed out, which says nothing about the file).
  function playAudio(url, key, el) {
    return new Promise((resolve) => {
      let settled = false;
      const audio = el || new Audio();
      const mine = { stop: () => { audio.pause(); finish('skipped'); } };
      const finish = (state) => {
        if (settled) return; settled = true;
        clearTimeout(startTimer); clearTimeout(maxTimer);
        if (active === mine) active = null;
        if (key && state === 'played') { clipStatus[key] = true; if (missing.delete(key)) emit(); }
        resolve(state);
      };
      const startTimer = setTimeout(() => { audio.pause(); finish('skipped'); }, START_TIMEOUT + 1500);
      const maxTimer = setTimeout(() => { audio.pause(); finish('skipped'); }, 8000);
      audio.addEventListener('playing', () => clearTimeout(startTimer), { once: true });
      audio.addEventListener('ended', () => finish('played'), { once: true });
      audio.addEventListener('error', () => finish('missing'), { once: true });
      active = mine;
      if (!el) { audio.preload = 'auto'; audio.src = url; }
      else if (audio.error) return finish('missing'); // the preloaded file already failed to load
      else audio.currentTime = 0; // the same clip may play twice in one phrase
      const p = audio.play();
      if (p && p.catch) p.catch(() => finish('skipped')); // a refused play() is not a missing file
    });
  }

  function speakText(text) {
    return new Promise((resolve) => {
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return resolve();
      let settled = false, started = false;
      const finish = () => { if (settled) return; settled = true; clearTimeout(startTimer); clearTimeout(maxTimer); active = null; resolve(); };
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = store.settings.rate || 0.9;
      const v = pickVoice(voices.length ? voices : (synth.getVoices ? synth.getVoices() : []), store.settings.voiceURI);
      if (v) u.voice = v;
      u.onstart = () => { started = true; clearTimeout(startTimer); };
      u.onend = finish;
      u.onerror = finish;
      const startTimer = setTimeout(() => { if (!started) { try { synth.cancel(); } catch {} finish(); } }, START_TIMEOUT);
      const maxTimer = setTimeout(() => { try { synth.cancel(); } catch {} finish(); }, MAX_UTTERANCE);
      active = { stop: finish };
      try { synth.speak(u); } catch { finish(); }
    });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function say(parts) {
    let list = (Array.isArray(parts) ? parts : [parts]).map((p) => (typeof p === 'string' ? { tts: p } : p)).filter(Boolean);
    // By default the grown up says every sound: clip parts are skipped silently, never replaced by text to speech.
    if (!store.settings.playSounds) {
      list = list.filter((p) => p.clip === undefined);
      while (list.length && list[0].pause !== undefined) list.shift();
    }
    cancel();
    if (!unlocked || !list.length) return;
    const run = ++runId;
    speaking = true; emit();
    try {
      const loaded = preload(list);
      for (const part of list) {
        if (run !== runId) return;
        if (part.tts !== undefined) {
          if (isIsolatedSound(part.tts)) { console.warn('speech: refused to speak an isolated sound with text to speech:', part.tts); continue; }
          await speakText(part.tts);
        } else if (part.clip !== undefined) {
          // Try each candidate file; if none plays, skip the part. Never replaced by text to speech.
          const states = [];
          for (const url of clipUrls(part.clip)) {
            if (run !== runId) return;
            const st = await playAudio(url, part.clip, loaded.get(url));
            states.push(st);
            if (st !== 'missing') break;
          }
          if (states.length && states.every((st) => st === 'missing')) { missing.add(part.clip); clipStatus[part.clip] = false; emit(); }
        } else if (part.src !== undefined) {
          await playAudio(part.src, null);
        } else if (part.pause !== undefined) {
          await wait(part.pause);
        }
      }
    } finally {
      if (run === runId) { speaking = false; emit(); }
    }
  }

  function cancel() {
    runId++;
    if (active) { const a = active; active = null; try { a.stop(); } catch {} }
    if (synth) { try { synth.cancel(); } catch {} }
    if (speaking) { speaking = false; emit(); }
  }

  // Ask whether each clip exists, for the Grownups screen. A network failure means unknown (null), not missing.
  async function checkClips() {
    for (const key of Object.keys(curriculum.sounds)) {
      let found = false, unknown = false;
      for (const url of clipUrls(key)) {
        try {
          const r = await fetch(url);
          if (r.body) r.body.cancel();
          if (r.ok && /audio|video|octet/i.test(r.headers.get('content-type') || 'audio')) { found = url; break; }
        } catch { unknown = true; }
      }
      clipStatus[key] = found || (unknown ? null : false);
      if (found) missing.delete(key); else if (!unknown) missing.add(key);
    }
    emit();
    return { ...clipStatus };
  }

  return {
    say, cancel, checkClips,
    unlock() { unlocked = true; },
    get unlocked() { return unlocked; },
    get speaking() { return speaking; },
    get missing() { return [...missing]; },
    // Speak on entry to a task, only if the parent left auto-speak on.
    autoSay(parts) { if (store.settings.autoSpeak) return say(parts); },
    voices() { return (synth && synth.getVoices ? synth.getVoices() : voices).filter((v) => normalizeLang(v.lang) === 'en-us'); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    hasSynth: !!synth,
  };
}
