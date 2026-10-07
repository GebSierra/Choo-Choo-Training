// Service worker: precache the app shell and everything the three lessons use, then serve cache-first.
// Bump CACHE_VERSION whenever any file below changes, or installed copies keep the old files.
const CACHE_VERSION = 'reading-v1.9.18';

const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css',
  'js/app.js', 'js/dom.js', 'js/router.js', 'js/store.js', 'js/order.js', 'js/speech.js', 'js/glyphs.js', 'js/theme.js', 'js/letters.js', 'js/lessons.js', 'js/scripts.js', 'js/version.js', 'js/platform.js', 'js/art.js', 'js/sfx.js', 'js/music.js', 'assets/audio/music/theme.mp3', 'assets/audio/sfx/whistle.mp3', 'js/guide.js',
  'js/components/grown-gate.js', 'js/components/slide-track.js', 'js/components/trace-pad.js', 'js/components/hold-button.js', 'js/components/fullscreen-button.js', 'js/components/speak-button.js', 'js/components/sound-card.js', 'js/components/sparkle.js', 'js/components/letter-face.js', 'js/components/game-kit.js', 'js/components/picture.js', 'js/components/slide-blend.js', 'js/components/welcome-card.js', 'js/art/pip.js', 'js/art/train2d.js', 'js/games-data.js', 'js/components/say-sound.js', 'js/components/judge-bar.js', 'js/components/reading-item.js', 'js/art/proto-art.js', 'js/screens/proto-lesson.js', 'js/screens/proto-heart.js',
  'js/screens/home.js', 'js/screens/lesson.js', 'js/screens/task.js', 'js/screens/shell.js', 'js/screens/sack.js', 'js/screens/checkpoint.js', 'js/screens/book.js', 'js/screens/ride.js', 'js/blend-detect.js', 'js/mic.js', 'js/screens/finish.js', 'js/screens/grownups.js',
  'js/screens/tasks/review.js', 'js/screens/tasks/new-letter.js', 'js/screens/tasks/story.js', 'js/screens/tasks/words.js', 'js/screens/tasks/sounds.js', 'js/screens/tasks/writing.js', 'js/screens/tasks/hunt.js', 'js/screens/tasks/hunt-deal.js', 'js/screens/tasks/signals.js', 'js/screens/tasks/wagons.js', 'js/screens/tasks/board.js', 'js/screens/tasks/practice.js', 'js/screens/tasks/check.js',
  // Prototype 4: the eight-step lesson for f (Grownups > Previews)
  'js/screens/tasks/proto/kit.js', 'js/screens/tasks/proto/warmup.js', 'js/screens/tasks/proto/recall.js', 'js/screens/tasks/proto/new-sound.js', 'js/screens/tasks/proto/blend-it.js', 'js/screens/tasks/proto/read-it.js', 'js/screens/tasks/proto/build-it.js', 'js/screens/tasks/proto/read-story.js', 'data/proto-lesson-f.json', 'js/screens/proto-play.js', 'js/screens/proto-placement.js', 'js/screens/tasks/proto/play.js', 'data/proto-play.json', 'js/screens/tasks/proto/heart.js',
  // the train world: the 3D Home and three.js (MIT, vendor/three/LICENSE)
  'js/screens/home3d.js', 'js/screens/previews.js', 'js/screens/crossing.js', 'js/worlds.js', 'js/components/tip-card.js', 'js/components/rest-card.js', 'js/components/journey-board.js', 'js/components/lesson-list.js', 'js/train/world.js', 'js/train/scene.js', 'js/train/track.js', 'js/train/scenery.js', 'js/train/stations.js', 'js/train/train.js', 'js/train/tunnel.js', 'js/levels.js', 'js/components/star-board.js', 'js/components/level-banner.js', 'js/art/cars2d.js', 'js/train/pip3d.js', 'js/train/camera.js', 'js/train/overlay.js',
  'vendor/three/three.module.min.js', 'vendor/three/RoundedBoxGeometry.js',
  'data/curriculum.json', 'data/tips.json', 'data/books/book-1.json', 'data/books/book-2.json',
  'assets/fonts/nunito-latin.woff2', 'assets/fonts/andika-latin-400-normal.woff2', 'assets/fonts/andika-latin-700-normal.woff2', 'js/components/page-turn.js', 'js/character.js', 'js/art/kid.js', 'js/train/kid3d.js', 'js/sequence.js', 'js/components/character-picker.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  // picture tiles curriculum.json uses (node tools/precache-images.mjs prints this list; the smoke test checks it)
  'assets/images/mentava/web/a/apple.webp', 'assets/images/mentava/web/a/astronaut.webp', 'assets/images/mentava/web/a/cat.webp',
  'assets/images/mentava/web/a/crab.webp', 'assets/images/mentava/web/a/hat.webp', 'assets/images/mentava/web/b/baby.webp',
  'assets/images/mentava/web/b/ball.webp', 'assets/images/mentava/web/b/banana.webp', 'assets/images/mentava/web/b/bear.webp',
  'assets/images/mentava/web/b/bus.webp', 'assets/images/mentava/web/c-k/camel.webp', 'assets/images/mentava/web/c-k/candy.webp',
  'assets/images/mentava/web/c-k/cat.webp', 'assets/images/mentava/web/c-k/king.webp', 'assets/images/mentava/web/c-k/koala.webp',
  'assets/images/mentava/web/ch/chair.webp', 'assets/images/mentava/web/ch/cheese.webp', 'assets/images/mentava/web/ch/chick.webp',
  'assets/images/mentava/web/d/deer.webp', 'assets/images/mentava/web/d/dog.webp', 'assets/images/mentava/web/d/dolphin.webp',
  'assets/images/mentava/web/d/door.webp', 'assets/images/mentava/web/d/duck.webp', 'assets/images/mentava/web/e/egg.webp',
  'assets/images/mentava/web/e/hen.webp', 'assets/images/mentava/web/e/nest.webp', 'assets/images/mentava/web/e/tent.webp',
  'assets/images/mentava/web/f/fan.webp', 'assets/images/mentava/web/f/fish.webp', 'assets/images/mentava/web/f/fork.webp',
  'assets/images/mentava/web/g/gate.webp', 'assets/images/mentava/web/g/goat.webp', 'assets/images/mentava/web/h/hand.webp',
  'assets/images/mentava/web/h/hat.webp', 'assets/images/mentava/web/h/hippo.webp', 'assets/images/mentava/web/i/igloo.webp',
  'assets/images/mentava/web/i/sit.webp', 'assets/images/mentava/web/i/stick.webp', 'assets/images/mentava/web/ie/kite.webp',
  'assets/images/mentava/web/ie/light.webp', 'assets/images/mentava/web/j/jet.webp', 'assets/images/mentava/web/l/ladder.webp',
  'assets/images/mentava/web/l/leaf.webp', 'assets/images/mentava/web/l/leg.webp', 'assets/images/mentava/web/m/map.webp',
  'assets/images/mentava/web/m/milk.webp', 'assets/images/mentava/web/n/necklace.webp', 'assets/images/mentava/web/n/nose.webp',
  'assets/images/mentava/web/n/nut.webp', 'assets/images/mentava/web/o/octopus.webp', 'assets/images/mentava/web/o/pot.webp',
  'assets/images/mentava/web/oo-moon/moon.webp', 'assets/images/mentava/web/or/corn.webp', 'assets/images/mentava/web/or/horse.webp',
  'assets/images/mentava/web/p/panda.webp', 'assets/images/mentava/web/p/pig.webp', 'assets/images/mentava/web/p/pumpkin.webp',
  'assets/images/mentava/web/q/queen.webp', 'assets/images/mentava/web/r/rabbit.webp', 'assets/images/mentava/web/r/robot.webp',
  'assets/images/mentava/web/r/rocket.webp', 'assets/images/mentava/web/s/snail.webp', 'assets/images/mentava/web/s/snake.webp',
  'assets/images/mentava/web/s/sock.webp', 'assets/images/mentava/web/t/table.webp', 'assets/images/mentava/web/t/tiger.webp',
  'assets/images/mentava/web/t/tree.webp', 'assets/images/mentava/web/u/sun.webp', 'assets/images/mentava/web/u/umbrella.webp',
  'assets/images/mentava/web/v/van.webp', 'assets/images/mentava/web/v/vest.webp', 'assets/images/mentava/web/v/volcano.webp',
  'assets/images/mentava/web/w/wagon.webp', 'assets/images/mentava/web/w/window.webp', 'assets/images/mentava/web/w/worm.webp',
  'assets/images/mentava/web/x/fox.webp', 'assets/images/mentava/web/y/yarn.webp',
];
// Recorded sounds are optional: a missing file must not stop the install.
const OPTIONAL_FILES = ['assets/audio/sounds/m.mp3', 'assets/audio/sounds/a.mp3', 'assets/audio/sounds/s.mp3', 'assets/audio/sounds/i.mp3', 'assets/audio/sounds/t.mp3', 'assets/audio/sounds/p.mp3', 'assets/audio/sounds/n.mp3', 'assets/audio/sounds/f.mp3', 'assets/audio/sounds/d.mp3', 'assets/audio/sounds/h.mp3', 'assets/audio/sounds/g.mp3', 'assets/audio/sounds/b.mp3', 'assets/audio/sounds/l.mp3', 'assets/audio/sounds/th-buzz.mp3', 'assets/audio/heart/the-e.mp3'];
// Connected blend models for the f lesson prototype ("fffiiit"), recorded by the grown-up, are optional too.
OPTIONAL_FILES.push('assets/audio/blends/sat.mp3', 'assets/audio/blends/map.mp3', 'assets/audio/blends/mat.mp3', 'assets/audio/blends/sip.mp3', 'assets/audio/blends/fit.mp3', 'assets/audio/blends/fat.mp3', 'assets/audio/blends/if.mp3', 'assets/audio/blends/tip.mp3', 'assets/audio/blends/sam.mp3', 'assets/audio/blends/at.mp3', 'assets/audio/blends/it.mp3', 'assets/audio/blends/sis.mp3');

// Stage 1 sound play (prototype 6): the grown-up's stretched recordings of its picture words are optional too.
OPTIONAL_FILES.push(...['milk', 'moon', 'sun', 'sock', 'fish', 'fox', 'apple', 'ant', 'pig', 'egg', 'up'].map((w) => `assets/audio/blends/${w}.mp3`));

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // cache: 'reload' skips the browser's HTTP cache, so a new version never precaches stale files.
    const fresh = (f) => new Request(f, { cache: 'reload' });
    // The app's own files are all or nothing; a picture tile that fails is fetched later, when it is first needed.
    await cache.addAll(APP_FILES.filter((f) => !f.endsWith('.webp')).map(fresh));
    await Promise.allSettled(APP_FILES.filter((f) => f.endsWith('.webp')).map((f) => cache.add(fresh(f))));
    await Promise.all(OPTIONAL_FILES.map((f) => cache.add(fresh(f)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // This origin also serves Geb's other Pages sites: only this app's own old caches go.
    for (const key of await caches.keys()) if (key.startsWith('reading-v') && key !== CACHE_VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.origin && url.origin !== location.origin) return; // never touch other origins
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Content: network first (2.5 s, then the cache), so edits show up when online and a bad connection does not hang.
    if (url.pathname.endsWith('/data/curriculum.json')) {
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), 2500);
      try {
        const res = await fetch(req, { signal: stop.signal, cache: 'no-cache' });
        clearTimeout(timer);
        // Only a good JSON answer replaces the cached copy (not a hosting error page or a captive portal).
        if (!res.ok || !/json/i.test(res.headers.get('content-type') || '')) throw new Error('not the curriculum');
        event.waitUntil(cache.put(req, res.clone()));
        return res;
      } catch { clearTimeout(timer); const hit = await cache.match(req); if (hit) return hit; throw new Error('offline'); }
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.status === 200 && res.type === 'basic') event.waitUntil(cache.put(req, res.clone())); // not 404s (missing clips) and not 206 partial audio
      return res;
    } catch {
      if (req.mode === 'navigate') { const shell = await cache.match('index.html'); if (shell) return shell; }
      throw new Error('offline');
    }
  })());
});
