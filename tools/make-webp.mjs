// Converts Mentava PNG tiles to 512 px WebP using Chromium's canvas encoder
// (the bundled ffmpeg has no WebP encoder). Run: node tools/make-webp.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, launch } from '../test/lib.mjs';

const src = path.join(ROOT, 'assets/images/mentava');
const pw = await loadPlaywright();
const browser = await launch(pw);
const page = await browser.newPage();
let n = 0;
for (const dir of fs.readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'web')) {
  fs.mkdirSync(path.join(src, 'web', dir.name), { recursive: true });
  for (const f of fs.readdirSync(path.join(src, dir.name)).filter((f) => f.endsWith('.png'))) {
    const b64 = fs.readFileSync(path.join(src, dir.name, f)).toString('base64');
    const out = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const s = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ''; for (const x of buf) bin += String.fromCharCode(x);
      return btoa(bin);
    }, b64);
    fs.writeFileSync(path.join(src, 'web', dir.name, f.replace('.png', '.webp')), Buffer.from(out, 'base64'));
    n++;
  }
}
await browser.close();
console.log('converted', n);
