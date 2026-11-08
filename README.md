# projectspeaker

**America Deserves a Speaker.** The sourced case for a contested House speaker election in January 2027, backing the change.org petition "House Democrats: CHOOSE A NEW SPEAKER." Every claim links to its source.

https://projectspeaker.org

**by mediaBrilliance.io**

---

## Structure

```
/
├── index.html        # The page
├── es/index.html     # The same page in Spanish; every edit to one is an edit to both
├── style.css         # Mobile first (source; built inline into index.html)
├── rotor.js          # Rotating hero headline (source; the page loads rotor.min.js)
├── rep.js            # "Find my representative" (source; the page loads rep.min.js)
├── totop.js          # Back-to-top arrow (source; the page loads totop.min.js)
├── band.js           # The parade (band, crowd, banners) and the Play/Pause button (source; band.min.js)
├── reps.json         # Every House seat and its member, built hourly by tools/reps.py
├── og.png            # Share card, rendered from tools/og.html
├── 404.html          # Not-found page (root-absolute paths, inline styles)
├── favicon.svg, apple-touch-icon.png, icon-512.png  # Built by tools/icons.py
├── fonts/            # Oswald (SIL OFL), latin subset, self-hosted
├── images/           # Studio mark
├── robots.txt, sitemap.xml
├── tools/            # build.sh, petition.py, reps.py, icons.py, og.html (not published)
├── campaign/         # Ad, social, email and text copy (not published)
├── .github/          # workflows/petition.yml: hourly count and member list
└── _config.yml       # Keeps internal files off GitHub Pages
```

## The page

- **The record:** nine items, each with its source and his own explanation. Money comes from FEC filings, votes from clerk.house.gov, quotes from the outlet that published them.
- **The hero rotates.** Ten headlines, each with a caption and a link to the record item behind it, change together every 6 seconds. "Earmarked." opens every cycle and holds 10 seconds on first load; the rest follow in random order. A Pause button, hover and keyboard focus stop it, and it stays still under reduced motion. To add or change a headline, edit the matching line in both the headline list and the caption list in `index.html`; the two lists must stay in the same order.
- **Call your representative:** "Find my representative" asks for the visitor's location once, gets the congressional district from the U.S. Census Bureau's geocoder and looks the seat up in `reps.json`. The button becomes "Call Rep. Name," dialing the member's Washington office, with what to say. The Capitol switchboard and house.gov's address lookup are always on the page.
- **The signature count updates itself.** `.github/workflows/petition.yml` runs `tools/petition.py` and `tools/reps.py` every hour. The count line between `<!-- petition:start -->` and `<!-- petition:end -->` is rewritten only when the count changes, and the goal follows change.org. Never edit the count by hand.
- **The speaker vote, explained:** six sourced answers to what people search before the vote (when, how many votes, can members break ranks), mirrored in FAQPage structured data.
- **Spanish edition** at `/es/`, linked under the kicker on both pages, with hreflang alternates. The count, the rotor and the rep lookup all run in Spanish there.
- **Marching band:** an SVG band, drumline and all, parades behind the header text once per visit, 3-20 seconds in, different every load (stragglers, missteps, sometimes a very serious trombonist). It is silent; the synthesized march and drumline are switched off in the code. A Play/Pause button sits right of "Sign the petition"; Pause also holds the rotating headlines.
- **Look:** House navy, Capitol gold and Democratic blue under the header carried over from Kansas Deserves Better.

## Build

Edit `style.css`, `rotor.js`, `rep.js`, `totop.js` or `band.js`, then run `tools/build.sh`. It minifies the stylesheet into the `<style id="css">` block in `index.html` (one request fewer before first paint) and minifies the scripts, stamping each script URL with its file's hash. `tools/build.sh --check` changes nothing and exits 1 when a build is stale. Requires `cleancss` and `terser`.

## Deploy

GitHub Pages from `main`. The petition bot pushes to `main` hourly, so `git pull --rebase` before every push. Custom domain https://projectspeaker.org, HTTPS enforced since Nov. 7, 2026.

---

Copyright © 2026 mediaBrilliance. All rights reserved. See LICENSE.
