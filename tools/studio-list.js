// The recording list for the studio: every sound and connected blend the app needs, in recording order.
// Wording follows docs/CURRICULUM.md section 5 (pronunciation rules) and the Stage 2 and 3 unit notes.
// The studio never plays a synthetic voice: these are instructions to read, not audio.

function sound(key, show, say, dont, tip, example, hold) {
  return { key, file: 'sound-' + key, show, say, dont, tip, example, hold };
}

export const GROUPS = [
  { id: 'A', title: 'Letter sounds, World 1' },
  { id: 'B', title: 'Letter sounds, Stage 2' },
  { id: 'C', title: 'Two-letter sounds, Stage 3' },
  { id: 'D', title: 'Smooth blends, World 1' }
];

const A = [
  sound('m', 'm', 'Hold it about 2 seconds: mmm. Lips together, hum.', 'Not "muh". Not "em".', 'Lips closed. You can feel a buzz on your lips.', 'as in mmmoon', 'stretchy'),
  sound('a', 'a', 'The sound at the start of "apple": aaa. Mouth open wide, held about 2 seconds.', 'Not "ay" (the letter name). Not "uh".', 'Open wide, like the dentist is looking at your teeth.', 'as in aaapple', 'stretchy'),
  sound('s', 's', 'Hold it about 2 seconds: sss. Push air out like a snake.', 'Not "suh". Not "ess".', 'Teeth close together. No buzz in your throat.', 'as in sssun', 'stretchy'),
  sound('i', 'i', 'The sound at the start of "it": iii. Held about 2 seconds, mouth only a little open.', 'Not "eye" (the letter name). Not "ee".', 'Smile a tiny bit and keep your tongue low.', 'as in iiit', 'stretchy'),
  sound('t', 't', 'A quick tap of the tongue: t. Short and clipped.', 'Not "tuh". Not "tee".', 'Tongue taps the bumpy spot behind your top teeth. Nothing in your throat. It is the quiet partner of d.', 'as in the end of "cat"', 'bouncy'),
  sound('p', 'p', 'A quick puff of air: p. Short and clipped.', 'Not "puh". Not "pee".', 'Hold your hand near your lips and feel the puff. No buzz in your throat. It is the quiet partner of b.', 'as in the start of "pig"', 'bouncy')
];

const B = [
  sound('f', 'f', 'Hold it about 2 seconds: fff. Top teeth on your bottom lip, blow.', 'Not "fuh". Not "eff".', 'Quiet partner of v: touch your throat, fff has no buzz.', 'as in fffish', 'stretchy'),
  sound('o', 'o', 'The sound in "mop": ooo. Mouth round and open, held about 2 seconds.', 'Not "oh" (the letter name). Not "aw".', 'Drop your jaw, like saying "ah" with a rounder mouth.', 'as in oooctopus', 'stretchy'),
  sound('n', 'n', 'Hold it about 2 seconds: nnn. Hum through your nose.', 'Not "nuh". Not "en".', 'Tongue touches behind your top teeth. Pinch your nose and the sound stops.', 'as in nnnest', 'stretchy'),
  sound('d', 'd', 'A quick voiced pop: d. Short and clipped, no uh.', 'Not "duh". Not "dee".', 'Same mouth as t, but your voice buzzes. Touch your throat: d buzzes, t does not.', 'as in the start of "dog"', 'bouncy'),
  sound('k', 'c k', 'A quick pop from the back of your throat: k. This one sound is spelled c and k.', 'Not "kuh". Not "see" or "kay".', 'Quiet partner of g: touch your throat, k has no buzz.', 'as in the start of "cat" and "kid"', 'bouncy'),
  sound('h', 'h', 'Just a breath: h. Like fogging a mirror. Very short.', 'Not "huh". Not "aitch".', 'Put your hand in front of your mouth and feel warm air. There is no voice at all.', 'as in the start of "hat"', 'bouncy'),
  sound('u', 'u', 'The sound in "fun": uuu. Relaxed mouth, held about 2 seconds.', 'Not "you" (the letter name). Not "oo".', 'Let your jaw go loose and lazy, like a little grunt.', 'as in uuumbrella', 'stretchy'),
  sound('g', 'g', 'A quick voiced pop: g, the hard sound. Short and clipped, no uh.', 'Not "guh". Not "gee". Not the j sound.', 'Same mouth as k, but your voice buzzes. Touch your throat: g buzzes, k does not.', 'as in the start of "gum"', 'bouncy'),
  sound('l', 'l', 'Hold it about 2 seconds: lll. Tongue tip up behind your top teeth.', 'Not "luh". Not "el".', 'Smile with your tongue tip up and let the sound flow out the sides.', 'as in llllip', 'stretchy'),
  sound('r', 'r', 'Hold it about 2 seconds: rrr. Lips a bit round, tongue pulled back.', 'Not "ruh". Not "ar".', 'Growl softly like a little lion. Your tongue does not touch the roof of your mouth.', 'as in rrrug', 'stretchy'),
  sound('b', 'b', 'A quick voiced pop: b. Short and clipped, no uh.', 'Not "buh". Not "bee".', 'Same mouth as p, but your voice buzzes. Touch your throat: b buzzes, p does not.', 'as in the start of "bat"', 'bouncy'),
  sound('e', 'e', 'The sound in "bed": eee. Mouth halfway open, held about 2 seconds.', 'Not "ee" (the letter name). Not "ay".', 'Keep it flat, like a sheep saying "eh".', 'as in eeegg', 'stretchy'),
  sound('j', 'j', 'A quick voiced pop: j. Short and clipped, no uh.', 'Not "juh". Not "jay".', 'Lips a little round. Your voice buzzes: touch your throat.', 'as in the start of "jam"', 'bouncy'),
  sound('w', 'w', 'Lips round, then open: ww, as in "wet". Hold it only a moment.', 'Not "double-u". Not "wuh". Not "d".', 'Make a small circle with your lips, like blowing out a candle, then let go.', 'as in wwwet', 'stretchy'),
  sound('v', 'v', 'Hold it about 2 seconds: vvv. Top teeth on your bottom lip, buzz.', 'Not "vuh". Not "vee".', 'Buzzing partner of f: touch your throat and feel it buzz. Your lip tickles.', 'as in vvvan', 'stretchy'),
  sound('y', 'y', 'A quick "y" as in "yes". Short and clean.', 'Not "why" (the letter name). Not "w".', 'Smile and push your tongue up and forward. Yes, yes, yes.', 'as in the start of "yes"', 'bouncy'),
  sound('z', 'z', 'Hold it about 2 seconds: zzz. Like a bee.', 'Not "zuh". Not "zee".', 'Buzzing partner of s: touch your throat and feel the bee buzz.', 'as in zzzip', 'stretchy'),
  sound('x', 'x', 'Two quick sounds as one: ks, as in "fox". Short and snappy.', 'Not "ex" (the letter name). Not "eks".', 'A k pops, then a quick s hiss. Say the end of "fox".', 'as in the end of "fox"', 'bouncy'),
  sound('qu', 'qu', 'Two quick sounds as one: kw, as in "quit". Short and snappy.', 'Not "cue" (the letter name). Not "kuh-wuh".', 'A k pops, then your lips round into a w, all in one move.', 'as in the start of "quit"', 'bouncy')
];

const C = [
  sound('sh', 'sh', 'Hold it about 2 seconds: shhh. The "be quiet" sound.', 'Not "shuh". Not "s" then "h".', 'Lips pushed forward like a kiss, teeth close, no buzz in your throat.', 'as in shhhip', 'stretchy'),
  sound('ch', 'ch', 'A quick sneeze sound: ch. Short and clipped.', 'Not "chuh". Not "sh".', 'Like a tiny "achoo" without the "oo". Tongue taps, then lets the air out.', 'as in the start of "chip"', 'bouncy'),
  sound('th-buzz', 'th', 'The buzzing th, as in "that". Held about 2 seconds, with your voice on.', 'Not "d". Not "v". Not "thuh".', 'Tongue peeks out between your teeth. Touch your throat: "that" buzzes.', 'as in ththhat', 'stretchy'),
  sound('th-quiet', 'th', 'The quiet th, as in "thin". Held about 2 seconds, only air.', 'Not "f". Not "t". Not "thuh".', 'Tongue peeks out between your teeth, then blow. Touch your throat: "thin" does not buzz.', 'as in ththhin', 'stretchy'),
  sound('wh', 'wh', 'The w sound, as in "when". Lips round, then open.', 'Not "double-u". Not "hw" with a big puff.', 'It sounds just like w. Small round lips, then let go.', 'as in wwwhen', 'stretchy'),
  sound('ng', 'ng', 'The chunk sound at the end of "sing": ng. Held about 2 seconds, one hum from the back of your tongue.', 'Not "n" then "g". Not "ing-guh".', 'The back of your tongue touches the roof of your mouth. Stop before any g pops out.', 'as in the end of "sing"', 'stretchy'),
  sound('nk', 'nk', 'The ending of "bank": nk. A short hum, then a quick k at the back.', 'Not "n" then "kuh". Not "nuh-kuh".', 'Same spot as ng, then finish with a quick, quiet k.', 'as in the end of "bank"', 'bouncy')
];

const STOP_FIRST = ['tip', 'tap', 'pat', 'pit'];
const BLENDS = ['am', 'at', 'it', 'Sam', 'sat', 'mat', 'sit', 'Tim', 'map', 'sip', 'sap', 'tip', 'tap', 'pat', 'pit'];

const STRETCH = {
  am: 'aaammm', at: 'aaat', it: 'iiit', sam: 'sssaaammm', sat: 'sssaaat', mat: 'mmmaaat', sit: 'sssiiit', tim: 'tiiimmm',
  map: 'mmmaaap', sip: 'sssiiip', sap: 'sssaaap', tip: 't-iiip', tap: 't-aaap', pat: 'p-aaat', pit: 'p-iiit'
};
const CHOP = {
  am: 'a... m', at: 'a... t', it: 'i... t', sam: 's... a... m', sat: 's... a... t', mat: 'm... a... t', sit: 's... i... t', tim: 't... i... m',
  map: 'm... a... p', sip: 's... i... p', sap: 's... a... p', tip: 't... i... p', tap: 't... a... p', pat: 'p... a... t', pit: 'p... i... t'
};
const UH = {
  am: 'uh-a-muh', at: 'uh-a-tuh', it: 'uh-i-tuh', sam: 'suh-a-muh', sat: 'suh-a-tuh', mat: 'muh-a-tuh', sit: 'suh-i-tuh', tim: 'tuh-i-muh',
  map: 'muh-a-puh', sip: 'suh-i-puh', sap: 'suh-a-puh', tip: 'tuh-ip', tap: 'tuh-ap', pat: 'puh-at', pit: 'puh-it'
};

const D = BLENDS.map((w) => {
  const lw = w.toLowerCase();
  const stop = STOP_FIRST.includes(lw);
  const say = stop
    ? 'Say the first sound quick and slide straight into the vowel: ' + STRETCH[lw] + '. One smooth word.'
    : STRETCH[lw] + ' — one smooth sound, no gaps.';
  const dont = stop
    ? 'Not "' + UH[lw] + '". Never "' + CHOP[lw] + '".'
    : 'Not "' + CHOP[lw] + '", never "' + UH[lw] + '".';
  const tip = stop
    ? 'The first sound is a tiny pop with no uh after it, then the vowel flows on to the end.'
    : 'Keep your voice going from the first sound to the last, like a train rolling. About 2 seconds in all.';
  return { key: lw, file: 'blend-' + lw, group: 'D', show: w, say, dont, tip, example: 'the whole word "' + w + '" as one stream', hold: 'blend' };
});

export const ITEMS = [
  ...A.map((i) => ({ ...i, group: 'A' })),
  ...B.map((i) => ({ ...i, group: 'B' })),
  ...C.map((i) => ({ ...i, group: 'C' })),
  ...D
];

export const HOLD_LABEL = {
  stretchy: 'Stretchy: hold it about 2 seconds',
  bouncy: 'Bouncy: short and quick',
  blend: 'Smooth blend'
};
