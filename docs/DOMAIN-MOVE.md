# Moving the app to app.choochootraining.com

Why: the main address choochootraining.com is going to the marketing website. The app moves to app.choochootraining.com.
Progress is saved in the browser **per address**, so a family's progress does not follow them automatically. The app has a
small "handoff" (js/handoff.js) that carries it over when someone opens the old address. It stays switched off
(`HANDOFF_LIVE = false` in js/config.js) until the new address works.

Do the parts in this order.

## A. You (owner): set up the new address

1. **Porkbun** (DNS for choochootraining.com) > Add record: Type **CNAME**, Host **app**, Answer **choochootraining.netlify.app**.
   (Use the exact `...netlify.app` name of your app project if it differs.)
2. **Netlify**, the app project > Domain management > **Add domain alias** > `app.choochootraining.com`. Wait until HTTPS
   (the padlock) shows as active; it can take from a few minutes to an hour.
3. Same page: Options on that domain > **Set as primary domain**.
4. Open https://app.choochootraining.com on your phone and check the app loads. Then tell Claude.

## B. Claude: turn the handoff on

Claude releases with `HANDOFF_LIVE = true` (and a version bump). From then on, anyone who opens the old address is moved to
the new one with their progress, and lands on the same screen. Their sign-in (if accounts are on) does not move: they sign
in again once. Keep the old address pointing at the app for a few weeks so every family opens it at least once.

## C. Website goes live on the main address

1. Netlify > Add new site > Import from GitHub > the same repository (Choo-Choo-Training). Set **Base directory** to `site`
   (the marketing website folder). This is a second Netlify project. (Not Vercel: its free plan is non-commercial.)
2. In the **app** project > Domain management, remove `choochootraining.com` and `www.choochootraining.com`. In the **website**
   project add both as domains.
3. DNS: do what Netlify says for the website project. The existing ALIAS record to `apex-loadbalancer.netlify.com` already
   works for Netlify, so the main address may need no change. The `app` CNAME from part A must stay.
4. Do this only when part D is done in the website (see below), and after part B has been live for a few weeks.

## D. What the marketing website must do before it takes the main address (for the website chat)

The old app is installed on families' phones and in browsers, and its service worker keeps answering for the old address
even after the site changes. So the website must:

1. **Serve its own `/sw.js`** that deletes every cache (`caches.keys()` then `caches.delete`), calls
   `self.registration.unregister()` and then reloads the open windows (`clients.matchAll({type:'window'})` then
   `client.navigate(client.url)`). Without it, the old app worker stays installed and keeps showing the app on the main address.
2. **Forward app users, show the website to new visitors.** On load, redirect with `location.replace` to
   https://app.choochootraining.com/ when ANY of these is true: the `cct_member` cookie is present (the app sets
   `cct_member=1; Domain=.choochootraining.com` once a child has started or a grown-up is signed in; no personal data); OR
   `localStorage['reading.v1']` exists on the main address (the old app's progress); OR the hash starts with `#/` (an app
   route) or contains `access_token` (a reset-password link). EXCEPT when the URL has `?site` (lets members look at the
   website). A new visitor (none of these) sees the website. **Run this check before the page paints** (an inline script
   in `<head>`) so there is no flash of the website. The website shows a small header button "Log in" and a main button
   "Start reading", both linking to https://app.choochootraining.com/. Redirect format:
   - Progress, with an optional route: `https://app.choochootraining.com/` + the original query string +
     `#handoff=<base64url JSON>&route=<encoded route>`
     - `<base64url JSON>` = the raw string stored in `reading.v1`, UTF-8 encoded, then base64url (alphabet `A-Z a-z 0-9 - _`,
       no `=` padding). Only if it parses as JSON, is an object with `schema` equal to 1 and a `lessons` object, and is at most
       200 KB. Otherwise do not send progress.
     - `<encoded route>` = the old hash without the leading `#` (for example `/lesson/3`), passed through `encodeURIComponent`.
       Leave out `&route=...` when there was no route.
   - No saved progress but a hash route (or only the cookie): `https://app.choochootraining.com/` + query + the original hash unchanged.
   - A hash with `access_token`, `type=recovery` or `error`: forward the hash unchanged, never a handoff.
   - Never put the data in the query string (it would reach server logs); fragment only. Do not touch `reading.auth`.
   - Example: `https://app.choochootraining.com/#handoff=eyJzY2hlbWEiOjEs...&route=%2Flesson%2F3`
   - The app side (js/handoff.js) decodes, checks, adopts only into a fresh device (or when its copy is newer), removes the
     fragment and opens the route (default `#/home`).
3. **Absolute `og:image` and `og:url`** (full https://choochootraining.com/... addresses) so link previews work.

## The member cookie

The app sets `cct_member=1; Domain=.choochootraining.com; Path=/; Max-Age=31536000; Secure; SameSite=Lax` (js/member.js) while the
child has started (welcome done or a lesson done) or a grown-up is signed in, on choochootraining.com addresses only (never
localhost, netlify.app or the phone apps). Sign out and Delete account clear it (Max-Age=0, same Domain), because they empty the
progress. It is how the website on the main address knows who already uses the app.

## E. Supabase (when accounts are turned on)

Dashboard > Authentication > URL Configuration:
- **Site URL**: `https://app.choochootraining.com`
- **Redirect URLs**: `https://app.choochootraining.com/` and, for a few weeks, the old `https://choochootraining.com/`
  (old reset emails still work: the old address forwards the link to the app address).
Details of the rest are in docs/BACKEND.md.
