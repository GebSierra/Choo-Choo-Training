# Owner to-do list

Everything only the owner can do, in one place, so nothing gets lost in the chats. Claude adds to it whenever something
new needs the owner, and ticks items off (or moves them to "Done") once the owner confirms. Newest additions are marked
with the date.

## Set up (accounts and hosting)
- [ ] **Turn on accounts (Supabase), about 10 minutes.** Full guide: docs/BACKEND.md.
  1. Create a free project at supabase.com.
  2. SQL Editor: paste all of `supabase/schema.sql`, press Run.
  3. Authentication settings: Email provider on, email confirmation on, Site URL `https://choochootraining.com`, add it
     to Redirect URLs, minimum password length 8.
  4. Project Settings > API: send Claude the Project URL and the "anon public" key (never the "service_role" key).
     Claude puts them in js/config.js and releases; from then on sign-in is required (except developer mode).
- [ ] **Your own email sender for Supabase (custom SMTP)** before real families sign up: the built-in sender allows only a
  few emails an hour (sign-up confirmations and password resets).
- [ ] **Check Supabase pricing/limits** on supabase.com (a free project can pause after a stretch without use).

## Content and recordings
- [ ] **Record the letter sounds** in the recording studio: https://choochootraining.com/tools/studio.html (47 items;
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
