# 3D models kept for later (not loaded by the app)

Uploaded by the owner on 2026-10-06 "to keep within GitHub to be used if they ever come in handy". Nothing in the app
loads these files and they are not in the service worker precache, so they cost the child's phone nothing.

| Folder | Files | Source and licence |
| --- | --- | --- |
| trains/ | quaternius_cc0-*.glb (high-speed train, locomotives, cargo train front, train) | Quaternius, CC0 (public domain): free to use, no credit required |
| trains/ | dammafra-arrow-4207.glb | Unknown author ("dammafra"); check the licence before shipping it |
| track/ | track-straight, track-tunnel-straight, track-viaduct-straight, track-gradient-ramp tiles (4 x 4 units) | Unknown source; check the licence before shipping |

Notes for a builder:
- The track tiles are Draco-compressed (KHR_draco_mesh_compression): loading them needs three.js GLTFLoader plus
  DRACOLoader and its decoder files vendored under vendor/ (no CDN at runtime). The Quaternius trains are plain glTF.
- The current railway is built from code (js/train/*.js) and passes the heat checks (no idle frames). Any model swapped
  in must keep that: load once, no animation loop while idle, and keep the total precache well under 8 MB.
