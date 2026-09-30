// Parent scripts are shown as text. To read one aloud, isolated sounds (mmm, aaammm, sss) become
// recorded clips and everything else goes to text to speech. Nothing is ever a single letter.
export const HELD = new Set('aeiouflmnrsvwz');

export const stretchWord = (word) => [...word].map((c) => (HELD.has(c) ? c.repeat(3) : c)).join('');

export function stretchLetters(word) { return [...word].map((c) => c.repeat(3)).join(''); }

export function scriptToParts(text, soundKeys) {
  const parts = [];
  let buf = [];
  const flush = () => { const t = buf.join(' ').trim(); if (t) parts.push({ tts: t }); buf = []; };
  for (const tok of text.split(/\s+/)) {
    if (!tok) continue;
    if (tok === '...') { flush(); parts.push({ pause: 450 }); continue; }
    const m = tok.match(/^([A-Za-z]+)([.,:;!?]*)$/);
    const core = m ? m[1].toLowerCase() : '';
    const runs = core ? core.match(/(.)\1*/g) : null;
    const stretched = runs && runs.some((r) => r.length >= 3);
    if (stretched) {
      if (runs.every((r) => r.length >= 3 && soundKeys.includes(r[0]))) { flush(); runs.forEach((r) => parts.push({ clip: r[0] })); }
      continue; // a stretch we have no clip for is shown, never spoken
    }
    if (core.length === 1 && soundKeys.includes(core) && m[1] === core) { flush(); parts.push({ clip: core }); continue; }
    buf.push(tok);
  }
  flush();
  return parts;
}
