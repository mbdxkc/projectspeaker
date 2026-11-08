#!/usr/bin/env bash
# ============================================================================
#   projectspeaker.org
#   Build: inline the minified stylesheet, minify the scripts, stamp them
# ============================================================================
#   @file       tools/build.sh
#   @author     mediaBrilliance digitalxtudio
#   @updated    2026-11-07
# ============================================================================
#
#   index.html and es/index.html (the Spanish edition) each carry the
#   minified stylesheet inline, in <style id="css">, and load rotor.min.js,
#   rep.min.js, totop.min.js and band.min.js (es/ through ../). An edit to style.css, rotor.js or
#   rep.js, totop.js or band.js ships as a no-op until this runs: the site looks unchanged and
#   nothing errors.
#
#   Why inline: the page is one screen of HTML that almost every visitor
#   loads once, so a separate stylesheet bought no cache reuse and cost one
#   render-blocking request (Lighthouse's only render-blocking item). Inline,
#   the first paint needs nothing but the HTML. About 2.5 KB gzipped.
#
#   Each script URL carries the first 8 hex of its SHA-256 as ?v=. GitHub
#   Pages lets a browser reuse a file for 10 minutes, so an unstamped script
#   can pair new HTML with an old script.
#
#   USAGE
#     tools/build.sh           build and report
#     tools/build.sh --check   change nothing; exit 1 if anything is stale
#
#   REQUIRES  cleancss  (brew install clean-css-cli)
#             terser    (npm install -g terser)
#
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

for tool in cleancss terser; do
  command -v "$tool" >/dev/null 2>&1 || { echo "error: $tool not found (see REQUIRES above)" >&2; exit 1; }
done

PAGES="index.html es/index.html"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stale=0

# build <source> <output>: minify into $tmp, then report ok / stale / built
build() {
  local src="$1" out="$2"
  case "$src" in
    *.css) cleancss -O1 -o "$tmp/$out" "$src" ;;
    *.js)  terser "$src" -c -m --comments false -o "$tmp/$out" ;;
  esac
  if [[ -f "$out" ]] && cmp -s "$tmp/$out" "$out"; then
    echo "ok     $out"
  elif (( CHECK )); then
    echo "stale  $out"; stale=1
  else
    cp "$tmp/$out" "$out"; echo "built  $out ($(wc -c < "$out" | tr -d ' ') bytes)"
  fi
}

# inline_css: minify style.css into $tmp and write it between <style id="css">
# and </style> in each page. Python does the swap because minified CSS is
# full of characters sed would treat as syntax.
inline_css() {
  cleancss -O1 -o "$tmp/style.min.css" style.css
  local rc=0
  python3 - "$tmp/style.min.css" "$CHECK" $PAGES <<'PY' || rc=$?
import re, sys
css = open(sys.argv[1]).read().strip()
check = sys.argv[2] == "1"
stale = False
for path in sys.argv[3:]:
  page = open(path).read()
  # Exactly one opening tag, on its own line. A comment that quotes the tag
  # once matched first and the swap deleted everything from that comment to
  # the real </style>: the viewport, title and every meta tag (Nov. 7, 2026).
  if page.count('<style id="css">') != 1:
    sys.exit(f'error: {path} must contain <style id="css"> exactly once')
  m = re.search(r'^  <style id="css">(.*?)</style>$', page, re.S | re.M)
  if not m:
    sys.exit(f'error: <style id="css"> must open a line in {path}')
  if m.group(1) == css:
    print(f"ok     {path} (inline CSS)")
  elif check:
    print(f"stale  {path} (inline CSS)")
    stale = True
  else:
    open(path, "w").write(page[:m.start(1)] + css + page[m.end(1):])
    print(f"inline {path} <- style.css ({len(css)} bytes)")
if stale:
  sys.exit(3)
PY
  if (( rc == 3 )); then stale=1; elif (( rc )); then exit "$rc"; fi
}

# stamp <file>: point each page at <file>?v=<hash of the built file>. The
# Spanish page writes the same URL with a leading ../, kept as it is.
stamp() {
  local file="$1" re hash page
  re="${file//./\\.}"
  hash="$(shasum -a 256 "$tmp/$file" | cut -c1-8)"
  for page in $PAGES; do
    if grep -qE "\"(\.\./)?$re\?v=$hash\"" "$page"; then
      :
    elif (( CHECK )); then
      echo "stale  $page ($file stamp)"; stale=1
    else
      sed -i '' -E "s#\"((\.\./)?)$re(\\?v=[0-9a-f]+)?\"#\"\1$file?v=$hash\"#" "$page"
      grep -qE "\"(\.\./)?$re\?v=$hash\"" "$page" || { echo "error: no $file reference in $page" >&2; exit 1; }
      echo "stamp  $page -> $file?v=$hash"
    fi
  done
}

inline_css
build rotor.js rotor.min.js;   stamp rotor.min.js
build rep.js rep.min.js;       stamp rep.min.js
build totop.js totop.min.js;   stamp totop.min.js
build band.js band.min.js;     stamp band.min.js

if (( stale )); then
  echo "Build is out of date. Run tools/build.sh" >&2
  exit 1
fi
