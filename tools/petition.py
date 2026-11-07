#!/usr/bin/env python3
"""Writes the change.org signature count into index.html.

WHO RUNS IT
    .github/workflows/petition.yml, hourly, on GitHub's servers. It can also be
    run by hand from the repo root: python3 tools/petition.py

WHAT IT DOES
    1. Downloads the petition page.
    2. Reads the count and goal from the data change.org embeds in it:
       "signatureCount":{"displayed":N,"total":N,"goal":G}
       "displayed" is the number change.org shows its own visitors, so this
       page always matches it. Reading the goal too means the line follows
       change.org when it raises the goal (to 1.5 million, say).
    3. Replaces the text between <!-- petition:start --> and
       <!-- petition:end --> in index.html with, for example:
       "979,807 signatures toward 1 million as of 2:28 a.m. Central, Nov. 7, 2026."

WHEN IT DOES NOTHING
    If the count has not changed since the last run, the file is left alone,
    so the workflow has nothing to commit and the site does not redeploy.

WHEN IT FAILS
    It exits with an error, and the workflow run fails, if change.org changes
    its page so the count cannot be found, or if the markers are missing from
    the page. Failing loudly is deliberate: the alternative is a stale number
    sitting on the page looking current. GitHub emails the repo owner when a
    scheduled run fails.

STYLE
    Times and dates are AP style: "2:28 a.m. Central, Nov. 7, 2026," "3 a.m.," "noon."
"""
import datetime
import re
import sys
import urllib.request
import zoneinfo

URL = "https://www.change.org/p/house-democrats-choose-a-new-speaker"
PAGE = "index.html"

# change.org serves the full page to an ordinary browser; a bare script
# user agent risks being treated as a bot.
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"

# The count lives between these two comments in index.html.
SPAN = re.compile(r"(<!-- petition:start -->)(.*?)(<!-- petition:end -->)", re.S)

# AP abbreviates months of six or more letters when they come with a date
# (Aug. 13, Sept. 3) and spells out March, April, May, June and July.
AP_MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June",
             "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]


def millions(n):
    """Goal in words, AP style: 1000000 -> '1 million', 1500000 -> '1.5 million'."""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}".rstrip("0").rstrip(".") + " million"
    return f"{n:,}"


def ap_time(t):
    """Clock time in AP style: '2:28 a.m.', '3 a.m.' (no :00), 'noon', 'midnight'."""
    if t.hour == 12 and t.minute == 0:
        return "noon"
    if t.hour == 0 and t.minute == 0:
        return "midnight"
    clock = t.strftime("%-I") if t.minute == 0 else t.strftime("%-I:%M")
    return clock + (" a.m." if t.hour < 12 else " p.m.")


# 1. Download the petition page.
req = urllib.request.Request(URL, headers={"User-Agent": UA})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

# 2. Read the count and goal.
m = re.search(r'"signatureCount":\{"displayed":(\d+),"total":\d+,"goal":(\d+)\}', html)
if not m:
    sys.exit("signatureCount not found on the petition page")
count, goal = int(m.group(1)), int(m.group(2))

# 3. Find the current line on our page; stop if the count has not moved.
page = open(PAGE).read()
old = SPAN.search(page)
if not old:
    sys.exit(f"petition markers missing from {PAGE}")
if f"{count:,} signatures" in old.group(2):
    print(f"unchanged {count:,}")
    sys.exit(0)

# 4. Write the new line, stamped with the time it was read, in Kansas time.
now = datetime.datetime.now(zoneinfo.ZoneInfo("America/Chicago"))
text = (f"{count:,} signatures toward {millions(goal)} as of {ap_time(now)} Central, "
        f"{AP_MONTHS[now.month - 1]} {now.day}, {now.year}.")
page = page[:old.start(2)] + text + page[old.end(2):]
open(PAGE, "w").write(page)
print("wrote", text)
