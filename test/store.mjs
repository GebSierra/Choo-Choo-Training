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

// v1.9.12: the Train world and recorded sounds switches are gone; a saved "off" turns on once.
s = open({ ...old({ order: ORDER }), settings: { trainWorld: false, playSounds: false } });
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true && JSON.parse(mem.get('reading.v1')).settings.migrated1912 === true, 'migration: saved off becomes on and the flag is saved');
s = open({ ...old({ order: ORDER }), settings: { trainWorld: false, playSounds: false, migrated1912: true } });
check(s.settings.trainWorld === false && s.settings.playSounds === false, 'migration: with the flag set it never runs again (tests can seed the 2D map)');
s = open({ ...old({ order: ORDER }), settings: { playSounds: 'no', trainWorld: 0 } });
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true, 'migration: wrong types come out on');
mem.clear(); s = createStore();
check(s.settings.trainWorld === true && s.settings.playSounds === true && s.settings.migrated1912 === true, 'migration: a new install is on, flag set');

console.log(`store: ${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
