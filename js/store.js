// Progress and settings in localStorage. Every access is guarded: a throwing or corrupt store starts fresh.
const KEY = 'reading.v1';

const fresh = () => ({
  schema: 1,
  lessons: {},
  settings: { voiceURI: null, rate: 0.9, autoSpeak: true },
  firstRunDone: false,
  lastOpened: null,
});

export function createStore() {
  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const p = JSON.parse(raw);
      if (!p || p.schema !== 1 || !p.lessons || typeof p.lessons !== 'object' || Array.isArray(p.lessons)) return fresh();
      const f = fresh();
      const lessons = {};
      for (const [n, l] of Object.entries(p.lessons)) {
        if (l && typeof l === 'object' && !Array.isArray(l)) lessons[n] = { ...l, tasksDone: Array.isArray(l.tasksDone) ? l.tasksDone.filter(Number.isInteger) : [] };
      }
      const settings = p.settings && typeof p.settings === 'object' && !Array.isArray(p.settings) ? p.settings : {};
      return { ...f, ...p, lessons, settings: { ...f.settings, ...settings } };
    } catch { return fresh(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: stay in memory */ }
    listeners.forEach((fn) => fn(state));
  }
  const lesson = (n) => state.lessons[n] || { tasksDone: [], result: null, completedAt: null };

  return {
    get state() { return state; },
    get settings() { return state.settings; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
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
    setSetting(k, v) { state.settings = { ...state.settings, [k]: v }; save(); },
    setFirstRunDone() { state.firstRunDone = true; save(); },
    touch() { state.lastOpened = new Date().toISOString(); save(); },
    // Progress only: the parent's voice settings are kept.
    resetAll() { const settings = state.settings; state = { ...fresh(), settings }; save(); },
  };
}
