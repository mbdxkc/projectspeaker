# projectspeaker devLog

## 2026-11-07 — Split off kansasdeservesbetter.com/speaker/

America Deserves a Speaker began the same morning as `/speaker/` on kansasdeservesbetter.com; its full build history (the record research, the rotor, the representative lookup, the share card, the audit) is in that repo's devLog.md. This repo is the standalone copy, with the page at the root and every address on projectspeaker.org: canonical, og:url, og:image, JSON-LD, sitemap and robots.

Carried over: the page, `rotor.js`, `rep.js`, `reps.json`, the share card, Oswald and its license, the favicon, the studio mark, `tools/petition.py`, `tools/reps.py` and the hourly workflow, each repointed from `speaker/` to the root. Left behind: KDB's results-table styles (`.tally`, `.races`, `.race`), the home-page-only rules and the Marshall photos. `tools/build.sh` was rewritten for one page: it minifies the stylesheet and both scripts and stamps all three. The share card was re-rendered with projectspeaker.org on it.

Checked in Firefox Developer Edition against a local copy: no horizontal overflow at 320, 390, 768, 1280 and 1920; Oswald loaded; "Earmarked." fitted at 55, 68, 134, 191 and 191 px, the same as on KDB; the first rotation at about 10.5 s with headline, caption and link in step; the representative lookup returned Davids (KS-3) and Schmidt (KS-2) and handled a refused location. `tools/petition.py` and `tools/reps.py` ran from their new paths; the petition had passed 1 million (1,010,710) and change.org had raised the goal to 1.5 million, which the script picked up on its own.

The repository was created as speakerproject and renamed projectspeaker to match the domain.

### Mistakes → Rules

- **A rename shows up in the REST API before GitHub's GraphQL index.** `gh repo view mbdxkc/projectspeaker` failed minutes after the rename while `gh api repos/mbdxkc/projectspeaker` resolved. A failed lookup straight after a rename is not proof the name is wrong
- **A chained `check && change` skips the change when the check fails, and the rest of the line still runs.** The failed lookup stopped the folder rename, while a later `;`-separated command started a local server in the wrong directory. Keep the check and the change in separate commands, or separate them with `||` handling that stops everything

## 2026-11-07 (afternoon) — DNS cutover, stalled on GitHub's cache

Squarespace forwarding removed; A records for @ to GitHub Pages' four IPs and a www CNAME to mbdxkc.github.io added around 12:20 p.m. Central. Within minutes all four Squarespace nameservers, and Cloudflare, Google, Quad9, OpenDNS, Level3 and Neustar, returned only GitHub's records, with DNSSEC validating (the AD flag set). GitHub's Pages health check still reported NotServedByPagesError for the apex and InvalidCNAMEError for www, with the certificate stuck at "new." Removing and re-adding the custom domain through the API did not change it.

The custom domain was saved in GitHub at about 12:17, before the Squarespace records changed, on advice given in this session. GitHub's checker resolved the domain then and cached Squarespace's default records, which carried a 4-hour TTL. That cache, not the DNS, is what fails the check; it should expire around 4:20 p.m. Meanwhile http serves the site from GitHub, https shows a certificate warning, and kansasdeservesbetter.com/speaker/ stays the working address.

### Mistakes → Rules

- **Change DNS first, wait for it at every authoritative nameserver, then add the custom domain in GitHub.** GitHub checks the domain the moment it is saved and caches whatever it gets for that record's TTL; remove-and-re-add does not flush it. The order was already written in mBcode/CLAUDE.md and this repo's own cutover steps, and was talked past
- **Leaving a registrar's defaults means inheriting their TTL.** Squarespace's default records were 4 hours; the replacements were 1 hour. Lowering TTLs a day before a planned move is the cheap insurance
- **`dig` without HTTPS-record support answers a `HTTPS` query as if it were an A lookup.** Query `TYPE65` to see HTTPS/SVCB records

## 2026-11-07 (evening) — Live at projectspeaker.org

GitHub's check passed at 4:27 p.m., about when the cached 4-hour records were due to expire: "DNS check successful," Let's Encrypt certificate (CN=projectspeaker.org, expires Feb. 5, 2027) approved, Enforce HTTPS ticked. Verified: http, http-www and https-www 301 to https://projectspeaker.org/, which returns 200 with the right title; `og.png?v=1`, `reps.json` and `rep.min.js` return 200. Then step 6: kansasdeservesbetter dropped `speaker/`, its petition workflow, the speaker CSS and build steps, and repointed its home link here (f588005). This repo's bot is now the only one updating the count.

### Mistakes → Rules

- **A stale GitHub Pages check clears on the cached record's TTL, not on anything done in the UI.** It cleared within minutes of the predicted 4:20 p.m. Predict the expiry from the old TTL and the save time, and wait for it rather than re-saving

## 2026-11-07 (evening) — Own Analytics property, Search Console

New GA4 property Project Speaker, `G-20SJCHR8YG`, replaces Kansas Deserves Better's `G-SFSM1D23NT` in the tag; the Google Ads config line stays. Search Console Domain property verified by a `google-site-verification` TXT record at `@`, added beside `v=spf1 -all` and confirmed at all four Squarespace nameservers before pressing Verify.

### Mistakes → Rules

- **GA4's setup wizard defaults to reusing a tag it finds on the site.** Here that was KDB's, and accepting it would have made Project Speaker a second destination of KDB's tag, mixing both sites' traffic. Pick Install manually and take the `G-` ID from the stream details
- **"Install manually" can show a Tag Manager container snippet (`gtm.js?id=GTM-…`) with no `config` line**, which sends nothing to GA4 on its own. The Measurement ID on the stream details page is the value a gtag.js site needs

## 2026-11-07 (evening) — petition_click key event

Every link to the petition (header, hero button, the hero's change.org text link, the "Demand a real vote" button) now sends `petition_click` with `location` from its `data-cta`. One delegated listener in the Google tag block, so no new script file and no build step. Tested in headless Firefox with GA's hosts mapped to nowhere and navigation held: each link pushed exactly one event with its own location, and a record link pushed none.

### Mistakes → Rules

- **Test an analytics event against `dataLayer`, not against GA.** The push is the page's whole job; reading it in a harness with GA's hosts blocked proves the event without sending test hits to the new property

## 2026-11-07 (night) — Accuracy, SEO, performance and accessibility pass

**Accuracy.**
- **"16 speaker ballots since 2023" was an undercount; it is 20.** It counted January 2023 (15) and January 2025 (1) and missed the four ballots of October 2023 after Kevin McCarthy's removal (clerk roll calls 521, 523, 525, 527). Every Democrat voting on all four chose Jeffries (212, 212, 210, 209; the rest not voting), so the claim gets stronger, not weaker. Fixed in the hero, "Demand a real vote", the meta and og descriptions, both image alts, the JSON-LD and the share card, which was re-rendered and bumped to `og.png?v=2`. The sources line now links the October roll calls
- **"Jan. 3: the full House elects the speaker" stated a schedule nobody has announced.** The 20th Amendment makes Jan. 3 the default "unless they shall by law appoint a different day"; the line now says so, with the amendment and CRS RL30857 ("elect a Speaker by roll call vote upon first convening") as sources
- Item 5's AOL link began 308-redirecting; it now cites The Hill's original, the publisher. The Hill blocks fetchers, so the two quotes were matched on the AOL copy, which names that URL
- Rechecked against FEC (schedule B, AIPAC PAC C00797670, 2025-26): $421,395.99 to the three Jeffries committees, Feb. 27, 2025 to Sept. 23, 2026, unchanged; the $149,300 is two transfers on May 20, 2026 earmarked by one donor, so "one donor, one day" holds. All 26 outbound links resolve (congress.gov returns 403 to fetchers only)

**SEO.** Title "America Deserves a Speaker: Hakeem Jeffries' Record" (51 characters) on the page, og and twitter; description rewritten at 150 characters around the name and the vote. The kicker now leads with "Hakeem Jeffries" and the record's heading reads "Hakeem Jeffries' record". New `#faq`, "The speaker vote, explained": six searched questions (when, how many votes, can a Democrat break ranks, must the speaker be a member, why it matters, what the petition asks), each answered only from a cited source. One JSON-LD graph adds WebPage, a Person node for Jeffries tied to Wikidata Q5640425, Wikipedia and Bioguide, and a FAQPage whose text matches the visible answers exactly (checked by script: six of six). `article:published_time` and `article:modified_time` added.

**Performance.** The stylesheet is now inlined by `tools/build.sh` into `<style id="css">`, and `style.min.css` is gone: it was Lighthouse's only render-blocking request, and on a one-page site no visitor reused it from cache. HTML is 42 KB raw, about 11 KB gzipped. Baseline live mobile scored 98 once (Speed Index 3.9 s) and 100 twice; the slow run had every file loaded by 0.7 s and painted at 2.5 s, a headless stall rather than the page. Local after the pass: 100 in all four categories, mobile and desktop, on repeat runs. Live after deploy (d224ef4), GA and Ads blocked: desktop 100 in every category on three runs; mobile accessibility, best practices and SEO 100 on six runs, performance 100 on four and 98 on two, the 98s again showing every request done by 0.6 s and first paint at 2.5 s, the same rate as before the change. Reports and a summary went to the Desktop (Project Speaker Lighthouse 2026-11-07).

**Accessibility and code.** Lighthouse accessibility 100 before and after; the FAQ uses real h3 headings under its own h2, so the outline stays h1, then h2 for each section. Tested in Firefox at 320 to 1920: no horizontal scroll, inline CSS and Oswald applied, every petition link (now five, with `data-cta="faq"`) sends one `petition_click` with its own location, and the rotor swaps on schedule. `rotor.js` assumed a six-item record ("item 0" + n would print "010" at item 10); it now pads to two digits, and the stale 1-6 comments in it and the page say N.

### Mistakes → Rules

- **Count the events, not the elections, before writing "N ballots since."** A mid-term speaker vacancy produces ballots that a count built from opening days never sees. The clerk's XML for the whole span, filtered on "Election of the Speaker", is the count
- **An undercount is still an error, even when it helps the other side.** "16" made the claim weaker than the record and would have handed a critic a free correction on a page whose case is that every number is checked
- **A build that rewrites a delimited block must refuse when the delimiter appears more than once.** The new inline-CSS step matched `<style id="css">` inside the header comment that described it and deleted everything from there to the real `</style>`: the viewport, title, canonical and every meta tag. Caught before commit because the next check parsed `<title>`. The build now demands exactly one occurrence at the start of a line, and the comment describes the element without quoting the tag
- **Verify the head after any build step that writes into index.html.** Title, viewport, canonical and JSON-LD parse is a five-line check, and it is the one that caught the deletion
- **A date given by a constitutional default is not a schedule.** Write "Jan. 3, unless Congress sets another day by law" until a date is announced
- **One slow Lighthouse run is a sample, not a regression.** Read the network table first: when every request finished long before first paint, the stall is in the harness. Judge on three runs

## 2026-11-07 (night) — Icons, 404, self-switching rep lookup

- **The favicon was Kansas Deserves Better's "K".** The split copied `favicon.svg` and nobody looked at it again; every tab and bookmark for projectspeaker.org showed another site's mark. New icon: Oswald Bold "S" in Capitol gold on House navy, outlined from the font by `tools/icons.py`, which also renders the 180 px Apple touch icon and a 512 px PNG. Proven to reproduce the committed files exactly
- **404.html:** branded not-found page with "Read the record" and the petition. Root-absolute URLs and inline CSS because Pages serves it at any depth; noindex
- **The rep lookup now follows the member list across Jan. 3.** `reps.json` carries `"congress"` (119 now, computed from term end dates), and `rep.js` picks the geocoder vintage holding that Congress's lines. When congress-legislators publishes the 120th Congress, the lookup moves to the redrawn 120th lines on the same hourly run. Before this, the page would have paired new members with old lines in every redrawn state until someone edited the vintage by hand. The Republican note no longer says "Jan. 3"; it says "when the new Congress convenes"

### Mistakes → Rules

- **A split copies every file, including the ones that carry the old identity.** Favicon, share card, header text and footer were all checked at the split except the 200-byte SVG in every browser tab. After cloning a site into a new brand, open every image asset, however small
- **Key a scheduled switch to the data it depends on, not to a calendar date.** The lookup must change lines when the member list changes, and Congress can legally convene on a day other than Jan. 3. Reading the Congress number off the member list makes the two impossible to mismatch

## 2026-11-07 (night) — Spanish edition, record item 9

**Spanish edition, `/es/`.** The full page translated: hero and its ten rotating lines, the call section, all nine record items, the ask, the FAQ and the footer, with the paid-for line repeated in English. FAQPage JSON-LD generated from the same list as the visible answers. The machinery was made bilingual rather than forked: the build inlines CSS and stamps scripts on both pages, the count bot writes a Spanish line, `rotor.js` reads its labels from data attributes, and `rep.js` carries an en/es string table chosen by `<html lang>`. Tested in Firefox: no horizontal scroll from 320 to 1920 on either page, Spanish labels after rotation and on pause, every petition link firing with its location, and the lookup in Spanish for KS-3, KS-2 (Republican note), D.C. (delegate note) and London.

**Record item 9, from FEC schedule A.** Anduril's CEO $100,000 and co-founder/COO $44,300 to Jeffries' joint committees in 2026, and a Palantir manager $44,300 in 2025: $188,600, matching Sludge's figures to the dollar once the memo allocations to the campaign are left out. The note carries the counterweight: most of his campaign's individual money ($8.1M of $12.7M) came in gifts of $200 or less. The Atlantic "bend the knee" quote stays off: the original returns 403 here and the archive route was refused, so it waits for a read in a browser.

The ledger is now odd-numbered, so the last item spans both columns at 900 px and up instead of leaving an empty cell filled with the rule colour.

### Mistakes → Rules

- **A conduit's memo rows are not more money.** FEC schedule A lists a joint committee's allocation to the campaign as memo line-12 entries under the original donor; adding them to the joint-committee receipt double-counts. Total only non-memo receipts
- **Make shared scripts multilingual before translating the page.** A copied `rep.js` for Spanish would have been a second file to keep in sync with every fix; one file with a string table and two copies of the markup is the smaller cost
- **Re-derive any size calibrated to a word when the word changes.** The headline pre-size divides by the first line's measured width; the Spanish word is 1.5% wider and would have overflowed the column for a frame
- **Contract Spanish prepositions when composing strings.** "de" + "el distrito" is "del distrito"; a string table that concatenates parts needs the rule written into the function
