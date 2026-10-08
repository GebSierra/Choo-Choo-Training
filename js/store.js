// Progress and settings in localStorage. Every access is guarded: a throwing or corrupt store starts fresh.
import { ORDER } from './order.js';
import { cleanCharacter } from './character.js';
const KEY = 'reading.v1';
const AUTH_KEY = 'reading.auth'; // the grown-up account session (js/account.js). Never part of reading.v1.

// The account session lives next to the progress, behind the same seam (the platform test allows storage only in this file).
export const authStore = {
  read() { try { const v = JSON.parse(localStorage.getItem(AUTH_KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } },
  write(v) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(AUTH_KEY); } catch { /* storage unavailable */ } },
};

// The raw saved progress string, for the move to the app address (js/handoff.js). Null when there is none or storage is unavailable.
export const readRawProgress = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

const fresh = () => ({
  schema: 1,
  order: ORDER, // the lesson order this state was saved under (js/order.js)
  lessons: {},
  checkpoints: {}, // bonus review games between lessons, by id: {result, completedAt, unlocked}
  settings: { voiceURI: null, rate: 0.9, autoSpeak: false, playSounds: true, sfx: true, music: true, sfxVolume: 0.6, fullInstructions: false, trainWorld: true, seenScripts: {}, tipsSeen: [], migrated1912: true, pace4: true, speak0: true, perDay: 4, restOverride: null, dev: false, devOpenAll: false, devNoLimit: false },
  character: cleanCharacter({}), // the child's figure and name (js/character.js): on this device only
  meetDue: true, // the character creator shows once, after the welcome card
  firstRunDone: false,
  worlds: { seen: null }, // the world the child last saw on Home (js/worlds.js planHome): a crossing plays once, then this moves on
  levels: { seen: null, earned: {} }, // milestones (js/levels.js): how many were earned when Home last opened, and when each was
  lastOpened: null,
  savedAt: 0, // ms timestamp of the last real change (account sync: the later copy wins). Opening the app does not move it.
});

// A saved setting of the wrong type (a rate that is "fast", say) falls back to its default; numbers are clamped.
export function cleanSettings(s, d) {
  const num = (v, lo, hi, dflt) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt);
  const out = { ...s, rate: num(s.rate, 0.7, 1.1, d.rate), sfxVolume: num(s.sfxVolume, 0, 1, d.sfxVolume) };
  for (const k of ['autoSpeak', 'playSounds', 'sfx', 'music', 'fullInstructions', 'trainWorld', 'migrated1912', 'pace4', 'speak0']) if (typeof s[k] !== 'boolean') out[k] = d[k];
  for (const k of ['dev', 'devOpenAll', 'devNoLimit']) if (typeof s[k] !== 'boolean') out[k] = d[k];
  if (![0, 1, 2, 3, 4].includes(s.perDay)) out.perDay = d.perDay; // new lessons per day: 1 to 4, or 0 for no limit
  if (typeof s.restOverride !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.restOverride)) out.restOverride = null; // the local date a grown-up opened a resting lesson
  if (s.voiceURI !== null && typeof s.voiceURI !== 'string') out.voiceURI = d.voiceURI;
  if (!s.seenScripts || typeof s.seenScripts !== 'object' || Array.isArray(s.seenScripts)) out.seenScripts = {};
  if (!Array.isArray(s.tipsSeen) || !s.tipsSeen.every((x) => Number.isInteger(x))) out.tipsSeen = [];
  return out;
}

// Levels: seen is an integer >= 0 or null, earned maps level id to an ISO string. Anything else is fresh.
export function cleanLevels(v) {
  const f = { seen: null, earned: {} };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return f;
  if (v.seen !== null && !(Number.isInteger(v.seen) && v.seen >= 0)) return f;
  if (!v.earned || typeof v.earned !== 'object' || Array.isArray(v.earned) || !Object.values(v.earned).every((x) => typeof x === 'string')) return f;
  return { seen: v.seen, earned: { ...v.earned } };
}

// Worlds: seen is a world id string or null. Anything else is fresh.
export function cleanWorlds(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && typeof v.seen === 'string' && v.seen ? { seen: v.seen } : { seen: null };
}

// Today's local date as YYYY-MM-DD (the pace limit rolls over at local midnight).
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function createStore() {
  let migrated = false;
  const listeners = new Set(); // called after each real change (account sync pushes from here)
  let state = load();
  if (migrated) save(false);

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      return parse(JSON.parse(raw));
    } catch { return fresh(); }
  }
  // Turn saved JSON (from this device or the cloud) into a clean state. Anything wrong starts fresh.
  function parse(p) {
    try {
      if (!p || p.schema !== 1 || !p.lessons || typeof p.lessons !== 'object' || Array.isArray(p.lessons)) return fresh();
      const f = fresh();
      // v1.8.1 changed the sound order: a real install (it has been opened, so it has lastOpened) saved under another order starts its lessons again once. Settings, seen task scripts, the name and the welcome stay.
      const reorder = p.order !== ORDER && typeof p.lastOpened === 'string';
      const lessons = {};
      for (const [n, l] of Object.entries(reorder ? {} : p.lessons)) {
        if (l && typeof l === 'object' && !Array.isArray(l)) lessons[n] = { ...l, tasksDone: Array.isArray(l.tasksDone) ? l.tasksDone.filter(Number.isInteger) : [] };
      }
      let settings = p.settings && typeof p.settings === 'object' && !Array.isArray(p.settings) ? p.settings : {};
      if (reorder) {
        migrated = true;
        const { trainAt, ...rest } = settings;
        const seen = rest.seenScripts && typeof rest.seenScripts === 'object' && !Array.isArray(rest.seenScripts) ? rest.seenScripts : {};
        settings = { ...rest, seenScripts: Object.fromEntries(Object.entries(seen).filter(([k]) => !/^lesson:/.test(k))) };
      }
      // v1.9.12 removed the Train world and Play recorded letter sounds switches: both are always on. A save from before turns them back on once.
      if (settings.migrated1912 !== true) { migrated = true; settings = { ...settings, trainWorld: true, playSounds: true, migrated1912: true }; }
      // The owner raised the default pace from 2 to 4 new lessons a day (1.9.20): a save still on the old default moves to 4 once.
      if (settings.pace4 !== true) { migrated = true; settings = { ...settings, perDay: settings.perDay === 2 || settings.perDay === undefined ? 4 : settings.perDay, pace4: true }; }
      // Owner (1.9.25+): the phone's voice no longer speaks by itself on a screen open. A save still on the old default (on) turns it off once; a later choice in Grownups is kept.
      if (settings.speak0 !== true) { migrated = true; settings = { ...settings, autoSpeak: false, speak0: true }; }
      // Saved data from before checkpoints existed simply has none.
      const checkpoints = {};
      if (p.checkpoints && typeof p.checkpoints === 'object' && !Array.isArray(p.checkpoints)) {
        for (const [id, c] of Object.entries(reorder ? {} : p.checkpoints)) if (c && typeof c === 'object' && !Array.isArray(c)) checkpoints[id] = c;
      }
      return { ...f, ...p, savedAt: Number.isFinite(p.savedAt) && p.savedAt > 0 ? p.savedAt : 0, order: ORDER, lessons, checkpoints, character: cleanCharacter(p.character), levels: cleanLevels(p.levels), worlds: cleanWorlds(p.worlds), meetDue: typeof p.meetDue === 'boolean' ? p.meetDue : typeof p.lastOpened === 'string', settings: cleanSettings({ ...f.settings, ...settings }, f.settings) };
    } catch { return fresh(); }
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: stay in memory */ }
  }
  // bump=false for housekeeping (opening the app) that must not make this copy look newer than the cloud's.
  function save(bump = true) {
    if (bump) state.savedAt = Date.now();
    write();
    if (bump) for (const fn of listeners) { try { fn(state); } catch { /* a listener must never break saving */ } }
  }
  const lesson = (n) => state.lessons[n] || { tasksDone: [], result: null, completedAt: null };
  const checkpoint = (id) => state.checkpoints[id] || { result: null, completedAt: null };

  return {
    get state() { return state; },
    get settings() { return state.settings; },
    lesson,
    // Finishing a lesson completes everything before it: a lesson counts as done when its own result is got-it or a later lesson's is.
    // This is derived, never written, so the saved results stay exactly as the child earned them.
    isDone(n) { return Object.entries(state.lessons).some(([k, l]) => Number(k) >= n && l && l.result === 'got-it'); },
    // Open by the rules of the path (the lesson before it is done, or a grown-up unlocked it), ignoring developer mode.
    isNaturallyUnlocked(n) { return n === 1 || lesson(n).unlocked === true || this.isDone(n - 1); },
    isUnlocked(n) { return this.devOpenAll || this.isNaturallyUnlocked(n); },
    get devOpenAll() { return state.settings.dev === true && state.settings.devOpenAll === true; },
    currentLesson(total) {
      for (let n = 1; n <= total; n++) if (this.isNaturallyUnlocked(n) && !this.isDone(n)) return n;
      return null;
    },
    // ---- the pace limit (settings.perDay): lessons first finished today count; the next new lesson then rests until tomorrow ----
    doneToday() { const k = dayKey(); return Object.values(state.lessons).filter((l) => l && l.result === 'got-it' && typeof l.doneAt === 'number' && dayKey(l.doneAt) === k).length; },
    paceActive() { const s = state.settings; return s.perDay > 0 && !(s.dev === true && (s.devOpenAll || s.devNoLimit)); },
    // The next new lesson is resting when today's limit is reached, unless a grown-up opened it for today. Done lessons, and lessons a grown-up unlocked, never rest.
    isResting(n) {
      if (!this.paceActive() || this.isDone(n) || !(n === 1 || this.isDone(n - 1)) || lesson(n).unlocked === true) return false;
      return state.settings.restOverride !== dayKey() && this.doneToday() >= state.settings.perDay;
    },
    allowToday() { this.setSetting('restOverride', dayKey()); },
    markTask(n, i) {
      const l = { ...lesson(n) };
      if (!l.tasksDone.includes(i)) l.tasksDone = [...l.tasksDone, i];
      state.lessons[n] = l; save();
    },
    setResult(n, result) {
      const l = { ...lesson(n), result, completedAt: new Date().toISOString() };
      if (result === 'got-it' && !this.isDone(n)) l.doneAt = Date.now(); // first time done (a lesson already completed by a later one does not count as new)
      state.lessons[n] = l; save();
    },
    resetLessonTasks(n) {
      state.lessons[n] = { ...lesson(n), tasksDone: [] }; save();
    },
    unlock(n) { state.lessons[n] = { ...lesson(n), unlocked: true }; save(); },
    checkpoint,
    // A checkpoint opens once the lesson it follows is done, or when the parent unlocks it in Grownups.
    isCheckpointUnlocked(ck) { return this.devOpenAll || checkpoint(ck.id).unlocked === true || this.isDone(ck.after); },
    // Done by its own result, or when any lesson after the one it follows is done. Pass the checkpoint (it knows `after`); a bare id only has its own result.
    isCheckpointDone(c) {
      const id = typeof c === 'string' ? c : c.id;
      if (checkpoint(id).result === 'got-it') return true;
      return typeof c === 'object' && c !== null && this.isDone(c.after + 1);
    },
    setCheckpointResult(id, result) { state.checkpoints[id] = { ...checkpoint(id), result, completedAt: new Date().toISOString() }; save(); },
    unlockCheckpoint(id) { state.checkpoints[id] = { ...checkpoint(id), unlocked: true }; save(); },
    levels: () => state.levels,
    setLevels(patch) { state.levels = { ...state.levels, ...patch, earned: { ...state.levels.earned, ...(patch.earned || {}) } }; save(); },
    worlds: () => state.worlds,
    setWorlds(patch) { state.worlds = cleanWorlds({ ...state.worlds, ...patch }); save(); },
    character: () => state.character,
    setCharacter(patch) { state.character = cleanCharacter({ ...state.character, ...patch }); save(); },
    // The creator was closed (All aboard or Later): keep what was picked and do not show it again.
    finishMeet(patch = {}) { state.character = cleanCharacter({ ...state.character, ...patch, made: true }); state.meetDue = false; save(); },
    setSetting(k, v) { state.settings = { ...state.settings, [k]: v }; save(); },
    setFirstRunDone() { state.firstRunDone = true; save(); },
    touch() { state.lastOpened = new Date().toISOString(); save(false); },
    // ---- account sync seam (js/account.js) ----
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // Nothing earned yet on this device: no lesson or checkpoint result and the welcome not finished.
    isFresh() { return !state.firstRunDone && !Object.values(state.lessons).some((l) => l && l.result) && !Object.values(state.checkpoints).some((c) => c && c.result); },
    // Take another copy of the state (the cloud's). Cleaned like a saved one; keeps its own savedAt; does not notify.
    adopt(data) { state = parse(data); write(); },
    // Forget everything on this device (sign out, delete account). Does not notify.
    clearLocal() { state = fresh(); try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } },
    // Progress only: the parent's voice settings and the child's name are kept.
    resetAll() { const { settings, character, meetDue } = state; state = { ...fresh(), settings, character, meetDue }; save(); },
  };
}
