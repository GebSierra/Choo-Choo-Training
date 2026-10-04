# App store readiness (Phase E, after PLAN-v1.8 Phase D)

Goal: keep the web app easy to wrap later for Google Play and the Apple App Store.
Likely wrapper: Capacitor (one native shell for both stores, serving these same files
from the app bundle). Google Play could also use a Trusted Web Activity. Decide later.
Facts below marked VERIFY must be checked in current Apple, Google and Capacitor docs.

## Already in good shape
- Relative paths, no build step, everything bundled locally (three.js vendored, fonts precached).
- viewport-fit=cover and safe-area insets in css/app.css.
- One storage module (js/store.js) and one audio module (js/sfx.js).
- Hash router, so the Android back button can map to history.back().
- No analytics, ads or tracking (matters for kids' categories).

## Build now (small, Sonnet)
1. Native detection: add `js/platform.js` exporting `isNative` (true when
   `window.Capacitor?.isNativePlatform?.()` is true). Skip service worker registration in
   js/app.js when isNative (the bundle is already local). Test: with a stubbed
   window.Capacitor, no SW registers.
2. Storage seam: all persistence goes through js/store.js only. Add a test that greps js/
   for `localStorage` outside store.js and fails if found.
3. No remote fetches: a test that fails if any js/, css/, data/ or index.html file loads
   a resource from http(s) other than the existing YouTube links.
4. Parental gate for leaving the app: the YouTube links open only after a grown-up check
   (VERIFY: Apple's kids rules ask for a parental gate before external links; a long hold
   may not be enough). Use a simple gate: "Grown-ups: tap the number seven" with
   numbers shown as words. Reuse it for the Grownups page.
5. Android back button: when isNative, listen for the Capacitor backButton event via a
   small hook in js/router.js (VERIFY the event name in Capacitor docs). On home it does
   nothing; elsewhere it goes back.
6. Microphone: keep the request only when Smooth Ride opens. Note for the native build:
   iOS needs an NSMicrophoneUsageDescription string (a plain OS prompt line, not in-app
   text). VERIFY getUserMedia and speechSynthesis inside WKWebView on current iOS.

## Later, when wrapping
- Store icons and splash screens from one source image.
- Privacy policy page (required by both stores, separate from the app UI).
- If sold through the stores, purchases must use store billing (VERIFY current rules).
- Kids category / Families policy review: YouTube embeds may draw questions; consider
  replacing them with bundled videos you own.
