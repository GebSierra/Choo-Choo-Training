// Validates data/curriculum.json against the fixed teaching rules (PLAN.md 5.1).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { scriptToParts, slowSounds, firstSoundOut } from '../js/scripts.js';
import { GLYPHS } from '../js/glyphs.js';
import { ACCENT } from '../js/theme.js';
import { ORDER } from '../js/order.js';
import { sackPool, roundCaps, practiceRounds, rideWords } from '../js/lessons.js';

export const LETTER_NAMES = ['ay', 'bee', 'cee', 'see', 'dee', 'ee', 'ef', 'gee', 'aitch', 'eye', 'jay', 'kay', 'el', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double', 'ex', 'wye', 'zee'];
// Words where s says z, which a child must not learn as an s word.
export const S_SAYS_Z = ['as', 'is', 'his', 'has', 'was', 'does', 'goes', 'hers', 'ours', 'yours'];
// Letters that look like each other, so they never stand together in a game or a Quick Check (mirror and look-alike pairs).
import { LOOKALIKE, boardWords } from '../js/games-data.js';
export const LOOKALIKE_PAIRS = LOOKALIKE;
export const lookAlike = (x, y) => LOOKALIKE_PAIRS.some((p) => (p[0] === x && p[1] === y) || (p[0] === y && p[1] === x));
// Contrast of a colour on white (WCAG), so a glyph in its accent stays visible.
export const contrastOnWhite = (hex) => {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 1.05 / (0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2] + 0.05);
};
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

// Width and height of a WebP file from its header (lossy, lossless or extended), or null if it is not a WebP.
export function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') return { w: 1 + (((b[22] & 0x3f) << 8) | b[21]), h: 1 + (((b[24] & 0xf) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
  if (kind === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  return null;
}

export function checkCurriculum(c, root = ROOT) {
  const errors = [];
  const err = (m) => errors.push(m);
  if ((c.lessons || []).map((L) => L.sound).join('') !== ORDER) err('lessons must teach m a s i t p n f d h g b l in order (js/order.js)');

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

  // A clipped sound (t d g p h b l ...) is short: never written stretched ("ttt") anywhere in the data.
  const clippedLetters = Object.values(c.sounds || {}).filter((x) => x.hold === false).map((x) => x.glyph);
  for (const [p, s] of strings) {
    if (/(^|\.)(image|clip|playlistUrl|alphabetSongUrl)$/.test(p)) continue;
    for (const k of clippedLetters) if (new RegExp(`${k}{3,}`, 'i').test(s)) err(`${p}: "${s}" stretches the clipped sound ${k}-`);
  }
  // The parent's words for the sound: "a as in apple", "i as in igloo", never a bare letter.
  for (const [k, sd] of Object.entries(c.sounds || {})) {
    if (sd.asIn && !new RegExp(`\\b${k} as in ${sd.asIn}`).test(`${sd.sayItLike} as in ${sd.asIn}`)) err(`sounds.${k}: sayItLike and asIn must read "${k} as in ${sd.asIn}"`);
    if ('ai'.includes(k) && !new RegExp(`\\b${k} as in ${sd.asIn}`).test(sd.howTo)) err(`sounds.${k}.howTo must say "${k} as in ${sd.asIn}", never a bare letter`);
    if (sd.hold === false && sd.sayItLike !== `${k}-`) err(`sounds.${k}: a clipped sound is written "${k}-"`);
    if (sd.hold === true && !/^(.)\1\1$/.test(sd.sayItLike) && !sd.asIn) err(`sounds.${k}: a held sound is written as a run like "fff"`);
    for (const w of [...(sd.words || []), ...(sd.startWords || [])]) if (S_SAYS_Z.includes(w.word)) err(`sounds.${k}: "${w.word}" is a word where s says z`);
  }

  // Every picture tile exists and stays small enough to precache (under 70 KB).
  for (const [p, s] of strings) {
    if (!/(^|\.)image$/.test(p)) continue;
    const f = path.join(root, s);
    if (!fs.existsSync(f)) err(`${p}: picture missing on disk: ${s}`);
    else {
      if (fs.statSync(f).size > 70 * 1024) err(`${p}: picture is over 70 KB: ${s}`);
      if (!s.endsWith('.webp')) err(`${p}: picture must be a .webp: ${s}`);
      else { const d = webpSize(f); if (!d || d.w < 64 || d.h < 64 || d.w > 512 || d.h > 512) err(`${p}: picture size ${d ? d.w + 'x' + d.h : 'unreadable'} is outside 64 to 512 px: ${s}`); }
    }
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
    // A recorded clip is optional (the grown up says the sounds); a sound without one has clip: null.
    if (s.clip !== null && !/\.(mp3|webm)$/.test(s.clip || '')) err(`sounds.${k}.clip must be .mp3 (a .webm next to it is tried second) or null`);
    if (typeof s.hold !== 'boolean') err(`sounds.${k}.hold must be true or false`);
    if (!GLYPHS[k]) err(`sounds.${k}: no glyph of ours for this taught letter`);
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
      if (d.length < 6) err(`${p}.distractors.${k} needs at least six letters (Letter Hunt re-deals with six distractors even in a short landscape)`);
      d.forEach((x) => { if (lookAlike(x, k)) err(`${p}.distractors.${k} "${x}" looks like the target`); });
      if (new Set(d).size !== d.length) err(`${p}.distractors.${k} repeats a letter`);
      d.forEach((x) => { if (!/^[a-z]$/.test(x)) err(`${p}.distractors.${k} "${x}" must be one lowercase letter`); });
      if (d.includes(k)) err(`${p}.distractors.${k} contains its own target`);
    }
  }

  // Station Board words: 3 or 4 per lesson, taught letters only, each target once in its word, no word twice.
  for (const L of c.lessons || []) {
    if (!L.board) continue;
    const taught = c.lessons.slice(0, L.number).map((x) => x.sound), seenW = new Set();
    if (!Array.isArray(L.board) || L.board.length < 3 || L.board.length > 4) err(`lesson ${L.number}.board needs 3 or 4 entries`);
    for (const b of L.board) {
      const where = `lesson ${L.number}.board ${b.word}`;
      if (typeof b.word !== 'string' || b.word.length < 2 || b.word.length > 4) err(`${where}: a word of 2 to 4 letters`);
      else if (![...b.word].every((ch) => taught.includes(ch))) err(`${where}: a letter is not taught by lesson ${L.number}`);
      else if (S_SAYS_Z.includes(b.word)) err(`${where}: s says z`);
      if (!taught.includes(b.target) || !b.word.includes(b.target) || b.word.split(b.target).length !== 2) err(`${where}: target ${b.target} must be taught and appear exactly once`);
      if (seenW.has(b.word)) err(`lesson ${L.number}.board repeats ${b.word}`);
      seenW.add(b.word);
    }
  }
  // The tap games (Green Light, Wagon Parade, Station Board): one spoken line each, no distractors needed.
  for (const kind of ['signals', 'wagons', 'board']) {
    const g = (c.games || {})[kind];
    if (!g) { if (kind === 'signals') err('games.signals missing'); continue; }
    if (typeof g.say !== 'string' || !g.say || isIsolated(g.say)) err(`games.${kind}.say must be a sentence of words`);
    else if (strayCaps(g.say)) err(`games.${kind}.say has a capital outside a sentence start`);
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
  // Practicing Words: every sound has a non-empty list of its own start words, and every lesson gets three different rounds.
  for (const [k, s] of Object.entries(sounds)) {
    if (!Array.isArray(s.practice) || !s.practice.length) { err(`sounds.${k}.practice must be a non-empty list`); continue; }
    s.practice.forEach((w) => { if (!(s.startWords || []).some((x) => x.word === w)) err(`sounds.${k}.practice "${w}" is not one of its startWords`); if (w[0] !== k) err(`sounds.${k}.practice "${w}" does not begin with ${k}`); });
  }
  for (const L of c.lessons || []) {
    const r = practiceRounds(c, L);
    if (r.length !== 3 || new Set(r.map((x) => x.word)).size !== 3) err(`lesson ${L.number}: Practicing Words needs three different rounds (${r.map((x) => x.word).join(', ')})`);
  }
  const pool = c.gameDistractors || [];
  if (pool.length < 6) err('gameDistractors needs at least six words');
  pool.forEach((w, i) => {
    wordOk(w, `gameDistractors[${i}]`);
    for (const a of w.avoid || []) if (!sounds[a]) err(`gameDistractors[${i}].avoid "${a}" is not a sound`);
  });
  if (new Set(pool.map((w) => w.word)).size !== pool.length) err('gameDistractors repeats a word');
  // Pictures that read as something else are not used anywhere: a paint can (red), a knife in the jam picture, a broom (mop), a duck (goose).
  const everyWord = [...Object.values(sounds).flatMap((s) => [...s.words, ...(s.startWords || [])]), ...pool, ...(c.lessons || []).flatMap((L) => [...L.sayingSounds, ...(L.quickCheck ? L.quickCheck.options : [])])].map((w) => w.word);
  for (const bad of ['red', 'jam', 'mop', 'goose']) if (everyWord.includes(bad)) err(`"${bad}" has a misleading picture and must not be used`);
  // Look-alikes: n-words never show in an m round, egg never in an a round.
  for (const w of pool) {
    if (w.word[0] === 'n' && !(w.avoid || []).includes('m')) err(`gameDistractors "${w.word}" looks like an m word and must avoid "m"`);
    if (w.word === 'egg' && !(w.avoid || []).includes('a')) err('gameDistractors "egg" must avoid "a"');
  }
  // A book stop: data/books/<book>.json. Every word the child reads uses only letters taught by then (or a listed sight word).
  const bookChecks = (k, p) => {
    let book;
    try { book = JSON.parse(fs.readFileSync(path.join(root, 'data/books', `${k.book}.json`), 'utf8')); } catch (e) { return err(`${p}: data/books/${k.book}.json unreadable (${e.message})`); }
    if (book.id !== k.book) err(`${p}: book id "${book.id}" must be "${k.book}"`);
    if (!k.title) err(`${p}.title missing`);
    if (!Array.isArray(k.needs) || !k.needs.length) return err(`${p}.needs missing`);
    const first = (c.lessons || []).findIndex((_, n) => k.needs.every((s) => (c.lessons || []).slice(0, n + 1).some((L) => L.sound === s)));
    if (k.after !== first + 1) err(`${p}.after is ${k.after} but every needed sound is taught by lesson ${first + 1}`);
    if (JSON.stringify(book.needs) !== JSON.stringify(k.needs)) err(`${p}: the book's needs differ from the stop's`);
    const sight = (book.sight || []).map((w) => w.toLowerCase());
    const readable = (text, where) => {
      for (const tok of text.split(' ').map((t) => t.replace(/[^\p{L}]/gu, '').toLowerCase()).filter(Boolean)) {
        if (!sight.includes(tok) && ![...tok].every((ch) => k.needs.includes(ch))) err(`${p} ${where}: "${tok}" uses a letter that is not taught yet and is not a sight word`);
      }
    };
    const pages = book.pages || [];
    pages.forEach((pg, n) => {
      const w = `page ${n + 1}`;
      const kind = pg.kind || 'page';
      if (!['page', 'drag', 'review'].includes(kind)) err(`${p} ${w}: kind "${kind}" must be page, drag or review`);
      for (const f of ['child', 'slider']) if (pg[f] !== undefined) { if (/\{name\}/.test(pg[f])) err(`${p} ${w}.${f} must not contain {name}`); readable(pg[f], `${w}.${f}`); }
      if (pg.slider !== undefined && !String(pg.child || '').split(' ').includes(pg.slider)) err(`${p} ${w}: slider "${pg.slider}" is not in child`);
      for (const word of pg.words || []) { if (/\{name\}/.test(word)) err(`${p} ${w}.words must not contain {name}`); readable(word, `${w}.words`); }
      if (pg.sound !== undefined) {
        const m = /^([a-z])\1{2,}$/.exec(pg.sound);
        if (!m) err(`${p} ${w}.sound "${pg.sound}" must be one letter repeated three or more times`);
        else if (!k.needs.includes(m[1]) || !(sounds[m[1]] && sounds[m[1]].hold === true)) err(`${p} ${w}.sound "${pg.sound}" must be a held sound the book needs`);
      }
      if (pg.tap && !['toot', 'wave', 'giggle', 'bounce', 'walk'].includes(pg.tap.anim)) err(`${p} ${w}.tap.anim "${pg.tap.anim}" is not one of the five`);
      if (pg.tap && !['train', 'friend', 'emoji', 'pip'].includes(pg.tap.on)) err(`${p} ${w}.tap.on "${pg.tap.on}" is not train, friend, emoji or pip`);
      if (kind === 'review' && !(pg.words || []).length) err(`${p} ${w}: a review page needs words`);
    });
    if (!pages.length || (pages[pages.length - 1].kind || 'page') !== 'review') err(`${p}: the last page must be a review`);
  };

  // A ride stop (Smooth Ride): its words are spelt with taught sounds only, held except the last, and none says z; the timings sit in sensible ranges.
  const rideChecks = (k, p) => {
    if (!k.title) err(`${p}.title missing`);
    if (!Number.isInteger(k.after) || k.after < 1 || k.after > (c.lessons || []).length) err(`${p}.after must be a lesson number`);
    if (!Number.isInteger(k.rounds) || k.rounds < 1) err(`${p}.rounds must be a positive integer`);
    const chosen = rideWords(c, k);
    if (chosen.length !== k.rounds) err(`${p}: ${chosen.length} usable words for ${k.rounds} rounds (rideWords)`);
    const taught = (c.lessons || []).slice(0, k.after).map((L) => L.sound);
    for (const w of chosen) {
      if (![...w].every((ch) => taught.includes(ch))) err(`${p}: "${w}" uses a sound not taught by lesson ${k.after}`);
      if (![...w].slice(0, -1).every((ch) => sounds[ch] && sounds[ch].hold === true)) err(`${p}: "${w}" has a clipped sound before its last letter`);
      if (S_SAYS_Z.includes(w)) err(`${p}: "${w}" is an s-says-z word`);
    }
    if (!(k.offHoldMs >= 20 && k.offHoldMs <= 80)) err(`${p}.offHoldMs must be between 20 and 80`);
    if (!(k.gapMs >= 60 && k.gapMs <= 200)) err(`${p}.gapMs must be between 60 and 200`);
    for (const f of ['onHoldMs', 'minRunMs', 'endMs']) if (!(k[f] > 0)) err(`${p}.${f} must be a positive number`);
    if (!c.games || !c.games.ride || !c.games.ride.say) err('games.ride.say missing');
  };

  const ids = new Set();
  (c.checkpoints || []).forEach((k, i) => {
    const p = `checkpoints[${i}]`;
    if (!k.id || ids.has(k.id)) err(`${p}.id must be unique`);
    if (!/^[\w-]+$/.test(k.id || '')) err(`${p}.id "${k.id}" must match the route pattern [\\w-]+`);
    ids.add(k.id);
    if (k.kind === 'book') return bookChecks(k, p);
    if (k.kind === 'ride') return rideChecks(k, p);
    if (k.kind) return;
    if (!k.title) err(`${p}.title missing`);
    if (!Number.isInteger(k.after) || k.after < 1 || k.after > (c.lessons || []).length) err(`${p}.after must be a lesson number`);
    if (!Number.isInteger(k.rounds) || k.rounds < 1) err(`${p}.rounds must be a positive integer`);
    if (!Array.isArray(k.sounds) || !k.sounds.length) return err(`${p}.sounds missing`);
    const taughtBy = new Set((c.lessons || []).slice(0, k.after).map((L) => L.sound));
    for (const s of k.sounds) {
      if (!sounds[s]) err(`${p}.sounds "${s}" is not a sound`);
      else if (!taughtBy.has(s)) err(`${p}.sounds "${s}" is not taught by lesson ${k.after}`);
    }
    // After lesson k.after every taught sound is in the checkpoint (a checkpoint reviews them all), and no round repeats a start word.
    if (k.sounds.length !== taughtBy.size) err(`${p}.sounds must list every sound taught by lesson ${k.after}`);
    for (const f of k.favour || []) if (!k.sounds.includes(f)) err(`${p}.favour "${f}" is not one of its sounds`);
    const caps = roundCaps(c, k);
    const room = Object.values(caps).reduce((x, y) => x + y, 0);
    if (room < k.rounds) err(`${p}: ${k.rounds} rounds but only ${room} start words in all`);
    for (const s of k.sounds) if (sounds[s] && !(sounds[s].startWords || []).length) err(`${p}: sound "${s}" has no startWords`);
    // The wrong cards: words that begin with none of the checkpoint's sounds; at least 12, and at least two for every sound's round.
    const wrong = sackPool(c, k);
    if (wrong.length < 12) err(`${p}: only ${wrong.length} wrong cards for the sack, needs at least 12`);
    for (const s of k.sounds) if (wrong.filter((w) => !(w.avoid || []).includes(s)).length < 2) err(`${p}: fewer than two wrong cards for sound "${s}"`);
    for (const w of wrong) { if (k.sounds.includes(w.word[0])) err(`${p}: wrong card "${w.word}" begins with a taught sound`); if (k.sounds.includes('s') && w.word.startsWith('sh')) err(`${p}: wrong card "${w.word}" is an sh word`); if ((k.sounds.includes('t') || k.sounds.includes('s')) && w.word.startsWith('th')) err(`${p}: wrong card "${w.word}" is a th word`); }
  });

  const taught = new Set();
  const seenCompounds = new Set();
  const clipped = Object.values(sounds).filter((x) => x.hold === false).map((x) => x.glyph);
  const taughtLetters = (L) => (c.lessons || []).slice(0, L.number).map((x) => x.sound);
  let css = '';
  try { css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8'); } catch { /* no stylesheet next to a test copy */ }
  (c.lessons || []).forEach((L, i) => {
    const lp = `lessons[${i}]`;
    if (L.number !== i + 1) err(`${lp}.number should be ${i + 1}`);
    if (!sounds[L.sound]) err(`${lp}.sound "${L.sound}" not in sounds`);
    const allowed = new Set([...taught, L.sound]); // every letter taught so far, this lesson's included
    for (const r of L.review || []) if (!taught.has(r)) err(`${lp}.review "${r}" was not taught earlier`);
    for (const f of ['review', 'intro', 'sayingWords', 'sayingSounds']) if (!Array.isArray(L[f])) err(`${lp}.${f} missing`);
    checkParts(L.intro, `${lp}.intro`);
    checkQuiet(L.introQuiet, `${lp}.introQuiet`);
    if (JSON.stringify(L.introQuiet) !== JSON.stringify([{ tts: 'Today we learn a new letter. Your grown up will say its sound.' }])) err(`${lp}.introQuiet must be the agreed sentence`);
    (L.sayingWords || []).forEach((w, j) => {
      const p = `${lp}.sayingWords[${j}]`;
      if (!Array.isArray(w.parts) || w.parts.length !== 2) err(`${p}.parts needs exactly two parts`);
      if (!Array.isArray(w.emoji) || w.emoji.length !== 2) err(`${p}.emoji needs exactly two emoji`);
      if (Array.isArray(w.parts) && w.parts.join('') !== w.word) err(`${p}: the parts (${(w.parts || []).join(' + ')}) do not make "${w.word}"`);
      if (Array.isArray(w.emoji) && w.emoji[0] === w.emoji[1]) err(`${p}: both parts have the same emoji`);
      if (seenCompounds.has(w.word)) err(`${p}: "${w.word}" is already a Saying Words word in another lesson`);
      seenCompounds.add(w.word);
      [w.word, ...(w.parts || [])].forEach((t) => {
        if (t !== t.toLowerCase()) err(`${p} not lowercase: ${t}`);
        if (S_SAYS_Z.includes(t)) err(`${p} "${t}" is a word where s says z`);
        if (t === 'as') err(`${p} is "as"`);
        if (isIsolated(t)) err(`${p} "${t}" is an isolated sound and is spoken by tts`);
      });
    });
    (L.sayingSounds || []).forEach((w, j) => {
      const p = `${lp}.sayingSounds[${j}]`;
      if (w.word !== w.word.toLowerCase()) err(`${p}.word not lowercase`);
      if (w.word === 'as' || S_SAYS_Z.includes(w.word)) err(`${p} "${w.word}" is a word where s says z`);
      if (isIsolated(w.word)) err(`${p} "${w.word}" is an isolated sound and is spoken by tts`);
      if (!w.showLetters && !w.emoji && !w.image) err(`${p} needs a picture when it does not show letters`);
      if (w.showLetters) for (const ch of w.word) if (!allowed.has(ch)) err(`${p} "${w.word}" uses untaught letter "${ch}"`);
    });
    if (L.number >= 4) {
      const letterWords = (L.sayingSounds || []).filter((w) => w.showLetters), pictureWords = (L.sayingSounds || []).filter((w) => !w.showLetters);
      if (letterWords.length !== 3) err(`${lp}.sayingSounds needs three words that show letters`);
      if (!letterWords.some((w) => w.word.includes(L.sound))) err(`${lp}.sayingSounds: at least one letter word must contain "${L.sound}"`);
      if (pictureWords.length < 1) err(`${lp}.sayingSounds needs a picture word from the sound's tiles`);
      for (const w of pictureWords) if (!(sounds[L.sound] ? sounds[L.sound].words : []).some((x) => x.word === w.word && x.image === w.image)) err(`${lp}.sayingSounds picture word "${w.word}" is not one of the sound's tiles`);
      if ((L.sayingWords || []).length !== 4) err(`${lp}.sayingWords needs four compound words`);
      for (const w of sounds[L.sound] ? sounds[L.sound].words : []) if ('aeiou'.includes(L.sound) ? !w.word.includes(L.sound) : w.word[0] !== L.sound) err(`sounds.${L.sound}.words "${w.word}" must ${'aeiou'.includes(L.sound) ? 'contain' : 'begin with'} the sound`);
      for (const w of L.sayingSounds || []) { // held sounds may be stretched, clipped ones never
        const lines = [slowSounds(w.word, sounds), firstSoundOut(w.word, sounds)];
        for (const t of lines) for (const k of clipped) if (t.includes(k.repeat(3))) err(`${lp}.sayingSounds "${w.word}": the parent script would stretch the clipped sound ${k}- ("${t}")`);
      }
      if (!ACCENT[L.sound]) err(`theme.js has no accent for "${L.sound}"`);
      else if (contrastOnWhite(ACCENT[L.sound]) < 3) err(`accent ${ACCENT[L.sound]} of "${L.sound}" is only ${contrastOnWhite(ACCENT[L.sound]).toFixed(2)}:1 on white (needs 3:1)`);
      if (css && !new RegExp(`--${L.sound}:\\s*${(ACCENT[L.sound] || '').toLowerCase()}\\b`, 'i').test(css)) err(`css/app.css --${L.sound} does not match the accent in theme.js`);
      if (L.quickCheck && L.quickCheck.kind !== (L.number % 2 === 0 ? 'letter' : 'picture')) err(`${lp}.quickCheck.kind should be ${L.number % 2 === 0 ? 'letter' : 'picture'} (even lessons letter, odd lessons picture)`);
      if (L.quickCheck && L.quickCheck.options.length < 3) err(`${lp}.quickCheck needs three options`);
    }
    const q = L.quickCheck;
    if (q) {
      checkParts(q.prompt, `${lp}.quickCheck.prompt`);
      checkQuiet(q.promptQuiet, `${lp}.quickCheck.promptQuiet`);
      const wantQuiet = q.kind === 'letter' ? 'Listen to your grown up. Then touch the letter.' : 'Listen. Touch the one that starts the same.';
      if (JSON.stringify(q.promptQuiet) !== JSON.stringify([{ tts: wantQuiet }]) || q.promptTextQuiet !== wantQuiet) err(`${lp}.quickCheck.promptQuiet and promptTextQuiet must be "${wantQuiet}"`);
      if (q.promptText !== q.promptText.toLowerCase().replace(/^./, (x) => x.toUpperCase()) && /[A-Z]/.test(q.promptText.slice(1))) err(`${lp}.quickCheck.promptText has stray capitals`);
      (q.options || []).forEach((o, j) => {
        for (const f of ['glyph', 'word']) if (o[f] && o[f] !== o[f].toLowerCase()) err(`${lp}.quickCheck.options[${j}].${f} not lowercase`);
        if (o.word === 'as' || S_SAYS_Z.includes(o.word)) err(`${lp}.quickCheck.options[${j}] is a word where s says z`);
        if (o.glyph && !o.correct && lookAlike(o.glyph, L.sound)) err(`${lp}.quickCheck.options[${j}] "${o.glyph}" looks like the target "${L.sound}"`);
        if (q.kind === 'picture' && !o.correct && o.word && taughtLetters(L).includes(o.word[0])) err(`${lp}.quickCheck.options[${j}] "${o.word}" begins with a letter taught by lesson ${L.number}`);
        if (o.word && isIsolated(o.word)) err(`${lp}.quickCheck.options[${j}] "${o.word}" is an isolated sound`);
        if (o.glyph && !sounds[o.glyph]) err(`${lp}.quickCheck.options[${j}].glyph "${o.glyph}" unknown`);
        else if (o.glyph && !allowed.has(o.glyph)) err(`${lp}.quickCheck.options[${j}].glyph "${o.glyph}" has not been taught by lesson ${L.number}`);
        if (q.kind === 'picture') {
          if (!o.image && !o.emoji) err(`${lp}.quickCheck.options[${j}] needs a picture`);
          if (o.word && (o.word[0] === L.sound) !== !!o.correct) err(`${lp}.quickCheck.options[${j}] "${o.word}": only the right answer may start with ${L.sound}`);
        }
      });
      if (!Array.isArray(q.options) || !q.options.length) err(`${lp}.quickCheck.options missing`);
      if ((q.options || []).filter((o) => o.correct).length !== 1) err(`${lp}.quickCheck needs exactly one correct option`);
    }
    taught.add(L.sound);
  });
  return errors;
}

// The proof: every word the child reads, anywhere, uses only sounds taught by then (plus the sight words is, I and It).
const SIGHT = ['is', 'i', 'it'];
export function childReadProof(c, root = ROOT) {
  const errors = [];
  const items = [];
  const clean = (t) => String(t).split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, '').toLowerCase()).filter(Boolean);
  for (const L of c.lessons || []) {
    for (const b of L.board || []) items.push({ where: `lesson ${L.number} board`, word: b.word, after: L.number });
    for (const w of L.sayingSounds || []) if (w.showLetters) items.push({ where: `lesson ${L.number} sayingSounds`, word: w.word, after: L.number });
    for (const o of (L.quickCheck && L.quickCheck.options) || []) if (o.glyph) items.push({ where: `lesson ${L.number} quickCheck`, word: o.glyph, after: L.number });
  }
  for (const k of c.checkpoints || []) {
    if (k.kind === 'book') {
      let book;
      try { book = JSON.parse(fs.readFileSync(path.join(root, 'data/books', `${k.book}.json`), 'utf8')); } catch (e) { errors.push(`proof: data/books/${k.book}.json unreadable (${e.message})`); continue; }
      for (const w of book.sight || []) if (!SIGHT.includes(String(w).toLowerCase())) errors.push(`proof: ${k.id} sight word "${w}" is not one of is, I, It`);
      (book.pages || []).forEach((pg, n) => {
        for (const f of ['child', 'slider']) if (pg[f] !== undefined) for (const w of clean(pg[f])) items.push({ where: `${k.id} page ${n + 1}.${f}`, word: w, after: k.after });
        for (const text of pg.words || []) for (const w of clean(text)) items.push({ where: `${k.id} page ${n + 1}.words`, word: w, after: k.after });
        for (const f of ['read', 'after']) if (typeof pg[f] === 'string' && /\{name\}/.test(pg[f]) && /\b(he|she|him|his|her|hers)\b/i.test(pg[f])) errors.push(`proof: ${k.id} page ${n + 1}.${f}: use the name, not he or she`);
      });
    } else if (k.kind === 'ride') for (const w of rideWords(c, k)) items.push({ where: `${k.id} ride`, word: w, after: k.after });
  }
  for (const { where, word, after } of items) {
    const w = word.toLowerCase();
    const taught = (c.lessons || []).slice(0, after).map((L) => L.sound);
    if (!SIGHT.includes(w) && ![...w].every((ch) => taught.includes(ch))) errors.push(`proof: ${where} "${w}" is not readable by lesson ${after}`);
  }
  return { errors, count: items.length };
}

// Reading a script aloud with sounds off drops a quotation that holds a sound whole: no "Touch it.'" fragments.
export function checkQuietScripts() {
  const errors = [];
  const quiet = (t) => scriptToParts(t, ['m', 'a', 's'], { quiet: true }).map((p) => p.tts || '').join(' ');
  if (quiet("Say: 'Find the letter that says mmm. Touch it.' Then say mmm together.") !== '') errors.push('quiet read-aloud: a quotation with a sound must be dropped whole');
  if (quiet("Say: 'Start at the dot. Follow the arrow.' Move your finger with theirs.") !== "Say: 'Start at the dot. Follow the arrow.' Move your finger with theirs.") errors.push('quiet read-aloud: a quotation without a sound must be kept whole');
  if (quiet("Say: 'Let's watch the mmm story.' Then press and hold. Come back.") !== 'Then press and hold. Come back.') errors.push('quiet read-aloud: only the framing sentences remain, no stray quote');
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const file = process.argv[2] || path.join(ROOT, 'data/curriculum.json');
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  const proof = childReadProof(c);
  const errors = [...checkCurriculum(c), ...proof.errors, ...checkQuietScripts()];
  // The board words are a test too: these are the exact lists the plan promises.
  const show = (n) => { const b = boardWords(ORDER.split(''), n, 4); return b && b.map((x) => `${x.word}(${x.target})`).join(' '); };
  const want = { 1: null, 2: null, 3: null, 4: null, 5: 'sat(t) sit(i) it(t) mist(s)', 7: 'man(n) map(p) nap(n) tap(t)', 9: 'sad(d) fad(f) mad(d) man(n)', 13: 'pal(l) dab(b) lab(l) lag(g)' };
  for (const [n, w] of Object.entries(want)) if (show(Number(n)) !== w) errors.push(`boardWords lesson ${n}: got ${show(Number(n))}, expected ${w}`);
  if (errors.length) { console.error(errors.map((e) => 'FAIL: ' + e).join('\n')); console.error(`check-content: ${errors.length} problem(s)`); process.exit(1); }
  console.log(`check-content: OK (${Object.keys(c.sounds).length} sounds, ${c.lessons.length} lessons, all rules pass, ${proof.count} child-read words proven readable)`);
}
