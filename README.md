# Reading (KDDash)

A personal reading app for one child: three letter sounds (m, a, s), taught the Mentava way, in Reading.com's lesson shape. Static files, no build step, no runtime dependencies.

Private personal build. Contains material from Mentava and Reading.com. Not for publication or sale without their permission.

## Run locally

    python3 -m http.server 8080
    # open http://localhost:8080/

## Test

    node test/check-content.mjs
    node test/smoke.mjs
