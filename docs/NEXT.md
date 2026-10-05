# Queued owner requests (not yet planned or built)

Recorded while the usage limit was hit. Plan with Opus, build with Sonnet.

1. Smooth Ride: keep as it is. No sound-form matching for now. (kept as is)
2. Storybook look (planned in PLAN-v1.8 Phase C): tapping a story stop opens a real-looking book (cover opens, paper pages,
   page-curl turns by swipe or tap, gutter shadow). Keep every interactive part of the reader.
   Nothing animates while idle (heat). Reduced motion: cross-fade.
3. (done in v1.8.0) App name: "Choo Choo Training" (replaces "Pip's Reading Train" everywhere: manifest, title,
   welcome card, docs, tests).
4. Music:
   - Plays on app open (after the first tap, because browsers block audio before a tap),
     on the railway home, while browsing letters, and while choosing an activity.
   - Never plays during an exercise. Fade out when an exercise opens, fade back in on return.
   - Theme loop plus short stings (startup, transition, success) that share one motif,
     built on the toot whistle interval (G5 to E5, sol-mi).
   - Soft volume so the parent can talk over it. Obeys the existing sound/mute setting.
   - Audio files will come from the owner (generated elsewhere) as MP3 or OGG; precache them
     and watch total size. Synthesized placeholder until then is optional.
5. Still open from v1.7: Story 2 text approval, character creator. The new sound order is done (v1.8.1).
