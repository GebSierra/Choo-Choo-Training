# Owner to-do list

Everything only the owner can do, in one place, so nothing gets lost in the chats. Claude adds to it whenever something
new needs the owner, and ticks items off (or moves them to "Done") once the owner confirms. Newest additions are marked
with the date.

## Set up (accounts and hosting)
- [ ] **Turn on accounts (Supabase), about 10 minutes.** Full guide: docs/BACKEND.md.
  1. Create a free project at supabase.com.
  2. SQL Editor: paste all of `supabase/schema.sql`, press Run.
  3. Authentication settings: Email provider on, email confirmation on, Site URL `https://app.choochootraining.com`, add it
     to Redirect URLs (keep `https://choochootraining.com/` there too for a few weeks), minimum password length 8.
  4. Project Settings > API: send Claude the Project URL and the "anon public" key (never the "service_role" key).
     Claude puts them in js/config.js and releases; from then on sign-in is required (except developer mode).
- [ ] **Google sign-in (optional, 2026-10-08):** console.cloud.google.com > new project > APIs & Services > OAuth consent
  screen (External; app name, support email, authorized domains choochootraining.com and supabase.co) > Credentials >
  Create credentials > OAuth client ID > Web application: Authorized JavaScript origins `https://app.choochootraining.com`,
  Authorized redirect URI = the "Callback URL" shown in Supabase > Authentication > Sign In / Providers > Google. Copy the
  Client ID + Client secret into that Supabase page, turn Google on, save.
- [ ] **Apple sign-in (optional; needs the Apple Developer Program, paid yearly):** developer.apple.com > Certificates,
  IDs & Profiles: an App ID with "Sign in with Apple"; a Services ID (this is the Client ID) with Sign in with Apple
  configured (domain = your Supabase project domain, return URL = the Supabase Apple "Callback URL"); a Key with Sign in
  with Apple (download the .p8, note the Key ID and your Team ID). In Supabase > Providers > Apple: turn on, enter the
  Services ID and the secret generated from the .p8 (Supabase's docs link a generator). The Apple secret expires after
  6 months: renew it then (Claude will remind you).
- [ ] **Your own email sender for Supabase (custom SMTP)** before real families sign up: the built-in sender allows only a
  few emails an hour (sign-up confirmations and password resets).
- [ ] **Check Supabase pricing/limits** on supabase.com (a free project can pause after a stretch without use).

## Move the website to Netlify (owner decision 2026-10-07; LIVE on Netlify 2026-10-07, DNS at Porkbun: ALIAS to apex-loadbalancer.netlify.com, www CNAME to choochootraining.netlify.app)
- [x] 1. netlify.com > Sign up > "Sign up with GitHub" (use the GitHub account that owns Choo-Choo-Training).
- [x] 2. "Add new site" > "Import an existing project" > GitHub > allow access > pick **Choo-Choo-Training**.
- [x] 3. Settings screen: Branch to deploy **main**; Build command **empty**; Publish directory **.** (a single dot).
  (The repo's netlify.toml already says this, so Netlify may fill it in.) Press **Deploy**.
- [x] 4. Wait about a minute, open the address Netlify shows (something.netlify.app) and check the app works.
- [x] 5. Site configuration > Domain management > "Add a domain" > type **choochootraining.com** > Verify > Add domain.
  Netlify will say the domain is registered elsewhere and show the exact records to set. Easiest choice: "Set up Netlify
  DNS" and copy the 4 "name servers" Netlify shows into the place you bought the domain (its "Nameservers" or "DNS"
  page, choose "custom nameservers"). The other choice: keep your registrar's DNS and change the records Netlify lists
  (an A record for the bare domain and a CNAME for www). Use exactly the values Netlify shows.
- [x] 6. Wait (usually under an hour, sometimes up to a day). Netlify then turns on the padlock (HTTPS) by itself;
  check Domain management > HTTPS says it's active.
- [x] 7. Open https://choochootraining.com on your phone and check the app loads (reload once if you see the old one).
- [x] 8. (Done: GitHub Pages unpublished 2026-10-07.) Tell Claude it's done. Claude then turns off GitHub Pages (or you can: GitHub > Choo-Choo-Training > Settings >
  Pages > Unpublish) so only Netlify serves the site. Supabase needs no change (same domain).
- Optional: Site configuration > Build & deploy > Branches > add **claude/kind-lovelace-av8kz3** as a branch deploy,
  so Claude's work-in-progress gets its own preview link you can try before it goes live.

## Domain move: app to app.choochootraining.com, website on choochootraining.com (2026-10-07)
- [x] A. (Details: docs/DOMAIN-MOVE.md.) Porkbun CNAME `app` -> choochootraining.netlify.app; Netlify app project: domain alias app.choochootraining.com
  (works, checked in a private window).
- [x] B. (Done in 1.9.24.) (Claude) Release the switch: the old address moves families to app.… with their progress; the app sets a
  `cct_member` cookie so the website can send app users straight to the app.
- [x] C. (Given 2026-10-07; it is part D of docs/DOMAIN-MOVE.md.) (Claude) Give the owner the exact text for the website chat (old-app cleanup /sw.js, redirect members and old
  links with the handoff, "Log in" + "Start reading" buttons, `?site` lets members see the website).
- [x] D. (DONE 2026-10-07: choochootraining.com = website project choochootrainingwebsite, app.choochootraining.com = app project appchoochootraining; checked by Claude.) **Owner — READY NOW (website confirmed done and tested 2026-10-07; Claude checked its tests and code):** create the
  website's own Netlify project (same repo, Base directory `site`); in the APP project remove choochootraining.com and
  www and make app.choochootraining.com the primary domain; add choochootraining.com + www to the WEBSITE project
  (the Porkbun ALIAS to apex-loadbalancer.netlify.com already points at Netlify). Then check both addresses.
- [ ] E. When accounts are turned on: Supabase Site URL https://app.choochootraining.com (keep the old address in
  Redirect URLs for a few weeks).

- [ ] F. **Porkbun tidy-up (2 minutes, after the Netlify project renames):** the `app` and `www` CNAME records still point
  to the old name `choochootraining.netlify.app` (it works for now because Netlify routes by domain, but the old name could
  be reused later). Edit `app` -> **appchoochootraining.netlify.app** and `www` -> **choochootrainingwebsite.netlify.app**.

## Content and recordings
- [ ] **Record the letter sounds** in the recording studio: https://app.choochootraining.com/tools/studio.html (47 items;
  stops and resumes where you left off). Until a sound is recorded, the app shows a "Say: mmm" prompt for the grown-up.
- [ ] Optional: the heart-word clips ("th" buzzing, the "uh" in "the") and the blend models, also in the studio.
- [ ] Consider a hired voice actor for the sounds before selling.

## Reviews waiting for you (in the app: Grownups > tap the version line 7 times for developer mode)
- [ ] The f lesson in the 8-step loop (the template for every lesson): Grownups > Previews.
- [ ] Heart word "the", Stage 1 sound play, placement check, world gateway: Grownups > Previews.
- [ ] Sunny Hills and Digraph Docks scenery: Developer > Look at a world > W3 / W4.
- [ ] World names (worlds 4 to 11 are placeholders: Digraph Docks, Blend Bay, Endings Junction, Silent E Summit, Vowel
  Team Town, Bossy R Bridge, Sliding Slopes, Tricky Peak).
- [ ] Welcome card page 2 title, and the research wording on it (Harvard / NIH / Department of Education vs. the sources
  actually cited).
- [ ] The storybook intro: the new "read it together" wording did not fit; shorten the card or split it over two screens?

## Before selling (legal and business)
- [ ] Lawyer review: privacy policy and COPPA (children's privacy), including what accounts store (grown-up email + the
  app's progress: the child's first name and character, lesson results).
- [ ] Trademark check on the name "Choo Choo Training".
- [ ] IP check on Smooth Ride and the three tap games.
- [ ] Andika font licence check.
- [ ] Replace the Mentava picture tiles (Claude will prepare the prompt list: roadmap item 7).
- [ ] App store accounts: Apple Developer Program and Google Play Console (store notes in docs/APP-STORE.md).

## Done
- (nothing yet)
