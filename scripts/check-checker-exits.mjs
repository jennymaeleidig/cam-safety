#!/usr/bin/env node
/* ===== Guard: a [checker] passage's exits live in a content macro =====
   Stage mode hides a [checker] passage's own #passages content
   (shell.twee / stage.css), so a bare [[link]] in its text is invisible to
   the player. Every exit must be rendered by <<player_line>> (the reply bar)
   or <<cam_line>> (the speech-bubble), which fill stage slots during render.
   Nothing in SugarCube reports the difference; this guard does.

   Run it manually — it is not part of the build and adds no dependency:

     node scripts/check-checker-exits.mjs src/story.twee

   It prints one line per offending passage and exits 1; a clean story prints
   an OK line and exits 0. [title] passages are skipped: they render in shell
   mode, where #passages is visible and bare links work.

   The scan is textual, not a twee parser: it skips [[...]] inside
   <<cam_line>> / <<player_line>> invocations, and it does not try to
   understand comments. */

import { readFileSync } from "node:fs";

const CONTENT_MACROS = new Set(["cam_line", "player_line"]);
const HEADER = /^::\s+([^\[]+?)\s*(?:\[([^\]]*)\])?\s*(?:\{.*\})?\s*$/;

const file = process.argv[2] ?? "src/story.twee";

function passages(text) {
  const out = [];
  let current = null;

  text.split(/\r?\n/).forEach((line, index) => {
    const header = HEADER.exec(line);

    if (header) {
      current = {
        name: header[1].trim(),
        tags: (header[2] ?? "").trim().split(/\s+/).filter(Boolean),
        body: [],
        line: index + 1,
      };
      out.push(current);
      return;
    }

    if (current) {
      current.body.push({ line: index + 1, text: line });
    }
  });

  return out;
}

/* Walk one passage body, returning the [[...]] occurrences that are not
   inside a content macro. A macro can span lines, so state persists across
   them; quoted arguments are skipped so a >> inside one cannot end it. */
function bareLinks(body) {
  const hits = [];
  let inContentMacro = false;
  let quote = null;

  for (const { line, text } of body) {
    let i = 0;

    while (i < text.length) {
      const ch = text[i];

      if (inContentMacro) {
        if (quote) {
          if (ch === "\\") {
            i += 2;
          } else {
            if (ch === quote) {
              quote = null;
            }
            i += 1;
          }
        } else if (ch === '"' || ch === "'") {
          quote = ch;
          i += 1;
        } else if (ch === ">" && text[i + 1] === ">") {
          inContentMacro = false;
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }

      if (ch === "<" && text[i + 1] === "<") {
        const macro = /^<<\s*([A-Za-z_]\w*)/.exec(text.slice(i));

        if (macro && CONTENT_MACROS.has(macro[1])) {
          inContentMacro = true;
        }

        i += 2;
        continue;
      }

      if (ch === "[" && text[i + 1] === "[") {
        hits.push({ line, text: text.trim() });
        i += 2;
        continue;
      }

      i += 1;
    }
  }

  return hits;
}

const findings = [];

for (const passage of passages(readFileSync(file, "utf8"))) {
  if (!passage.tags.includes("checker")) {
    continue;
  }
  if (passage.tags.includes("title")) {
    continue; // shell mode: #passages is visible
  }

  for (const hit of bareLinks(passage.body)) {
    findings.push({
      file,
      line: hit.line,
      passage: passage.name,
      text: hit.text,
    });
  }
}

if (findings.length === 0) {
  console.log(`OK: no bare [[...]] links in [checker] passages (${file})`);
  process.exit(0);
}

for (const finding of findings) {
  console.error(
    `${finding.file}:${finding.line} — [${finding.passage}] — ${finding.text}`,
  );
}

console.error(
  `\n${findings.length} bare link(s) in [checker] passages. Move each exit into <<player_line>> or <<cam_line>>; stage mode hides #passages.`,
);
process.exit(1);
