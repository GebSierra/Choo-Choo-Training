// Validates data/curriculum.json against the fixed teaching rules (PLAN.md 5.1).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const LETTER_NAMES = ['ay', 'bee', 'cee', 'see', 'dee', 'ee', 'ef', 'gee', 'aitch', 'eye', 'jay', 'kay', 'el', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double', 'ex', 'wye', 'zee'];
const nameRe = new RegExp(`\\b(${LETTER_NAMES.join('|')})\\b`, 'i');
// Text to speech must never get a single letter or a run of one letter ("m", "mmm").
export const isIsolated = (t) => { const z = t.trim().toLowerCase().replace(/[^a-z]/g, ''); return z.length === 1 || (z.length > 1 && /^(.)\1+$/.test(z)); };
// A capital is fine at the start of a sentence, nowhere else.
const strayCaps = (s) => /[A-Z]/.test(s.replace(/(^|[.!?]\s+)[A-Z]/g, '$1'));
const isYouTube = (u) => { try { return /^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(new URL(u).hostname); } catch { return false; } };

// Every string in the curriculum that text to speech may receive.
export function spokenStrings(c) {
  const out = [];
  for (const s of Object.values(c.sounds)) s.words.forEach((w) => out.push(w.word));
  for (const L of c.lessons) {
    for (const part of [...L.intro, ...L.introQuiet, ...L.quickCheck.prompt, ...L.quickCheck.promptQuiet]) if (part.tts !== undefined) out.push(part.tts);
    L.sayingWords.forEach((w) => out.push(w.word, ...w.parts));
    L.sayingSounds.forEach((w) => out.push(w.word));
  }
  for (const g of Object.values(c.games || {})) out.push(g.say);
  return out;
}

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

  // Quiet variants are spoken when the grown up says the sound: text only, never a clip.
  const checkQuiet = (parts, p) => {
    if (!Array.isArray(parts) || !parts.length) return err(`${p} missing`);
    checkParts(parts, p);
    parts.forEach((part, i) => { if (part.tts === undefined) err(`${p}[${i}]: a quiet variant may only contain tts parts`); });
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

  // The two games: one spoken line each, and distractor letters per taught sound.
  for (const kind of ['hunt', 'barn']) {
    const g = (c.games || {})[kind];
    const p = `games.${kind}`;
    if (!g) { err(`${p} missing`); continue; }
    if (typeof g.say !== 'string' || !g.say || isIsolated(g.say)) err(`${p}.say must be a sentence of words`);
    else if (strayCaps(g.say)) err(`${p}.say has a capital outside a sentence start`);
    for (const k of Object.keys(sounds)) {
      const d = (g.distractors || {})[k];
      if (!Array.isArray(d) || d.length < 3) { err(`${p}.distractors.${k} needs at least three letters`); continue; }
      if (new Set(d).size !== d.length) err(`${p}.distractors.${k} repeats a letter`);
      d.forEach((x) => { if (!/^[a-z]$/.test(x)) err(`${p}.distractors.${k} "${x}" must be one lowercase letter`); });
      if (d.includes(k)) err(`${p}.distractors.${k} contains its own target`);
    }
  }

  // Sound sack: each sound's start words, the shared pool of words that start with none of the taught sounds, and the checkpoints.
  const sackSay = ((c.games || {}).sack || {}).say;
  if (typeof sackSay !== 'string' || !sackSay || isIsolated(sackSay)) err('games.sack.say must be a sentence of words');
  else if (strayCaps(sackSay)) err('games.sack.say has a capital outside a sentence start');
  const wordOk = (w, p, letters) => {
    if (!w || typeof w.word !== 'string' || !/^[a-z]{2,}$/.test(w.word)) return err(`${p}.word must be a lowercase word`);
    if (!w.emoji && !w.image) err(`${p} needs a picture`);
    if (w.image && !fs.existsSync(path.join(root, w.image))) err(`${p}.image missing on disk: ${w.image}`);
    if (letters && !letters.includes(w.word[0])) err(`${p} "${w.word}" must begin with ${letters.join(' or ')}`);
  };
  for (const [k, s] of Object.entries(sounds)) (s.startWords || []).forEach((w, i) => { wordOk(w, `sounds.${k}.startWords[${i}]`); if (w.word[0] !== k) err(`sounds.${k}.startWords[${i}] "${w.word}" does not begin with ${k}`); });
  const pool = c.gameDistractors || [];
  if (pool.length < 6) err('gameDistractors needs at least six words');
  pool.forEach((w, i) => {
    wordOk(w, `gameDistractors[${i}]`);
    if (w.word && Object.keys(sounds).includes(w.word[0])) err(`gameDistractors[${i}] "${w.word}" begins with a taught sound`);
  });
  if (new Set(pool.map((w) => w.word)).size !== pool.length) err('gameDistractors repeats a word');
  const ids = new Set();
  (c.checkpoints || []).forEach((k, i) => {
    const p = `checkpoints[${i}]`;
    if (!k.id || ids.has(k.id)) err(`${p}.id must be unique`);
    ids.add(k.id);
    if (!k.title) err(`${p}.title missing`);
    if (!Number.isInteger(k.after) || k.after < 1 || k.after > (c.lessons || []).length) err(`${p}.after must be a lesson number`);
    if (!Number.isInteger(k.rounds) || k.rounds < 1) err(`${p}.rounds must be a positive integer`);
    if (!Array.isArray(k.sounds) || !k.sounds.length) return err(`${p}.sounds missing`);
    const need = Math.ceil(k.rounds / k.sounds.length);
    const taughtBy = new Set((c.lessons || []).slice(0, k.after).map((L) => L.sound));
    for (const s of k.sounds) {
      if (!sounds[s]) err(`${p}.sounds "${s}" is not a sound`);
      else if (!taughtBy.has(s)) err(`${p}.sounds "${s}" is not taught by lesson ${k.after}`);
      else if ((sounds[s].startWords || []).length < need) err(`${p}: sound "${s}" needs at least ${need} startWords`);
    }
  });

  const taught = new Set();
  (c.lessons || []).forEach((L, i) => {
    const lp = `lessons[${i}]`;
    if (L.number !== i + 1) err(`${lp}.number should be ${i + 1}`);
    if (!sounds[L.sound]) err(`${lp}.sound "${L.sound}" not in sounds`);
    const allowed = new Set([L.sound, ...(L.review || [])]);
    for (const r of L.review || []) if (!taught.has(r)) err(`${lp}.review "${r}" was not taught earlier`);
    for (const f of ['review', 'intro', 'sayingWords', 'sayingSounds']) if (!Array.isArray(L[f])) err(`${lp}.${f} missing`);
    checkParts(L.intro, `${lp}.intro`);
    checkQuiet(L.introQuiet, `${lp}.introQuiet`);
    if (JSON.stringify(L.introQuiet) !== JSON.stringify([{ tts: 'Today we learn a new letter. Your grown up will say its sound.' }])) err(`${lp}.introQuiet must be the agreed sentence`);
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
      checkQuiet(q.promptQuiet, `${lp}.quickCheck.promptQuiet`);
      const wantQuiet = q.kind === 'letter' ? 'Listen to your grown up. Then touch the letter.' : 'Listen to your grown up. Then touch the picture that starts the same.';
      if (JSON.stringify(q.promptQuiet) !== JSON.stringify([{ tts: wantQuiet }]) || q.promptTextQuiet !== wantQuiet) err(`${lp}.quickCheck.promptQuiet and promptTextQuiet must be "${wantQuiet}"`);
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
