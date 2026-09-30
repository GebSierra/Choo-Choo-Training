// Prints the picture tiles curriculum.json uses, as the lines to paste into the precache list in sw.js.
// Run: node tools/precache-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../test/lib.mjs';

export function usedImages(curriculum) {
  const found = new Set();
  (function walk(v) {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'image' && typeof x === 'string') found.add(x); else walk(x); }
  })(curriculum);
  return [...found].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const list = usedImages(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')));
  const lines = []; let line = '  ';
  for (const f of list) { const item = `'${f}', `; if ((line + item).length > 150) { lines.push(line.trimEnd()); line = '  '; } line += item; }
  lines.push(line.trimEnd());
  console.log(lines.join('\n'));
}
