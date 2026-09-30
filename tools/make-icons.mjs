// Draws the app icon from js/glyphs.js and exports PNGs with Chromium. Run: node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, launch } from '../test/lib.mjs';
import { GLYPHS, STROKE_WIDTH } from '../js/glyphs.js';
import { ACCENT } from '../js/theme.js';

// mode: 'circle' (transparent corners), 'full' (full-bleed cream), 'maskable' (full-bleed, content in the safe zone)
function svgFor(mode) {
  const scale = mode === 'maskable' ? 0.74 : mode === 'full' ? 0.8 : 0.82;
  const gap = 8;
  const letters = ['m', 'a', 's'];
  const widths = letters.map((l) => GLYPHS[l].maxX - GLYPHS[l].minX);
  const total = widths.reduce((a, b) => a + b, 0) + gap * 2;
  let x = -total / 2;
  const paths = letters.map((l, i) => {
    const g = GLYPHS[l];
    const tx = x - g.minX;
    x += widths[i] + gap;
    return `<g transform="translate(${tx} -59)" >${g.strokes.map((s) => `<path d="${s.d}" fill="none" stroke="${ACCENT[l]}" stroke-width="${STROKE_WIDTH + 2}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`;
  }).join('');
  const bg = mode === 'circle' ? '<circle cx="100" cy="100" r="98" fill="#FFF8EC"/><circle cx="100" cy="100" r="98" fill="none" stroke="#F0E2C8" stroke-width="3"/>' : '<rect width="200" height="200" fill="#FFF8EC"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${bg}<g transform="translate(100 100) scale(${scale})">${paths}</g></svg>`;
}

const jobs = [
  ['icon-192.png', 192, 'circle'], ['icon-512.png', 512, 'circle'], ['maskable-512.png', 512, 'maskable'], ['apple-touch-icon.png', 180, 'full'],
];
const pw = await loadPlaywright();
const browser = await launch(pw);
fs.mkdirSync(path.join(ROOT, 'icons'), { recursive: true });
for (const [name, size, mode] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svgFor(mode)}`);
  await page.screenshot({ path: path.join(ROOT, 'icons', name), omitBackground: true });
  await page.close();
  console.log('wrote', name);
}
fs.writeFileSync(path.join(ROOT, 'icons/icon.svg'), svgFor('circle'));
await browser.close();
