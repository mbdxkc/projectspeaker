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
