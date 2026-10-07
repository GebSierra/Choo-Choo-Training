# Accounts and sync: setup for the owner

The app has grown-up accounts (email + password) and saves the child's progress to a small cloud database, so it follows the
family from phone to phone and survives a lost phone. It uses Supabase. Nothing happens until you do steps 1 to 4: while
`js/config.js` is empty the app runs exactly as before, with no sign-in screen.

## Set up (about 15 minutes)

1. **Create a project.** Sign up at supabase.com (free plan is fine to start), choose New project, pick a name and a region
   near your users, set a database password (save it in your password manager; the app never needs it).
2. **Create the table and the delete function.** Supabase dashboard > SQL Editor > New query. Paste the whole of
   `supabase/schema.sql` from this repo and press Run. It is safe to run again.
3. **Auth settings** (dashboard > Authentication):
   - Sign In / Providers: **Email** on. Leave every other provider (Google, Apple, ...) off.
   - Email confirmation ("Confirm email"): **recommended on**. The app handles both. With it on, "Create account" shows a
     "Check your email" card and the grown-up signs in after tapping the link.
   - URL Configuration: **Site URL** `https://choochootraining.com`. **Redirect URLs**: add `https://choochootraining.com/`
     (and `http://localhost:8080/` if you test locally).
   - Password: minimum length 8 or more (the app asks for at least 8).
   - Optional: write your own wording in Authentication > Emails (confirm signup, reset password). Keep the default links.
     Supabase's built-in email sender is rate limited and meant for testing; before real families use it, set up your own
     SMTP sender (Authentication > SMTP Settings).
4. **Put two values in the app.** Dashboard > Project Settings > API: copy the **Project URL** and the **anon public** key
   into `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). The anon key is designed to be public; the row-level security
   rules in `schema.sql` are what protect the data. Never put the `service_role` key anywhere in this repo.
5. Commit and deploy as usual. Bump the version and `CACHE_VERSION` in `sw.js` so installed copies pick up the new files.

## How it behaves

- **Sign-in is required** on a device with no session, except in developer mode (7 taps within 3 seconds on the version line at
  the bottom of the sign-in screen; the same switch as in Grownups). The sign-in screen is meant for the grown-up.
- **Sign up, sign in, forgot password.** The reset email link opens the app itself (`https://choochootraining.com/#access_token=...&type=recovery`),
  which shows a "Choose a new password" form, then asks the grown-up to sign in. On the phone apps the link opens in the
  browser at choochootraining.com; the grown-up sets the password there and returns to the app to sign in. (No deep link
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
- Sign in with Apple is only required when an app offers other third-party social logins. The app has none (email + password
  only). VERIFY against the current App Store guidelines before submitting.

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

- Test hook: on `localhost` / `127.0.0.1` only, `window.__config = { url, key }` set before the page loads overrides `js/config.js`
  (used by `test/account.mjs`, which fakes every Supabase endpoint with Playwright route interception; no real network).
- Code: `js/account.js` (session, calls, sync), `js/screens/signin.js` (screen), `js/components/account-card.js` (Grownups
  section), `js/store.js` (`authStore`, `savedAt`, `subscribe`, `isFresh`, `adopt`, `clearLocal`).
- Endpoints used: `/auth/v1/signup`, `/auth/v1/token?grant_type=password`, `/auth/v1/token?grant_type=refresh_token`,
  `/auth/v1/recover`, `/auth/v1/user` (PUT, reset), `/auth/v1/logout`, `/rest/v1/progress`, `/rest/v1/rpc/delete_my_account`.
