#!/usr/bin/env bash
# ============================================================================
#   projectspeaker.org
#   Build: minify the stylesheet and both scripts, stamp their URLs
# ============================================================================
#   @file       tools/build.sh
#   @author     mediaBrilliance digitalxtudio
#   @updated    2026-11-07
# ============================================================================
#
#   index.html loads style.min.css, rotor.min.js and rep.min.js. An edit to
#   style.css, rotor.js or rep.js ships as a no-op until this runs: the site
#   looks unchanged and nothing errors.
#
#   Each built file's URL carries the first 8 hex of its SHA-256 as ?v=.
#   GitHub Pages lets a browser reuse a file for 10 minutes, so an unstamped
#   file can pair new HTML with an old stylesheet or script.
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

# stamp <file>: point index.html at <file>?v=<hash of the built file>
stamp() {
  local file="$1" re hash
  re="${file//./\\.}"
  hash="$(shasum -a 256 "$tmp/$file" | cut -c1-8)"
  if grep -q "\"$re?v=$hash\"" index.html; then
    :
  elif (( CHECK )); then
    echo "stale  index.html ($file stamp)"; stale=1
  else
    sed -i '' -E "s#\"$re(\\?v=[0-9a-f]+)?\"#\"$file?v=$hash\"#" index.html
    grep -q "\"$re?v=$hash\"" index.html || { echo "error: no $file reference in index.html" >&2; exit 1; }
    echo "stamp  index.html -> $file?v=$hash"
  fi
}

build style.css style.min.css; stamp style.min.css
build rotor.js rotor.min.js;   stamp rotor.min.js
build rep.js rep.min.js;       stamp rep.min.js

if (( stale )); then
  echo "Build is out of date. Run tools/build.sh" >&2
  exit 1
fi
