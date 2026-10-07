# Domain move: website on choochootraining.com, app on app.choochootraining.com

The owner decided this in `WEBSITE-PLAN.md`. Do the steps in order, so that the app never goes offline.

## Short version

**The app does not move any files.** It keeps the repo root on `main`, and GitHub Pages keeps serving it. The app
switches to its own address, `app.choochootraining.com`. The marketing website (`site/`) is deployed on Vercel and takes
over `choochootraining.com`.

## Step 1. App session (on `main`)

1. `CNAME`: change the contents from `choochootraining.com` to `app.choochootraining.com`.
2. `js/config.js`: `SITE_URL = 'https://app.choochootraining.com/'`. Sign-up, confirm and password-reset emails link
   here, and so does the native app's reset link.
3. Bump the app version and `CACHE_VERSION` in `sw.js`, as for any release.
4. Update the docs that name the old address:
   - `README.md`: the live URL, the studio at `https://app.choochootraining.com/tools/studio.html`, and the CNAME note
     ("keep it" now means keep `app.choochootraining.com`)
   - `docs/BACKEND.md`: Site URL and Redirect URLs, plus the reset-link example
   - `docs/NEXT.md`: the live URL
5. Nothing else needs to change. The app uses relative paths throughout: the manifest `start_url` and `scope` are
   `./`, the service worker is registered as `sw.js`, and there are no absolute links.
6. Merge and deploy steps 1–4 together, in a single release.

## Step 2. Owner: DNS, Supabase, GitHub (about 15 minutes)

Do this right after step 1 is merged.

1. **DNS** at the domain registrar: add a `CNAME` record from `app` to `gebsierra.github.io`.
2. **GitHub**: repo Settings > Pages > Custom domain should read `app.choochootraining.com`. The CNAME file sets it.
   Wait for the certificate, then tick **Enforce HTTPS**.
3. **Supabase**: Authentication > URL Configuration:
   - set **Site URL** to `https://app.choochootraining.com`
   - add `https://app.choochootraining.com/` to **Redirect URLs**
   - keep the old `https://choochootraining.com/` there for a few weeks, so emails already sent still work
4. Check that the app opens, signs in and resets a password at `https://app.choochootraining.com/`.

## Step 3. Marketing session (on `claude/choochoo-marketing-chat-mjzg8m`)

Do this before the website goes live.

1. `site/main.js`: `APP_URL = "https://app.choochootraining.com/"`.
2. **Forward old app links.** Installed home-screen icons open `/index.html#/home`, and old emails open
   `/#access_token=...`. The website forwards any visit with a `#/...` route or an `access_token` in the address to
   the same path and hash on `app.choochootraining.com`.
3. **Retire the old service worker.** Phones that used the app at `choochootraining.com` still have its service worker,
   and it would keep showing the cached app instead of the website. Browsers keep an old worker when its update
   returns 404. So the website serves its own `/sw.js` that clears the caches, unregisters itself and reloads the page.
4. Make `og:image` an absolute URL (`https://choochootraining.com/assets/og.jpg`) and add `og:url`.

## Step 4. Owner: Vercel and the main domain

1. Vercel: import the GitHub repo, set **Root Directory** to `site`, **Framework** to Other, and leave the build
   command empty.
2. Choose the production branch: either the marketing branch, or `main` once `site/` has been merged there.
3. Add the domains `choochootraining.com` and `www.choochootraining.com` in Vercel.
4. DNS:
   - set the apex `A` record to the value Vercel shows (today `76.76.21.21`)
   - delete the four GitHub Pages `A` records (`185.199.108.153`, `.109`, `.110`, `.111`)
   - point `www` to Vercel as it says
   - leave the `app` record alone
5. Turn on Web Analytics in the Vercel project.

## What families notice

- **Signed-in families:** their progress comes back from the cloud when they sign in at the new address.
- **Progress saved only on the phone:** this stays with the old address (browser storage is tied to the address), so it
  does not carry over. This only affects devices that were never signed in, such as developer mode.
- **Home-screen icons:** old icons still work, because the website forwards them (step 3.2). Families can re-add the app
  from `app.choochootraining.com` whenever they like.
- **Native app:** its files are bundled, so nothing changes apart from the reset link (step 1.2).
