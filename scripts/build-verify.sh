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
#   2. SugarCube's runtime #passages literal is intact (the raw-literal count
#      stays exactly one — authored content compiles escaped, so this sees
#      only the runtime's own element).
#   3. The single-#passages contract: the shell (StoryInterface) authors
#      exactly one #passages — with a custom StoryInterface SugarCube does
#      not append its own, it throws if the shell's is missing — and no
#      authored #story (SugarCube provides #story; a duplicate is fatal).
#   4. The shell rail is present and wired to SugarCube's built-in dialogs
#      (title + Settings / Saves / Restart).
#   5. The checkerboard, shell layout, and shell behavior modules are bundled.
#   6. The story starts on the title-screen passage (the title screen is
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

# --- 2. SugarCube's runtime #passages literal intact ------------------------
# SugarCube's runtime code carries exactly one literal
# <div id="passages" ...> (used when no custom StoryInterface is present);
# it must be intact in the compiled story. An authored #passages compiles
# HTML-escaped (&lt;div id=&quot;passages&quot;), so this raw count alone
# cannot see it — the "exactly one" invariant is the pairing of this
# check with the authored-content count below.
passages_count=$(grep -o '<div id="passages"' "$OUT" | wc -l | tr -d '[:space:]')
if [ "$passages_count" -eq 1 ]; then
  pass "#passages: SugarCube's runtime literal intact (found $passages_count)"
else
  fail "expected exactly one #passages literal, found $passages_count"
fi

# --- 3. Single-#passages contract (custom StoryInterface) -------------------
# With a custom StoryInterface, SugarCube does not append its own #passages —
# the shell must author the story's one and only #passages (SugarCube throws
# if it is missing) and must never author #story (SugarCube provides #story;
# a duplicate is fatal). Authored content lives in the <tw-storydata> block,
# where Tweego HTML-escapes the passage text — an authored
# <div id="passages"> compiles to &lt;div id=&quot;passages&quot;. Unescape
# first, then count.
authored_story=$(sed -n '/<tw-storydata/,/<\/tw-storydata>/p' "$OUT" \
  | sed -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' -e 's/&apos;/'"'"'/g' -e 's/&amp;/\&/g')
if [ -z "$authored_story" ]; then
  fail "could not find <tw-storydata> block in $OUT"
else
  if grep -q '<tw-passagedata pid="[0-9]*" name="StoryInterface"' "$OUT"; then
    pass "StoryInterface passage present"
  else
    fail "StoryInterface passage not found in the story data"
  fi
  if printf '%s\n' "$authored_story" | grep -q 'id="story"'; then
    fail "authored #story element found in the story data"
  else
    pass "no authored #story element"
  fi
  passages_authored=$(printf '%s\n' "$authored_story" | grep -o 'id="passages"' | wc -l | tr -d '[:space:]')
  if [ "$passages_authored" -eq 1 ]; then
    pass "exactly one authored #passages (the shell's)"
  else
    fail "expected exactly one authored #passages (the shell's), found $passages_authored"
  fi
fi

# --- 4. Shell rail present and wired to the built-in dialogs ----------------
# The rail is raw HTML in the StoryInterface (macros are not processed
# there), so the chrome is plain links calling SugarCube's global UI APIs
# inline: Settings / Saves / Restart each open a built-in dialog.
missing=""
for needle in 'class="rail"' 'class="rail-title"' 'class="main"' \
  'onclick="UI.settings();return false;"' 'onclick="UI.saves();return false;"' \
  'onclick="UI.restart();return false;"'; do
  printf '%s\n' "$authored_story" | grep -qF -- "$needle" || missing="$missing $needle"
done
if [ -z "$missing" ]; then
  pass "rail present and wired (title + Settings/Saves/Restart -> UI.* dialogs)"
else
  fail "rail wiring missing:$missing"
fi

# --- 5. Modules bundled ------------------------------------------------------
# Tweego embeds files from src/css and src/js as style-/script- modules
# named after the file name (hyphens become underscores in module ids).
for module in 'style-module-checker' 'script-module-checker_bg' \
  'style-module-shell' 'script-module-shell'; do
  if grep -q "$module" "$OUT"; then
    pass "bundled: $module"
  else
    fail "missing bundled module: $module"
  fi
done

# --- 6. Title screen + start repoint -----------------------------------------
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
