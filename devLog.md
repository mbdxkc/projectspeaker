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
