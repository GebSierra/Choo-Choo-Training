# Polish pass "next level" (owner request 2026-10-07)

Owner: "take a look at things from onboarding forward, all the first impression stuff especially, the grown-ups menu,
organization and appearance, the appearance of the tools and how the app looks when the child is practicing ... spruce
things up. Take it to the next level. Maybe add some details also to this initial world. Just a few and sharpen up some
of the looks." Owner: implement without asking, then report the decisions.

Planned by Opus from a screenshot audit of 1.9.24 (390x844). Built by two Sonnet builders in parallel (A and B below);
each appends its CSS in its own marked block in css/app.css to keep merges easy.

## What the audit found
- **Welcome card (4 pages):** a plain white card with small, dense text and a big empty gap under the text on pages
  1 to 3; the same Pip picture on every page; nothing that feels like a train adventure. The words are the owner's and
  stay exactly as they are (page 2's research wording is waiting for the owner's review: do not change it).
- **Character creator:** cramped; the hair and clothes rows are cut off at the right edge with no sign they scroll;
  the small figure top-left is easy to miss; "Name (the grown-up types it)" reads awkwardly.
- **Lesson overview:** the optional "Alphabet song" card sits above the lesson itself and steals the first look; the
  step cards are a side-scrolling row cut off at the edge.
- **Practice screens:** a solid, consistent frame (dark navy, coloured card, "Say this" bar, Again/Next), but large flat
  empty areas inside the coloured cards (Letter Review, Sound Story, Word Cars, Ticket Check) and little texture.
- **Finish screen:** a beige page with a big letter and the two figures; no sense of celebration.
- **Grownups:** "Reset all progress" (destructive) sits near the top inside the Lessons card; sections are a long flat
  list with little visual hierarchy; Progress is collapsed so the most useful summary is hidden; the "Your child" card
  carries a privacy note ("never sent anywhere"), which breaks the owner's no-privacy-warnings rule and is no longer
  true once accounts sync.
- **Starter Station (world 1):** pleasant but sparse between stations.

## Builder A: first impressions + Grownups
1. **Welcome card:** a richer card: a soft illustrated header band per page (page 1: Pip waving from the engine with a
   puff of steam; page 2: a little stack of books and a star; page 3: a speech bubble with "mmm"; page 4: the word
   "mom" with letters), larger and friendlier headline, comfortable text size and line length, the empty gap removed
   (the card hugs its content, buttons stay at the bottom), progress dots styled as tiny train wagons, a gentle slide
   between pages (CSS transform/opacity only; reduced motion: none). Exact owner text kept. Fits 360x640, 390x844,
   915x412.
2. **Character creator:** a big live preview of the child's figure at the top (updates as choices change), the choice
   rows as clearly scrollable chips with a fade at the edge (or wrapped grid), section labels clearer, name label
   "Child's first name". Keep every option and the data model.
3. **Grownups reorganized:** a header card with the child's figure, name and a one-line summary ("Lesson 5 of 13 ·
   Starter Station · 1 gold star"); Progress open by default; then sections in this order with small icons: Lessons,
   Your child, Sound and voice, Pace, Account, Help and the thinking behind the app (reference folds), Developer (only in
   developer mode), Previews (only in developer mode — they are prototypes), and a quiet "Reset all progress" at the very
   bottom in a separate "Start over" card with its existing confirm. Remove the privacy sentence under the name. Keep
   every existing control, the hold gate, and the 7-tap version line.
4. Tests: update assertions that depend on order/text deliberately (say which), add checks for the new order, the reset
   card at the bottom, Previews hidden unless developer mode, fit at the three sizes.

## Builder B: practice look + finish + Starter Station details
1. **Lesson overview:** the lesson's steps first (bigger "Start lesson"), the Alphabet song as a small optional row
   below; the step row shows that it scrolls (peek + fade) or becomes a tidy vertical list on tall screens.
2. **Practice screens (shared frame, all tasks):** subtle texture/pattern on the coloured task card (inline SVG or CSS
   gradients, no images), a soft inner glow, better vertical balance so content sits centred instead of floating at the
   top with empty space; consistent card radius/shadows; the "Say this" bar and buttons unchanged in behaviour.
3. **Finish screen:** a celebration: the earned letter on a ticket/wagon, a short confetti burst and a star (CSS,
   finite, reduced motion: static), the two figures cheering, warmer background; same buttons and judge logic.
4. **Starter Station details (3D, static, cheap):** a few charming touches only: bunting/pennant flags between
   station roofs, a couple of lamp posts along the platform side, a small duck pond with two ducks, a bench and a
   mailbox at the first station, flower beds near the start. Instanced/merged meshes, ≤ 8 extra draw calls, nothing
   animated (the idle ticker is not built yet), never covering station signs. W2–W4 unchanged.
5. Tests: train/worlds/regions draw-call and idle budgets stay green; add checks for the new finish celebration and
   overview order; screenshots.

## Rules for both
Phone voice never says letter sounds; no privacy/recording warnings; never change YouTube links; don't touch the jingle
cut-off; neutral wording; heat rule (CSS transform/opacity loops allowed, no rAF loops while idle); 48 px targets; fit at
360x640, 390x844, 915x412; owner's welcome text unchanged; new files in sw.js APP_FILES; no version bump (Claude bumps at
release). Screenshots before/after into docs/screenshots/polish/.
