// Service worker: precache the app shell and everything the three lessons use, then serve cache-first.
// Bump CACHE_VERSION whenever any file below changes, or installed copies keep the old files.
const CACHE_VERSION = 'reading-v1.2.0';

const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css',
  'js/app.js', 'js/dom.js', 'js/router.js', 'js/store.js', 'js/speech.js', 'js/glyphs.js', 'js/theme.js', 'js/letters.js', 'js/lessons.js', 'js/scripts.js', 'js/version.js',
  'js/components/slide-track.js', 'js/components/trace-pad.js', 'js/components/hold-button.js', 'js/components/fullscreen-button.js', 'js/components/speak-button.js', 'js/components/sound-card.js',
  'js/screens/home.js', 'js/screens/lesson.js', 'js/screens/task.js', 'js/screens/finish.js', 'js/screens/grownups.js',
  'js/screens/tasks/review.js', 'js/screens/tasks/new-letter.js', 'js/screens/tasks/story.js', 'js/screens/tasks/words.js', 'js/screens/tasks/sounds.js', 'js/screens/tasks/writing.js', 'js/screens/tasks/check.js',
  'data/curriculum.json',
  'assets/fonts/nunito-latin.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  // pictures used by lesson 2
  'assets/images/mentava/web/a/apple.webp', 'assets/images/mentava/web/a/hat.webp', 'assets/images/mentava/web/a/cat.webp',
  'assets/images/mentava/web/a/crab.webp',
];
// Recorded sounds are optional: a missing file must not stop the install.
const OPTIONAL_FILES = ['assets/audio/sounds/m.mp3', 'assets/audio/sounds/a.mp3', 'assets/audio/sounds/s.mp3'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // cache: 'reload' skips the browser's HTTP cache, so a new version never precaches stale files.
    const fresh = (f) => new Request(f, { cache: 'reload' });
    await cache.addAll(APP_FILES.map(fresh));
    await Promise.all(OPTIONAL_FILES.map((f) => cache.add(fresh(f)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE_VERSION) await caches.delete(key);
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
        const res = await fetch(req, { signal: stop.signal });
        clearTimeout(timer);
        if (res.status === 200) event.waitUntil(cache.put(req, res.clone()));
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
