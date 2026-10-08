// The store's one-time reset for the v1.8.1 sound order. No browser. Run: node test/store.mjs
import { ORDER } from '../js/order.js';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { createStore } = await import('../js/store.js');
let n = 0, bad = 0;
const check = (ok, msg) => { n++; if (!ok) { bad++; console.error('FAIL: ' + msg); } };
const old = (extra = {}) => ({
  schema: 1, lastOpened: '2026-09-01T00:00:00Z',
  lessons: Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [i, { tasksDone: [0], result: 'got-it' }])),
  checkpoints: { r1: { result: 'got-it' } },
  settings: { rate: 1.0, trainAt: 5, trainIntroDone: true, seenScripts: { 'lesson:4': true, newLetter: true, 'tip:1:newLetter': true } },
  character: { name: 'Lily' }, firstRunDone: true, ...extra,
});
const open = (saved) => { mem.clear(); mem.set('reading.v1', JSON.stringify(saved)); return createStore(); };

let s = open(old());
check(Object.keys(s.state.lessons).length === 0 && Object.keys(s.state.checkpoints).length === 0, 'case 1: lessons and checkpoints cleared');
check(s.settings.rate === 1 && s.settings.trainIntroDone === true && s.settings.trainAt === undefined, 'case 1: settings kept, trainAt dropped');
check(s.settings.seenScripts.newLetter && s.settings.seenScripts['tip:1:newLetter'] && !('lesson:4' in s.settings.seenScripts), 'case 1: seenScripts lesson: keys dropped only');
check(s.character().name === 'Lily' && s.state.firstRunDone === true && s.currentLesson(13) === 1, 'case 1: name, welcome kept; starts at lesson 1');
check(JSON.parse(mem.get('reading.v1')).order === ORDER && ORDER === 'masitpnfdhgbl', 'case 1: migrated state saved with the order');

s = open(old({ order: ORDER }));
check(Object.keys(s.state.lessons).length === 6 && s.settings.trainAt === 5, 'case 2: same order keeps lessons');

const seed = old(); delete seed.lastOpened;
s = open(seed);
check(Object.keys(s.state.lessons).length === 6 && s.settings.trainAt === 5 && 'lesson:4' in s.settings.seenScripts, 'case 3: no lastOpened (test seed) keeps progress');

s = open(old({ order: ORDER }));
s.resetAll();
check(s.state.order === ORDER && JSON.parse(mem.get('reading.v1')).order === ORDER, 'case 4: resetAll keeps order');

// The character: bad values clean to the defaults; the creator is due for a fresh store and an old real save only.
s = open({ ...old({ order: ORDER }), character: { name: 'Lily', skin: 99, hair: '<b>', hairColor: -1, made: 'yes' } });
const c = s.character();
check(c.name === 'Lily' && c.skin === 2 && c.hair === 'short' && c.hairColor === 1 && c.made === false, 'character: bad values clean to 2, short, 1, false');
mem.clear(); s = createStore();
check(s.state.meetDue === true && s.character().made === false, 'meetDue: true for a fresh store');
s = open(old({ order: ORDER }));
check(s.state.meetDue === true, 'meetDue: true for an old real save without the field');
const seeded = old({ order: ORDER }); delete seeded.lastOpened;
s = open(seeded);
check(s.state.meetDue === false, 'meetDue: false for a test seed (no lastOpened)');
s = open(old({ order: ORDER }));
s.finishMeet({ skin: 4 });
check(s.character().skin === 4 && s.character().made === true && s.state.meetDue === false && JSON.parse(mem.get('reading.v1')).meetDue === false, 'finishMeet sets made, keeps the pick and clears meetDue');
s.resetAll();
check(s.state.meetDue === false && s.character().skin === 4, 'resetAll keeps the character and meetDue');

// Levels: a fresh store has none; bad values load as fresh; setLevels merges; resetAll clears them.
mem.clear(); s = createStore();
check(s.levels().seen === null && Object.keys(s.levels().earned).length === 0, 'levels: fresh store has seen null and nothing earned');
s.setLevels({ seen: 1, earned: { L1: '2026-10-01T10:00:00.000Z' } });
s.setLevels({ seen: 2, earned: { L2: '2026-10-02T10:00:00.000Z' } });
check(s.levels().seen === 2 && Object.keys(s.levels().earned).join() === 'L1,L2' && JSON.parse(mem.get('reading.v1')).levels.seen === 2, 'levels: setLevels merges earned and saves');
for (const bad of [{ seen: -1, earned: {} }, { seen: 1.5, earned: {} }, { seen: 'one', earned: {} }, { seen: 1, earned: [] }, { seen: 1, earned: { L1: 5 } }, 'x', [], { earned: {} }]) {
  s = open({ ...old({ order: ORDER }), levels: bad });
  check(s.levels().seen === null && Object.keys(s.levels().earned).length === 0, `levels: bad value ${JSON.stringify(bad)} loads as fresh`);
}
s = open({ ...old({ order: ORDER }), levels: { seen: 2, earned: { L1: '2026-10-01T10:00:00.000Z' } } });
check(s.levels().seen === 2 && typeof s.levels().earned.L1 === 'string', 'levels: good values load');
s = open({ ...old({ order: ORDER }) });
check(s.levels().seen === null, 'levels: saved data from before 1.9.4 has none');
s = open({ ...old({ order: ORDER }), levels: { seen: 2, earned: { L1: '2026-10-01T10:00:00.000Z' } } });
s.resetAll();
check(s.levels().seen === null && Object.keys(s.levels().earned).length === 0 && JSON.parse(mem.get('reading.v1')).levels.seen === null, 'levels: resetAll clears them');

// Worlds (1.9.14): state.worlds = { seen: id | null }; bad values load as fresh; setWorlds saves; resetAll clears it.
mem.clear(); s = createStore();
check(s.worlds().seen === null, 'worlds: a fresh store has seen null');
s.setWorlds({ seen: 'W1' });
check(s.worlds().seen === 'W1' && JSON.parse(mem.get('reading.v1')).worlds.seen === 'W1', 'worlds: setWorlds saves the world last seen');
for (const bad of [{ seen: 3 }, { seen: '' }, { seen: ['W1'] }, 'W1', [], null, {}]) {
  s = open({ ...old({ order: ORDER }), worlds: bad });
  check(s.worlds().seen === null, `worlds: bad value ${JSON.stringify(bad)} loads as fresh`);
}
s = open({ ...old({ order: ORDER }), worlds: { seen: 'W2' } });
check(s.worlds().seen === 'W2', 'worlds: a good value loads');
s = open({ ...old({ order: ORDER }) });
check(s.worlds().seen === null, 'worlds: saved data from before 1.9.14 has none (the first Home visit only records)');
s = open({ ...old({ order: ORDER }), worlds: { seen: 'W2' } });
s.resetAll();
check(s.worlds().seen === null && JSON.parse(mem.get('reading.v1')).worlds.seen === null, 'worlds: resetAll clears it');

// v1.9.12: the Train world and recorded sounds switches are gone; a saved "off" turns on once.
s = open({ ...old({ order: ORDER }), settings: { trainWorld: false, playSounds: false } });
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true && JSON.parse(mem.get('reading.v1')).settings.migrated1912 === true, 'migration: saved off becomes on and the flag is saved');
s = open({ ...old({ order: ORDER }), settings: { trainWorld: false, playSounds: false, migrated1912: true } });
check(s.settings.trainWorld === false && s.settings.playSounds === false, 'migration: with the flag set it never runs again (tests can seed the 2D map)');
s = open({ ...old({ order: ORDER }), settings: { playSounds: 'no', trainWorld: 0 } });
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true, 'migration: wrong types come out on');
mem.clear(); s = createStore();
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true, 'migration: a new install is on, flag set');

// Account sync seam (1.9.x accounts): savedAt, subscribe, isFresh, adopt, clearLocal. Old saves load with savedAt 0.
mem.clear(); s = createStore();
check(s.state.savedAt === 0 && s.isFresh(), 'sync: a fresh store has savedAt 0 and is fresh');
let heard = 0; const off = s.subscribe(() => { heard++; });
s.touch();
check(s.state.savedAt === 0 && heard === 0, 'sync: opening the app (touch) does not move savedAt or notify');
s.setResult(1, 'got-it');
check(s.state.savedAt > 0 && heard === 1 && JSON.parse(mem.get('reading.v1')).savedAt === s.state.savedAt && !s.isFresh(), 'sync: a real change sets savedAt, notifies and is saved');
off(); s.setSetting('rate', 1); check(heard === 1, 'sync: unsubscribe stops notifications');
const cloud = { schema: 1, lessons: { 2: { tasksDone: [1], result: 'got-it' } }, settings: {}, firstRunDone: true, savedAt: 12345 };
s.adopt(cloud);
check(s.state.savedAt === 12345 && s.isDone(2) && JSON.parse(mem.get('reading.v1')).savedAt === 12345 && heard === 1, 'sync: adopt takes the other copy, keeps its savedAt, saves, does not notify');
s.adopt({ junk: true });
check(s.isFresh() && s.state.savedAt === 0, 'sync: adopting garbage gives a fresh state');
s.setResult(1, 'got-it'); s.clearLocal();
check(s.isFresh() && !mem.has('reading.v1'), 'sync: clearLocal forgets everything on the device');
s = open(old({ order: ORDER }));
check(s.state.savedAt === 0 && !s.isFresh(), 'sync: an older save loads with savedAt 0 and is not fresh');
mem.set('reading.auth', '{"x":1}'); s.resetAll();
check(mem.get('reading.auth') === '{"x":1}', 'sync: the account session key is never touched by the store');

// Phone voice: speaking on a screen open is off for new installs; an old save turns off once (speak0); a later choice stays.
s = open(old({ order: ORDER, settings: { autoSpeak: true, rate: 1 } }));
check(s.settings.autoSpeak === false && s.settings.speak0 === true && JSON.parse(mem.get('reading.v1')).settings.autoSpeak === false, 'speak0: an old save with auto-speak on is turned off once and saved');
s.setSetting('autoSpeak', true);
s = open(JSON.parse(mem.get('reading.v1')));
check(s.settings.autoSpeak === true && s.settings.speak0 === true, 'speak0: a grown-up who switched it back on keeps it on after a reload');
s = open(old({ order: ORDER, settings: { autoSpeak: false } }));
check(s.settings.autoSpeak === false && s.settings.speak0 === true, 'speak0: an old save with it off stays off');
mem.clear(); s = createStore();
check(s.settings.autoSpeak === false && s.settings.speak0 === true, 'speak0: a new install starts with auto-speak off');

// pickVoice: the best en-US voice by quality; the saved choice wins; robotic ones only as a last resort.
const { pickVoice } = await import('../js/speech.js');
const V = (name, lang = 'en-US', voiceURI = name) => ({ name, lang, voiceURI });
const nm = (v) => v && v.name;
check(nm(pickVoice([V('Microsoft David'), V('Google US English'), V('Microsoft Aria Online (Natural)')])) === 'Microsoft Aria Online (Natural)', 'voice: Natural/Online beats Google and Microsoft');
check(nm(pickVoice([V('Samantha'), V('Alex Enhanced'), V('Google US English')])) === 'Alex Enhanced', 'voice: Enhanced beats Google and plain');
check(nm(pickVoice([V('Siri Voice 2'), V('Google US English')])) === 'Siri Voice 2', 'voice: Siri beats Google');
check(nm(pickVoice([V('Neural Jenny'), V('Premium Zoe')])) === 'Neural Jenny', 'voice: ties keep the first');
check(nm(pickVoice([V('Microsoft Zira'), V('Google US English'), V('Fred')])) === 'Google US English', 'voice: Google beats Microsoft and plain');
check(nm(pickVoice([V('Fred'), V('Microsoft Zira')])) === 'Microsoft Zira', 'voice: Microsoft beats a plain voice');
check(nm(pickVoice([V('eSpeak English'), V('Fred')])) === 'Fred', 'voice: eSpeak is never chosen over another voice');
check(nm(pickVoice([V('English compact'), V('Fred')])) === 'Fred', 'voice: "compact" is never chosen over another voice');
check(nm(pickVoice([V('eSpeak English'), V('English compact')])) === 'eSpeak English', 'voice: only robotic voices left, one is still picked');
check(nm(pickVoice([V('Google UK English', 'en-GB'), V('Natural Brian', 'en-GB'), V('Google US English')])) === 'Google US English', 'voice: only en-US voices are considered');
check(nm(pickVoice([V('Google UK English', 'en_US')])) === 'Google UK English', 'voice: en_US spelling counts as en-US');
check(nm(pickVoice([V('eSpeak English'), V('Google US English')], 'eSpeak English')) === 'eSpeak English', 'voice: the grown-up\'s saved choice is kept, even a plain one');
check(nm(pickVoice([V('Fred'), V('Google US English')], 'gone')) === 'Google US English', 'voice: a saved choice that is gone falls back to the ranking');
check(pickVoice([]) === null && pickVoice(null) === null && pickVoice([V('Google UK English', 'en-GB')]) === null, 'voice: nothing usable gives null');

console.log(`store: ${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
