#!/usr/bin/env bash
# Build-verify gate for the flock-cam-twine story.
#
# Usage: ./scripts/build-verify.sh
#
# Throwaway scaffolding guarding the shell work (tickets 02-03);
# removed in ticket 04. It runs the existing Tweego build and asserts
# the external invariants of the compiled story that hold today
# (see the centered-rail-shell spec, "Testing Decisions"):
#   1. The build succeeds.
#   2. The compiled story has exactly one #passages element — the one
#      SugarCube appends to #main at runtime.
#   3. No authored #story or #passages element — SugarCube provides #story
#      and the single #passages; authored duplicates are fatal.
#   4. The checkerboard stylesheet and background script are bundled.
#   5. The story starts on the title-screen passage (the title screen is
#      present in the story data and the startnode points at it).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="dist/story.html"
FAILURES=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

# --- 1. Existing Tweego build ---------------------------------------------
# Same invocation as the "tweego: build" task in .vscode/tasks.json.
if TWEEGO_PATH=.storyformats tweego \
    -f sugarcube-2 \
    -m src/css \
    -m src/js \
    -o "$OUT" \
    src; then
  pass "build succeeds"
else
  fail "build fails (tweego exited non-zero)"
  exit 1 # assertions below need the artifact; a failed build is itself a failure
fi

# --- 2. Exactly one #passages ----------------------------------------------
# SugarCube's runtime code appends exactly one literal
# <div id="passages" ...> (the element #passages) to #main; that one must
# be intact in the compiled story. Note: an authored duplicate compiles
# HTML-escaped (&lt;div id=&quot;passages&quot;), so this raw count alone
# cannot see it — the "exactly one" invariant is the pairing of this
# check (SugarCube's element present) with the authored-content scan below.
passages_count=$(grep -o '<div id="passages"' "$OUT" | wc -l | tr -d '[:space:]')
if [ "$passages_count" -eq 1 ]; then
  pass "#passages: SugarCube's runtime element intact (found $passages_count)"
else
  fail "expected exactly one #passages, found $passages_count"
fi

# --- 3. No authored #story / #passages --------------------------------------
# Authored content lives in the <tw-storydata> block, where Tweego
# HTML-escapes the passage text — an authored <div id="story"> compiles to
# &lt;div id=&quot;story&quot;. Unescape first, then assert the authored
# content carries neither a #story element (SugarCube provides #story; a
# duplicate is fatal) nor a #passages element (which must stay singular).
authored_story=$(sed -n '/<tw-storydata/,/<\/tw-storydata>/p' "$OUT" \
  | sed -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' -e 's/&apos;/'"'"'/g' -e 's/&amp;/\&/g')
if [ -z "$authored_story" ]; then
  fail "could not find <tw-storydata> block in $OUT"
else
  if printf '%s\n' "$authored_story" | grep -q 'id="story"'; then
    fail "authored #story element found in the story data"
  else
    pass "no authored #story element"
  fi
  if printf '%s\n' "$authored_story" | grep -q 'id="passages"'; then
    fail "authored #passages element found in the story data"
  else
    pass "no authored #passages element"
  fi
fi

# --- 4. Checkerboard modules bundled ----------------------------------------
# Tweego embeds files from src/css and src/js as style-/script- modules
# named after the file name (hyphens become underscores in module ids).
for module in 'style-module-checker' 'script-module-checker_bg'; do
  if grep -q "$module" "$OUT"; then
    pass "bundled: $module"
  else
    fail "missing bundled module: $module"
  fi
done

# --- 5. Title screen + start repoint -----------------------------------------
# The title-screen passage (a normal, wiki-processed passage) must be present
# in the story data, and the story's startnode must be that passage's pid —
# opening the compiled story must land on the title screen.
title_screen='Title'
title_pid=$(grep -o "<tw-passagedata pid=\"[0-9]*\" name=\"${title_screen}\"" "$OUT" \
  | grep -o 'pid="[0-9]*"' | head -1 | tr -dc '0-9')
startnode=$(grep -o '<tw-storydata[^>]*' "$OUT" | grep -o 'startnode="[0-9]*"' | head -1 | tr -dc '0-9')
if [ -n "$title_pid" ]; then
  pass "title-screen passage present (pid $title_pid)"
else
  fail "title-screen passage \"$title_screen\" not found in the story data"
fi
if [ -n "$startnode" ] && [ "$startnode" = "$title_pid" ]; then
  pass "story start is the title screen (startnode $startnode)"
else
  fail "story start is not the title screen (startnode ${startnode:-missing}, title pid ${title_pid:-missing})"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "build-verify: all checks passed"
  exit 0
else
  echo "build-verify: $FAILURES check(s) failed"
  exit 1
fi
