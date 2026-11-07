#!/usr/bin/env python3
"""Writes reps.json: every current House seat and the member in it.

WHO RUNS IT
    .github/workflows/petition.yml, hourly, beside tools/petition.py. By hand:
    python3 tools/reps.py from the repo root.

WHERE THE DATA COMES FROM
    unitedstates/congress-legislators, legislators-current.json: the public,
    volunteer-maintained list of sitting members, used widely by newsrooms and
    civic apps. That file is 1.5 MB with full term histories; the page needs
    only name, party, Washington phone and website per seat, about 43 KB.

WHAT IT WRITES
    {"updated": "2026-09-24", "seats": {"KS-3": {"n": "Sharice Davids",
     "p": "Democrat", "ph": "202-225-2865", "u": "https://davids.house.gov"}}}
    Keys are postal code and district number. At-large seats, the D.C.
    delegate and the territories' delegates use district 0, the same way the
    source does. A seat missing from "seats" is vacant.
    "updated" is the source file's Last-Modified date, which the page shows
    so a visitor can see how current the list is.

WHEN IT DOES NOTHING
    The output is written with sorted keys and fixed separators, so an
    unchanged source produces a byte-identical file and the workflow commits
    nothing.

WHEN IT FAILS
    It exits with an error if the download fails or the result looks wrong
    (fewer than 400 seats), and leaves the old file in place. A short or
    broken list must never replace a good one.
"""
import email.utils
import json
import sys
import urllib.request

SOURCE = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
OUT = "reps.json"

resp = urllib.request.urlopen(SOURCE, timeout=60)
members = json.load(resp)
modified = resp.headers.get("Last-Modified")
updated = email.utils.parsedate_to_datetime(modified).date().isoformat() if modified else None

seats = {}
for m in members:
    term = m["terms"][-1]           # the current term is the last one
    if term["type"] != "rep":       # skip senators
        continue
    key = f"{term['state']}-{term.get('district', 0)}"
    name = m["name"].get("official_full") or f"{m['name']['first']} {m['name']['last']}"
    seats[key] = {"n": name, "p": term["party"], "ph": term.get("phone"), "u": term.get("url")}

if len(seats) < 400:
    sys.exit(f"only {len(seats)} House seats in the source; refusing to overwrite {OUT}")

with open(OUT, "w") as f:
    json.dump({"updated": updated, "seats": seats}, f, sort_keys=True, separators=(",", ":"))
    f.write("\n")
print(f"wrote {OUT}: {len(seats)} seats, source updated {updated}")
