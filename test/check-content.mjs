// Validates data/curriculum.json against the fixed teaching rules (PLAN.md 5.1).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const LETTER_NAMES = ['ay', 'bee', 'cee', 'see', 'dee', 'ee', 'ef', 'gee', 'aitch', 'eye', 'jay', 'kay', 'el', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double', 'ex', 'wye', 'zee'];
const nameRe = new RegExp(`\\b(${LETTER_NAMES.join('|')})\\b`, 'i');

export function checkCurriculum(c, root = ROOT) {
  const errors = [];
  const err = (m) => errors.push(m);

  // Collect every string with its path.
  const strings = [];
  (function walk(v, p) {
    if (typeof v === 'string') strings.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  })(c, '');

  // No letter names in any string that could be shown or spoken (paths and URLs are not spoken).
  for (const [p, s] of strings) {
    if (/(^|\.)(image|clip|playlistUrl)$/.test(p)) continue;
    const m = s.match(nameRe);
    if (m) err(`${p}: contains letter name "${m[0]}" in "${s}"`);
  }

  // No tts part is a single letter or a run of one repeated letter.
  const checkParts = (parts, p) => {
    (parts || []).forEach((part, i) => {
      if (part.tts !== undefined) {
        const t = part.tts.trim().toLowerCase().replace(/[^a-z]/g, '');
        if (t.length === 1 || (t.length > 1 && /^(.)\1+$/.test(t))) err(`${p}[${i}]: tts "${part.tts}" is an isolated sound and must be a clip`);
      } else if (part.clip !== undefined) {
        if (!c.sounds[part.clip]) err(`${p}[${i}]: unknown clip "${part.clip}"`);
      } else err(`${p}[${i}]: part needs tts or clip`);
    });
  };

  const sounds = c.sounds || {};
  for (const [k, s] of Object.entries(sounds)) {
    if (!s.clip) err(`sounds.${k}.clip missing`);
    if (s.glyph !== s.glyph.toLowerCase()) err(`sounds.${k}.glyph not lowercase`);
    if (s.sayItLike !== s.sayItLike.toLowerCase()) err(`sounds.${k}.sayItLike not lowercase`);
    (s.words || []).forEach((w, i) => {
      if (w.word !== w.word.toLowerCase()) err(`sounds.${k}.words[${i}].word not lowercase`);
      if (w.word === 'as') err(`sounds.${k}.words[${i}] is "as"`);
      if (w.image && !fs.existsSync(path.join(root, w.image))) err(`sounds.${k}.words[${i}].image missing on disk: ${w.image}`);
    });
  }

  const taught = new Set();
  (c.lessons || []).forEach((L, i) => {
    const lp = `lessons[${i}]`;
    if (L.number !== i + 1) err(`${lp}.number should be ${i + 1}`);
    if (!sounds[L.sound]) err(`${lp}.sound "${L.sound}" not in sounds`);
    const allowed = new Set([L.sound, ...(L.review || [])]);
    for (const r of L.review || []) if (!taught.has(r)) err(`${lp}.review "${r}" was not taught earlier`);
    checkParts(L.intro, `${lp}.intro`);
    (L.sayingWords || []).forEach((w, j) => {
      [w.word, ...w.parts].forEach((t) => { if (t !== t.toLowerCase()) err(`${lp}.sayingWords[${j}] not lowercase: ${t}`); });
    });
    (L.sayingSounds || []).forEach((w, j) => {
      const p = `${lp}.sayingSounds[${j}]`;
      if (w.word !== w.word.toLowerCase()) err(`${p}.word not lowercase`);
      if (w.word === 'as') err(`${p} is "as"`);
      if (w.showLetters) for (const ch of w.word) if (!allowed.has(ch)) err(`${p} "${w.word}" uses untaught letter "${ch}"`);
    });
    const q = L.quickCheck;
    if (q) {
      checkParts(q.prompt, `${lp}.quickCheck.prompt`);
      if (q.promptText !== q.promptText.toLowerCase().replace(/^./, (x) => x.toUpperCase()) && /[A-Z]/.test(q.promptText.slice(1))) err(`${lp}.quickCheck.promptText has stray capitals`);
      (q.options || []).forEach((o, j) => {
        for (const f of ['glyph', 'word']) if (o[f] && o[f] !== o[f].toLowerCase()) err(`${lp}.quickCheck.options[${j}].${f} not lowercase`);
        if (o.glyph && !sounds[o.glyph]) err(`${lp}.quickCheck.options[${j}].glyph "${o.glyph}" unknown`);
      });
      if ((q.options || []).filter((o) => o.correct).length !== 1) err(`${lp}.quickCheck needs exactly one correct option`);
    }
    taught.add(L.sound);
  });
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const file = process.argv[2] || path.join(ROOT, 'data/curriculum.json');
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = checkCurriculum(c);
  if (errors.length) { console.error(errors.map((e) => 'FAIL: ' + e).join('\n')); console.error(`check-content: ${errors.length} problem(s)`); process.exit(1); }
  console.log(`check-content: OK (${Object.keys(c.sounds).length} sounds, ${c.lessons.length} lessons, all rules pass)`);
}
