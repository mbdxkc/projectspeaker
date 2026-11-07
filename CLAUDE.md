# projectspeaker/CLAUDE.md
> America Deserves a Speaker (Project Speaker): the sourced case for a contested House speaker election, January 2027
> Deploy: GitHub Pages from `main` (mbdxkc/projectspeaker), https://projectspeaker.org (DNS cutover pending, see Deploy)

Split off kansasdeservesbetter.com/speaker/ on Nov. 7, 2026. The history before the split is in that repo's devLog.md and CLAUDE.md; this file carries every rule that still applies.

## Deploy

- GitHub Pages from `main`, root folder. Until DNS moves, the site also answers at https://mbdxkc.github.io/projectspeaker/ (relative paths work at both)
- **Cutover, in this order** (the CNAME rule from mBcode/CLAUDE.md: a CNAME ahead of DNS takes the site dark):
  1. Squarespace Domains → projectspeaker.org → Website: delete the two Domain forwarding rules (`@` and `www`)
  2. DNS Settings → Custom records: A `@` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153; CNAME `www` → mbdxkc.github.io. Keep the Email Security records (SPF `-all`, DMARC reject)
  3. Check every GitHub Pages IP answers at the authoritative nameservers (`dig @nse1.squarespacedns.com projectspeaker.org`)
  4. Add a `CNAME` file containing `projectspeaker.org` and push; set the custom domain in Settings → Pages
  5. Wait for the certificate, tick **Enforce HTTPS**, then `curl -sI` http and https, with and without www: expect 301s to https://projectspeaker.org/ and a 200
  6. In kansasdeservesbetter: remove `speaker/`, its workflow steps and build entries; replace the home page link with https://projectspeaker.org/ (no automatic redirect; that repo forbids them)
- Two hourly workflows run until step 6: this repo's and kansasdeservesbetter's. Both are harmless; each keeps its own copy current
- Analytics: the same GA4 (`G-SFSM1D23NT`) and Google Ads (`AW-18498605429`) tags as Kansas Deserves Better; reports split by hostname. Ads final URLs can use projectspeaker.org once it serves the site directly

## The page

- Added 2026-11-07: **Project Speaker**, headline "Earmarked." (Nov. 7; "Open the gavel" retired, and "No gavel for AIPAC" declined as overstating donors' earmarks as AIPAC control), backing the change.org petition "House Democrats: CHOOSE A NEW SPEAKER" (Nicole Whitted). projectspeaker.org is the canonical address. Until the DNS cutover (see Deploy) it still forwards (302) to kansasdeservesbetter.com/speaker/, the original copy. 302 on purpose: a 301 is cached by browsers, which would strand returning visitors if Project Speaker later moves to its own repo at projectspeaker.org. Saving the `@` rule deleted the Squarespace Defaults; the Email Security records (SPF `-all`, DMARC reject) stay, so the domain cannot be spoofed for mail. Canonical, og:url and the sitemap stay on kansasdeservesbetter.com/speaker/. Google Ads final URLs must use kansasdeservesbetter.com, not the forwarding domain
- The shared header reads **America Deserves a Speaker** (Valdez, Nov. 7; also the page title and og:site_name) on this page only (text change in `index.html`; the mark links to `#top`). Below 430px the nav link shows "Sign" (" the petition" is visually hidden, not removed, so the accessible name still contains the visible text), because the full label overflowed 320-360px screens by 4-44px
- Colours are scoped to `body.speaker main` and the footer (House navy `#0d1b33`, Capitol gold `#d8b86a`, Democratic blue `#1f4fbf` buttons); the shared header keeps the site's black and sunflower. `tools/build.sh` builds and stamps the stylesheet and both scripts
- **Hero rotor** (`rotor.js`, explained in its comments; the page loads `rotor.min.js`, which `tools/build.sh` builds with terser and stamps, so run the build after any edit): ten headlines in `#rotor` and ten captions in `#rotor-cap`, paired by position, so add, remove or reorder them in both lists together. Each headline's `data-ref` is its record item (1-6 → `#item-N`, 0 → `#act`). Every headline and caption restates an item in the record and may not claim anything the record does not. "Earmarked." stays first and holds 10 s on first load (`CONFIG.firstHold`); the rest shuffle. 6-second interval, .5s fade (`CONFIG.fade` must match the CSS transition). Line 1 is pre-sized in CSS at `min(100cqi / 5.4, 2.5em)` (Oswald 700 "EARMARKED." is about 5.3 em wide), within 2-4 px of the fitted size; if line 1 ever changes, re-derive the 5.4. Both exist for Lighthouse Speed Index: a headline that changes at 6 s or doubles in size after the font loads scored mobile performance 94 (Speed Index 6.7 s); with both, 100 (1.1 s)
- **Call your representative** (`#call`, Nov. 7): `rep.js` geolocates on tap only, gets the district from the Census geocoder as JSONP (it sends no CORS headers) with `vintage=ACS2025_Current`, which returns **119th** districts; `Current_Current` returns the 2026 (120th) lines, which do not match today's members in redrawn states. Seat → member comes from `reps.json`, built hourly by `tools/reps.py` from congress-legislators (`district` 0 = at-large, D.C. and territories). Tested: KS-3 Davids, KS-2 Schmidt (Republican note), D.C. Norton (delegate note: no floor vote, caucus voting rights unverified so not claimed), London (no district), location refused. `.speaker [hidden]` carries `!important` because `.cta` sets display
- **SEO:** Article JSON-LD (publisher `#org`, part of `#site`, about Hakeem Jeffries) inline in the head; meta description held under 160 characters; og and twitter titles read "America Deserves a Speaker." kansasdeservesbetter.com's home page links here (in that repo's `tools/index.template.html`)
- **Share card:** `og.png` from `tools/og.html` (render command in its header). Its lines restate record item 1, so re-render if that figure changes, and bump `?v=` on `og:image` and `twitter:image`, since social sites cache by URL
- **The signature count updates itself.** `.github/workflows/petition.yml` runs `tools/petition.py` hourly; it rewrites the text between `<!-- petition:start -->` and `<!-- petition:end -->` only when the count moves, reading the goal too, and commits as github-actions[bot]. Pull before every local push. Never hand-edit the count
- **Record items 7-8 (Nov. 7):** Medicare for All: cosponsor of H.R. 1384 (joined Sept. 6, 2019) and original cosponsor of H.R. 1976 (March 17, 2021), not of H.R. 3421 (introduced May 17, 2023), per GPO BILLSTATUS XML on govinfo (congress.gov and GovTrack block fetchers; the page links congress.gov for readers); his "I haven't cosponsored..." is from "Meet the Press" via Newsweek, dated only "August 2026" because no source states the day. GENIUS Act, S. 1582, roll call 200, July 17, 2025: 308-122, Democrats 110 no, 102 yes, Jeffries yes; no explanation from him found, and the note says so and asks for one
- **Leads not verified, kept off the page:** "There will never be a moment where I bend the knee to hard-left democratic socialism" (The Atlantic, 2021, per The Week and others; the original was not read); Sludge (Nov. 4, 2026) on $144,300 from Anduril's CEO and COO and $44,300 from a Palantir manager to his committees (paywalled; check FEC schedule A when the API allows); 2025-26 campaign totals through Oct. 14 (fec.gov): $17.9M receipts, $12.7M from individuals ($8.1M unitemized), $2.77M from other committees. The last cuts against a "bought" framing: small donors are his largest source
- **From the petition, fact-checked Nov. 7:** speaker is next in line after the vice president (3 U.S.C. § 19, govinfo); in all 16 speaker ballots since 2023 (15 in Jan. 2023, one Jan. 3, 2025) no Democrat voted for anyone but Jeffries (clerk XML; Trone did not vote on 2023 roll call 15). Caucus nominee vote **Nov. 18** is reported by ABC News and Bloomberg Government ("two people familiar"); Fox News said mid-December. Keep the attribution and the conflict until the caucus announces a date. The petition's own lines ("not the right choice," "establishment," "dark money") are opinion and stay hers
- Record rules (below): FEC for money (AIPAC figures are donors' earmarks through AIPAC PAC, C00797670, not the PAC's own funds; the two joint committees also fund the DCCC and other members), clerk.house.gov for votes, his own explanation beside each item. No individual donor names. Massie amendment (roll call 243, July 15, 2026): Democrats split 103 yes, 98 no, 10 present, so never "most Democrats voted for it"

## Record rules

Every line here is read by people looking for an error.

- **Every claim links to its source.** Roll calls to senate.gov or clerk.house.gov, money to fec.gov, quotes to the outlet that published them. Verify against the primary page before adding; agent or memory research is a lead, not a source
- Include his walk-backs and his office's explanations where the source carries them. It is what makes the rest hold
- Agent or memory research is a lead, not a source. Verify against the primary page before adding anything

## Clean voice

- **No profanity anywhere served:** page, CSS, share card, file names. Google Ads rejects it and requires the shown domain to match the landing page
- **Never add an automatic redirect** on this site (meta refresh, JS or server). A forwarding landing page reads as a bridge page
- **"Paid for by Valdez Campos."** stays in the footer while the site is an ad destination, beside "Not authorized by any candidate or candidate's committee"

## Build

- `tools/build.sh` minifies `style.css`, `rotor.js` and `rep.js` and stamps each URL in `index.html` with the built file's hash (`--check` changes nothing and exits 1 when stale). An unbuilt source edit ships as a no-op
- Only the Google tag and the JSON-LD stay inline
- Pull before every push: the petition bot commits to `main` hourly
- AP style: no Oxford comma, abbreviated months with dates, hyphenated ranges
