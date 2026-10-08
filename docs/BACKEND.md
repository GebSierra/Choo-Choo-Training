# Accounts and sync: setup for the owner

The app has grown-up accounts (email + password) and saves the child's progress to a small cloud database, so it follows the
family from phone to phone and survives a lost phone. It uses Supabase. Nothing happens until you do steps 1 to 4: while
`js/config.js` is empty the app runs exactly as before, with no sign-in screen.

## Status: live (2026-10-08)

The Supabase project exists and `js/config.js` points at it: `https://nwlfjqcynfoyjnepiuze.supabase.co` with the **publishable**
key `sb_publishable_...` (Supabase's new name for the anon key; it is not a JWT). Both values are public by design and live in
the repo; row-level security protects the data. The **secret key** (and the old `service_role` key) must never be shared, pasted
into a chat or committed. Switched on in the dashboard: **Email** sign-in, **Google** sign-in, and **Resend** as the custom SMTP
sender. **Apple sign-in is deferred** until the Apple Developer Program is joined (steps stay in docs/OWNER-TODO.md); add
`'apple'` to `OAUTH_PROVIDERS` and a button then.

With the new key format, the app sends the key in the `apikey` header only. `Authorization: Bearer <token>` is sent only when
there is a signed-in user (the user's access token, which PostgREST needs). An old-style anon JWT works the same way.

## Set up (about 15 minutes)

1. **Create a project.** Sign up at supabase.com (free plan is fine to start), choose New project, pick a name and a region
   near your users, set a database password (save it in your password manager; the app never needs it).
2. **Create the table and the delete function.** Supabase dashboard > SQL Editor > New query. Paste the whole of
   `supabase/schema.sql` from this repo and press Run. It is safe to run again.
3. **Auth settings** (dashboard > Authentication):
   - Sign In / Providers: **Email** on. **Google** on (Client ID and secret from Google Cloud; the Google redirect URI is the
     Supabase callback URL). Apple stays off for now.
   - Email confirmation ("Confirm email"): **recommended on**. The app handles both. With it on, "Create account" shows a
     "Check your email" card and the grown-up signs in after tapping the link.
   - URL Configuration: **Site URL** `https://app.choochootraining.com`. **Redirect URLs**: add `https://app.choochootraining.com/`
     and keep the old `https://choochootraining.com/` for a few weeks (old reset emails; the old address forwards them to the app address), plus
     `http://localhost:8080/` if you test locally. Google sign-in returns to `https://app.choochootraining.com/`, so that
     address must be in the list.
   - Password: minimum length 8 or more (the app asks for at least 8).
   - Optional: write your own wording in Authentication > Emails (confirm signup, reset password). Keep the default links.
     Supabase's built-in email sender is rate limited and meant for testing; before real families use it, set up your own
     SMTP sender (Authentication > SMTP Settings).
4. **Put two values in the app.** Dashboard > Project Settings > API: copy the **Project URL** and the **anon public** key
   into `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`; the new dashboards call it the publishable key). It is designed to be public; the row-level security
   rules in `schema.sql` are what protect the data. Never put the `service_role` key anywhere in this repo.
5. Commit and deploy as usual. Bump the version and `CACHE_VERSION` in `sw.js` so installed copies pick up the new files.

## Welcome email

Every new grown-up gets a welcome email from "Choo Choo Training <hello@choochootraining.com>", including people who sign
in with Google (Supabase sends them no confirmation email). It all runs inside Supabase; the app is not involved and no
version change is needed. How it works: a database trigger on `auth.users` fires when an account is created already
confirmed (Google) or when an email sign-up confirms (the grown-up taps the link in the confirmation email). It calls
Resend's HTTP API through Supabase's `pg_net` extension, using a Resend API key kept in Supabase Vault, and records the
user in `public.welcome_sent` so nobody is welcomed twice. Any problem (no key, no email address, Resend unreachable) is
skipped quietly and never blocks sign-up.

Owner steps (about 5 minutes):

1. **Resend key.** resend.com > API Keys > Create API Key, permission "Sending access", domain choochootraining.com. (You may
   reuse the key already used for Supabase SMTP instead.) Copy it; it starts with `re_` and is shown only once.
2. **Store it in Supabase Vault, once.** Supabase > SQL Editor > New query, paste this with your real key, Run, then close the
   tab without saving the query (so the key is not kept in a saved snippet):

   ```sql
   select vault.create_secret('re_YOUR_KEY_HERE', 'resend_api_key');
   ```

   To replace the key later, run `select vault.update_secret(id, 're_NEW_KEY') from vault.secrets where name = 'resend_api_key';`.
   The key is never in this repo.
3. **Run the setup.** New query, paste the whole of `supabase/welcome-email.sql`, Run. It is safe to run again.
4. **Test.** Create a new account (email: confirm from the email, then the welcome arrives; or "Continue with Google" with a
   Google account that has not signed in before: the welcome arrives right away). If nothing arrives in a few minutes, look
   in Resend > Emails (a row with a status shows whether Resend got the request; no row means the trigger skipped it, most
   often because the Vault key is missing or named differently), and check the spam folder. Supabase > Database > Extensions
   should show `pg_net` enabled.
5. **Change the wording.** The subject, HTML and plain text are inside `supabase/welcome-email.sql` (the HTML is also kept
   in `docs/emails/welcome.html`, which you can open in a browser to preview). Edit the SQL, paste it in the SQL Editor and
   Run again; it replaces the function. Keep the HTML and the plain-text version saying the same thing.

Notes:

- People who already have an account (including you) do not get one retroactively. To send one to yourself (optional), run
  this with your own email (it does nothing if you were already welcomed; to resend, first run
  `delete from public.welcome_sent where user_id = (select id from auth.users where email = 'you@example.com');`):

  ```sql
  select public.send_welcome_email((select id from auth.users where email = 'you@example.com'));
  ```

- `public.welcome_sent` has row-level security on and no policies, so the app cannot read it. The two functions cannot be
  called from the app either (execute is revoked from the public, signed-out and signed-in roles).
- Replies go to hello@choochootraining.com's inbox, so make sure that address is read by someone (set it up at your email host).
- The email sends one message per new account; Resend's free plan has daily and monthly sending limits (check resend.com/pricing).

## How it behaves

- **Continue with Google.** The sign-in screen shows a Google button (above the email form, with an "or use your email" divider)
  for every provider in `OAUTH_PROVIDERS` (js/config.js). Tapping it makes a PKCE code verifier (random, base64url) and its
  S256 challenge, keeps the verifier (`reading.pkce`, through js/store.js), and goes to
  `SUPABASE_URL/auth/v1/authorize?provider=google&redirect_to=<SITE_URL>&code_challenge=...&code_challenge_method=s256`.
  Back at the app with `?code=...`, boot (before the sign-in gate) trades it at `/auth/v1/token?grant_type=pkce` for a session,
  saves it exactly like a password sign-in (then the normal sync rules), and removes `code` from the address bar. An
  `error` / `error_description` in the query or hash shows "Google sign-in didn't finish. Please try again." (an expired
  reset link keeps its own wording). The older implicit return (`#access_token=...&refresh_token=...` without
  `type=recovery`) is also accepted. Google accounts show "Signed in with Google" in Grownups > Account and have no password.

- **Sign-in is required** on a device with no session, except in developer mode (7 taps within 3 seconds on the version line at
  the bottom of the sign-in screen; the same switch as in Grownups). The sign-in screen is meant for the grown-up.
- **Sign up, sign in, forgot password.** The reset email link opens the app itself (`https://app.choochootraining.com/#access_token=...&type=recovery`),
  which shows a "Choose a new password" form, then asks the grown-up to sign in. On the phone apps the link opens in the
  browser at app.choochootraining.com; the grown-up sets the password there and returns to the app to sign in. (No deep link
  setup is needed for this.)
- **Local first.** Progress is always saved on the device first (`reading.v1`). The session is saved under a separate key,
  `reading.auth`. When signed in and online, a change is pushed about 2 seconds after the last one. Offline changes are
  pushed when the connection returns, and when the app is next opened.
- **Conflicts.** Every save carries a `savedAt` time. The copy with the later `savedAt` wins. Exceptions: a device with no
  progress (no lesson done and the welcome not finished) always takes the cloud copy; and if the cloud is empty, the
  first device to sign in uploads what it has.
- **Sign out** first uploads the latest progress, then clears the progress from that device, so the next person does not see
  it. If the upload is not possible (offline), sign out stops and offers "Sign out anyway", which erases the unsynced progress.
- **Delete account** (Grownups > Account, type DELETE) calls the `delete_my_account` function, which removes the progress row
  and the login, then clears the device. This is the in-app account deletion Apple requires (guideline 5.1.1(v)) and Google
  Play asks for as well.
- If a session can no longer be renewed (password changed elsewhere, long time away), the app shows the sign-in screen again.
  Progress on the device is kept and merged by the rules above after the next sign-in.
- The service worker never caches or touches calls to Supabase (network only). The only server the app contacts is the one in
  `js/config.js`; `test/platform.mjs` checks the files for any other address.

## What is stored

In Supabase Auth: the grown-up's **email address** and a salted password hash (Supabase handles the password; the app never
stores it). In the `progress` table, one row per account: the app's **progress JSON**, which includes lesson results and
dates, settings, and the **child's first name and chosen character** (as typed in Grownups > Your child). No analytics, ads or
tracking. Nothing else leaves the device.

## Cost

Supabase has a free plan that is enough for a launch with few families, and paid plans for more. Limits and prices change:
check current pricing and limits on supabase.com/pricing before you rely on them. A free project can be paused after a period
of no use, which would make sign-in fail until it is restored; a paid plan avoids that. Watch the dashboard's usage page.
Each account is one small row (a few KB).

## Store requirements this covers

- Account deletion inside the app (Apple 5.1.1(v), Google Play account deletion policy): done (Grownups > Account > Delete
  account). Google Play also asks for a web page where a person can request deletion; **TODO** when listing: use a page that
  tells them to open the app, or add an email address for requests.
- Sign in with Apple is generally required when an app offers other third-party social logins, and the app now offers Google.
  Apple sign-in is deferred until the Apple Developer Program; **it must be added before an iOS submission** (or Google removed
  on iOS). VERIFY against the current App Store guidelines.

## TODO before real families use it (owner / lawyer)

- **Privacy policy.** Both stores require one, and a children's app that collects an email and a child's name raises COPPA
  (US) and similar rules (GDPR-K and others). **A lawyer should review** the privacy policy, what the sign-in flow says to
  the grown-up, and whether the Kids Category / Families policies allow this design. This document does not claim legal
  compliance. docs/APP-STORE.md keeps the privacy policy outside the app UI; some store reviewers want a link inside the app
  near sign-in: VERIFY current rules, and if needed add a small link on the sign-in screen (not built; owner rule: no
  privacy warnings in the UI).
- Decide whether to turn on email confirmation (recommended) and set up a custom SMTP sender.
- Later ideas, not built: several children per account, subscriptions, an account recovery page for Google Play's deletion form.

## For developers

- Test hooks, on `localhost` / `127.0.0.1` only (production ignores them): accounts are **off by default** there, even though
  `js/config.js` is filled in, so every test suite and local session runs without the sign-in gate. Turn them on with
  `window.__config = { url, key, providers }` set before the page loads (a fake project; used by `test/account.mjs`, which fakes
  every Supabase endpoint with Playwright route interception; no real network), or open the app with `?accounts=1` to use the
  real `js/config.js` values.
- Code: `js/account.js` (session, calls, sync), `js/screens/signin.js` (screen), `js/components/account-card.js` (Grownups
  section), `js/store.js` (`authStore`, `savedAt`, `subscribe`, `isFresh`, `adopt`, `clearLocal`).
- Endpoints used: `/auth/v1/authorize` (a page navigation), `/auth/v1/token?grant_type=pkce`, `/auth/v1/user` (GET, implicit return), `/auth/v1/signup`, `/auth/v1/token?grant_type=password`, `/auth/v1/token?grant_type=refresh_token`,
  `/auth/v1/recover`, `/auth/v1/user` (PUT, reset), `/auth/v1/logout`, `/rest/v1/progress`, `/rest/v1/rpc/delete_my_account`.
