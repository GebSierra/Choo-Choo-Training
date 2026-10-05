// Progress and settings in localStorage. Every access is guarded: a throwing or corrupt store starts fresh.
import { ORDER } from './order.js';
const KEY = 'reading.v1';

const fresh = () => ({
  schema: 1,
  order: ORDER, // the lesson order this state was saved under (js/order.js)
  lessons: {},
  checkpoints: {}, // bonus review games between lessons, by id: {result, completedAt, unlocked}
  settings: { voiceURI: null, rate: 0.9, autoSpeak: true, playSounds: false, sfx: true, sfxVolume: 0.6, fullInstructions: false, trainWorld: true, seenScripts: {} },
  character: { name: '' }, // the child's name, for the stories (js/screens/book.js)
  firstRunDone: false,
  lastOpened: null,
});

const cleanCharacter = (c) => ({ name: typeof c?.name === 'string' ? c.name.replace(/[^\p{L} '\-]/gu, '').trim().slice(0, 16) : '' });

// A saved setting of the wrong type (a rate that is "fast", say) falls back to its default; numbers are clamped.
export function cleanSettings(s, d) {
  const num = (v, lo, hi, dflt) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt);
  const out = { ...s, rate: num(s.rate, 0.7, 1.1, d.rate), sfxVolume: num(s.sfxVolume, 0, 1, d.sfxVolume) };
  for (const k of ['autoSpeak', 'playSounds', 'sfx', 'fullInstructions', 'trainWorld']) if (typeof s[k] !== 'boolean') out[k] = d[k];
  if (s.voiceURI !== null && typeof s.voiceURI !== 'string') out.voiceURI = d.voiceURI;
  if (!s.seenScripts || typeof s.seenScripts !== 'object' || Array.isArray(s.seenScripts)) out.seenScripts = {};
  return out;
}

export function createStore() {
  let migrated = false;
  let state = load();
  if (migrated) save();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const p = JSON.parse(raw);
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
      // Saved data from before checkpoints existed simply has none.
      const checkpoints = {};
      if (p.checkpoints && typeof p.checkpoints === 'object' && !Array.isArray(p.checkpoints)) {
        for (const [id, c] of Object.entries(reorder ? {} : p.checkpoints)) if (c && typeof c === 'object' && !Array.isArray(c)) checkpoints[id] = c;
      }
      return { ...f, ...p, order: ORDER, lessons, checkpoints, character: cleanCharacter(p.character), settings: cleanSettings({ ...f.settings, ...settings }, f.settings) };
    } catch { return fresh(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: stay in memory */ }
  }
  const lesson = (n) => state.lessons[n] || { tasksDone: [], result: null, completedAt: null };
  const checkpoint = (id) => state.checkpoints[id] || { result: null, completedAt: null };

  return {
    get state() { return state; },
    get settings() { return state.settings; },
    lesson,
    isUnlocked(n) {
      if (n === 1) return true;
      return lesson(n).unlocked === true || lesson(n - 1).result === 'got-it';
    },
    isDone: (n) => lesson(n).result === 'got-it',
    currentLesson(total) {
      for (let n = 1; n <= total; n++) if (this.isUnlocked(n) && lesson(n).result !== 'got-it') return n;
      return null;
    },
    markTask(n, i) {
      const l = { ...lesson(n) };
      if (!l.tasksDone.includes(i)) l.tasksDone = [...l.tasksDone, i];
      state.lessons[n] = l; save();
    },
    setResult(n, result) {
      const l = { ...lesson(n), result, completedAt: new Date().toISOString() };
      state.lessons[n] = l; save();
    },
    resetLessonTasks(n) {
      state.lessons[n] = { ...lesson(n), tasksDone: [] }; save();
    },
    unlock(n) { state.lessons[n] = { ...lesson(n), unlocked: true }; save(); },
    checkpoint,
    // A checkpoint opens once the lesson it follows is done, or when the parent unlocks it in Grownups.
    isCheckpointUnlocked(ck) { return checkpoint(ck.id).unlocked === true || this.isDone(ck.after); },
    isCheckpointDone: (id) => checkpoint(id).result === 'got-it',
    setCheckpointResult(id, result) { state.checkpoints[id] = { ...checkpoint(id), result, completedAt: new Date().toISOString() }; save(); },
    unlockCheckpoint(id) { state.checkpoints[id] = { ...checkpoint(id), unlocked: true }; save(); },
    character: () => state.character,
    setCharacter(patch) { state.character = cleanCharacter({ ...state.character, ...patch }); save(); },
    setSetting(k, v) { state.settings = { ...state.settings, [k]: v }; save(); },
    setFirstRunDone() { state.firstRunDone = true; save(); },
    touch() { state.lastOpened = new Date().toISOString(); save(); },
    // Progress only: the parent's voice settings and the child's name are kept.
    resetAll() { const { settings, character } = state; state = { ...fresh(), settings, character }; save(); },
  };
}
