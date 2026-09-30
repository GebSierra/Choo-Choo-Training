// Validates data/curriculum.json against the fixed teaching rules (PLAN.md 5.1).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const LETTER_NAMES = ['ay', 'bee', 'cee', 'see', 'dee', 'ee', 'ef', 'gee', 'aitch', 'eye', 'jay', 'kay', 'el', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double', 'ex', 'wye', 'zee'];
const nameRe = new RegExp(`\\b(${LETTER_NAMES.join('|')})\\b`, 'i');
// Text to speech must never get a single letter or a run of one letter ("m", "mmm").
const isIsolated = (t) => { const z = t.trim().toLowerCase().replace(/[^a-z]/g, ''); return z.length === 1 || (z.length > 1 && /^(.)\1+$/.test(z)); };
// A capital is fine at the start of a sentence, nowhere else.
const strayCaps = (s) => /[A-Z]/.test(s.replace(/(^|[.!?]\s+)[A-Z]/g, '$1'));
const isYouTube = (u) => { try { return /^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(new URL(u).hostname); } catch { return false; } };

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
    if (/(^|\.)(image|clip|playlistUrl|alphabetSongUrl)$/.test(p)) continue;
    const m = s.match(nameRe);
    if (m) err(`${p}: contains letter name "${m[0]}" in "${s}"`);
  }

  // No tts part is a single letter or a run of one repeated letter.
  const checkParts = (parts, p) => {
    (parts || []).forEach((part, i) => {
      if (part.tts !== undefined) {
        if (isIsolated(part.tts)) err(`${p}[${i}]: tts "${part.tts}" is an isolated sound and must be a clip`);
      } else if (part.clip !== undefined) {
        if (!c.sounds[part.clip]) err(`${p}[${i}]: unknown clip "${part.clip}"`);
      } else err(`${p}[${i}]: part needs tts or clip`);
    });
  };

  for (const k of ['playlistUrl', 'alphabetSongUrl']) if (!isYouTube(c[k] || '') || !/^https:\/\//.test(c[k])) err(`${k} must be an https YouTube URL`);
  const sounds = c.sounds || {};
  for (const [k, s] of Object.entries(sounds)) {
    if (!s.clip) err(`sounds.${k}.clip missing`);
    else if (!/\.(mp3|webm)$/.test(s.clip)) err(`sounds.${k}.clip must be .mp3 (a .webm next to it is tried second)`);
    if (s.glyph !== k) err(`sounds.${k}.glyph must equal its key`);
    if (s.glyph !== s.glyph.toLowerCase()) err(`sounds.${k}.glyph not lowercase`);
    if (s.sayItLike !== s.sayItLike.toLowerCase()) err(`sounds.${k}.sayItLike not lowercase`);
    for (const f of ['asIn', 'doNotSay']) if (s[f] && strayCaps(s[f])) err(`sounds.${k}.${f} has a capital letter`);
    if (strayCaps(s.howTo || '')) err(`sounds.${k}.howTo has a capital letter outside a sentence start`);
    if (!Array.isArray(s.words) || !s.words.length) err(`sounds.${k}.words missing`);
    (s.words || []).forEach((w, i) => {
      if (w.word !== w.word.toLowerCase()) err(`sounds.${k}.words[${i}].word not lowercase`);
      if (w.word === 'as') err(`sounds.${k}.words[${i}] is "as"`);
      if (isIsolated(w.word)) err(`sounds.${k}.words[${i}] "${w.word}" is an isolated sound and is spoken by tts`);
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
    for (const f of ['review', 'intro', 'sayingWords', 'sayingSounds']) if (!Array.isArray(L[f])) err(`${lp}.${f} missing`);
    checkParts(L.intro, `${lp}.intro`);
    (L.sayingWords || []).forEach((w, j) => {
      const p = `${lp}.sayingWords[${j}]`;
      if (!Array.isArray(w.parts) || w.parts.length !== 2) err(`${p}.parts needs exactly two parts`);
      if (!Array.isArray(w.emoji) || w.emoji.length !== 2) err(`${p}.emoji needs exactly two emoji`);
      [w.word, ...(w.parts || [])].forEach((t) => {
        if (t !== t.toLowerCase()) err(`${p} not lowercase: ${t}`);
        if (t === 'as') err(`${p} is "as"`);
        if (isIsolated(t)) err(`${p} "${t}" is an isolated sound and is spoken by tts`);
      });
    });
    (L.sayingSounds || []).forEach((w, j) => {
      const p = `${lp}.sayingSounds[${j}]`;
      if (w.word !== w.word.toLowerCase()) err(`${p}.word not lowercase`);
      if (w.word === 'as') err(`${p} is "as"`);
      if (isIsolated(w.word)) err(`${p} "${w.word}" is an isolated sound and is spoken by tts`);
      if (!w.showLetters && !w.emoji) err(`${p} needs an emoji when it does not show letters`);
      if (w.showLetters) for (const ch of w.word) if (!allowed.has(ch)) err(`${p} "${w.word}" uses untaught letter "${ch}"`);
    });
    const q = L.quickCheck;
    if (q) {
      checkParts(q.prompt, `${lp}.quickCheck.prompt`);
      if (q.promptText !== q.promptText.toLowerCase().replace(/^./, (x) => x.toUpperCase()) && /[A-Z]/.test(q.promptText.slice(1))) err(`${lp}.quickCheck.promptText has stray capitals`);
      (q.options || []).forEach((o, j) => {
        for (const f of ['glyph', 'word']) if (o[f] && o[f] !== o[f].toLowerCase()) err(`${lp}.quickCheck.options[${j}].${f} not lowercase`);
        if (o.word === 'as') err(`${lp}.quickCheck.options[${j}] is "as"`);
        if (o.word && isIsolated(o.word)) err(`${lp}.quickCheck.options[${j}] "${o.word}" is an isolated sound`);
        if (o.glyph && !sounds[o.glyph]) err(`${lp}.quickCheck.options[${j}].glyph "${o.glyph}" unknown`);
      });
      if (!Array.isArray(q.options) || !q.options.length) err(`${lp}.quickCheck.options missing`);
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
