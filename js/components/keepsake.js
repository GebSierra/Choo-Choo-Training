import { h } from '../dom.js';
import { kidSvg } from '../art/kid.js';
import { pipSvg } from '../art/pip.js';
import { engineSvg } from '../art/train2d.js';

// A keepsake picture a grown-up can save (owner): a 1080 x 1350 PNG drawn on the device with a canvas. Nothing is uploaded and no network is
// used; the child's name is only ever drawn into the picture on this device. Reusable for later milestones (the end of a world, a first story):
// makeKeepsake({ headline, word, date, character }) gives a PNG Blob, keepsakeButton(...) is the grown-up's "Save this moment" button.
export const KEEPSAKE_W = 1080, KEEPSAKE_H = 1350, KEEPSAKE_SITE = 'choochootraining.com';
export const keepsakeHeadline = (name) => (name && String(name).trim() ? `${String(name).trim()} just read a real word!` : 'Your child just read their first word!');

// An svg element drawn through an Image from a data URL (inline fonts and external files are not needed: the art is plain shapes).
function svgImage(svg) {
  const el = svg.cloneNode(true);
  const vb = (el.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
  el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  el.setAttribute('width', String(Math.round(vb[2] * 8))); el.setAttribute('height', String(Math.round(vb[3] * 8)));
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(el));
  return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve({ im, ratio: vb[2] / vb[3] }); im.onerror = () => resolve(null); im.src = src; });
}
const drawFit = (ctx, img, x, y, w, hgt) => { if (!img) return; const k = Math.min(w / img.im.width, hgt / img.im.height); const dw = img.im.width * k, dh = img.im.height * k; ctx.drawImage(img.im, x + (w - dw) / 2, y + (hgt - dh), dw, dh); };
function wrap(ctx, text, maxW) {
  const out = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
const round = (ctx, x, y, w, hgt, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r); ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

export async function makeKeepsake({ headline, word, date = new Date(), character = {} }) {
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); await Promise.all([document.fonts.load('700 120px Andika'), document.fonts.load('800 60px Nunito')]).catch(() => {}); } catch { /* the fallback fonts draw */ }
  const [kid, pip, engine] = await Promise.all([svgImage(kidSvg({ ...character, pose: 'cheer', still: true })), svgImage(pipSvg({ pose: 'cheer', still: true })), svgImage(engineSvg({ still: true }))]);
  const c = document.createElement('canvas'); c.width = KEEPSAKE_W; c.height = KEEPSAKE_H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, KEEPSAKE_H); sky.addColorStop(0, '#FFE9B8'); sky.addColorStop(1, '#FFF8EC');
  g.fillStyle = sky; g.fillRect(0, 0, KEEPSAKE_W, KEEPSAKE_H);
  // confetti, a fixed scatter
  const colours = ['#E5484D', '#FFD166', '#5FE3B0', '#5DE0F0', '#5A4BD6', '#F0556A'];
  for (let i = 0; i < 46; i++) { g.fillStyle = colours[i % 6]; const x = (i * 137) % KEEPSAKE_W, y = (i * 211) % 520; g.save(); g.translate(x, y); g.rotate((i * 53) % 180 * Math.PI / 180); if (i % 3) g.fillRect(-9, -9, 18, 18); else { g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); } g.restore(); }
  g.textAlign = 'center'; g.fillStyle = '#2B2D5C';
  g.font = '800 70px Nunito, system-ui, sans-serif';
  const lines = wrap(g, headline, KEEPSAKE_W - 160);
  lines.forEach((t, i) => g.fillText(t, KEEPSAKE_W / 2, 150 + i * 84));
  const top = 150 + lines.length * 84 + 20;
  // the word on a card
  g.save(); g.shadowColor = 'rgba(60,40,20,.18)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.fillStyle = '#fff'; round(g, 130, top, KEEPSAKE_W - 260, 330, 48); g.fill(); g.restore();
  g.fillStyle = '#1E2140'; g.font = '700 230px Andika, Nunito, system-ui, sans-serif'; g.textBaseline = 'alphabetic';
  g.fillText(word, KEEPSAKE_W / 2, top + 250);
  // the child and Pip
  const figTop = top + 370, figH = 500;
  drawFit(g, kid, 90, figTop, 440, figH);
  drawFit(g, pip, 560, figTop + 30, 420, figH - 30);
  // ground and a small train
  g.fillStyle = '#9ED88F'; g.fillRect(0, KEEPSAKE_H - 190, KEEPSAKE_W, 80);
  drawFit(g, engine, 40, KEEPSAKE_H - 262, 190, 150);
  g.fillStyle = '#2B2D5C'; g.font = '700 38px Nunito, system-ui, sans-serif';
  g.fillText(new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(date), KEEPSAKE_W / 2, KEEPSAKE_H - 135);
  g.font = '800 54px Nunito, system-ui, sans-serif'; g.fillStyle = '#E5484D';
  g.fillText(KEEPSAKE_SITE, KEEPSAKE_W / 2, KEEPSAKE_H - 55);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

// Saves the picture: a download where the browser honours it; the share sheet with the file where that exists (so iOS can "Save Image"),
// else the picture opens in its own tab to be pressed and held. The button is about saving, never sharing.
export async function saveBlob(blob, filename) {
  const file = typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return 'share'; } catch { /* closed: nothing saved */ return 'cancelled'; } }
  const url = URL.createObjectURL(blob);
  if (ios) { window.open(url, '_blank'); return 'opened'; }
  const a = h('a', { href: url, download: filename, style: { display: 'none' } });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'download';
}

export function keepsakeButton({ options, filename = 'keepsake.png', label = 'Save this moment' }) {
  const btn = h('button', { class: 'btn secondary keepsake-btn', type: 'button', style: { minHeight: '48px' }, onclick: async () => {
    btn.disabled = true;
    try {
      const o = typeof options === 'function' ? options() : options;
      const blob = await makeKeepsake(o);
      window.__keepsake = { type: blob.type, size: blob.size, blob, headline: o.headline }; // read by the tests
      await saveBlob(blob, filename);
    } finally { btn.disabled = false; }
  } }, label);
  return btn;
}
