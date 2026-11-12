# Cam's line is revealed and voiced; the reply arrives whole

Cam's speech-bubble is revealed one character at a time, with one animalese
letter per character. The player's reply bar is not: it arrives whole, on the
same frame that Cam's line finishes. Links are never revealed character by
character and never sounded — a link arrives in one step, the moment its first
character would have appeared, and is inert while a line is still being
revealed.

The asymmetry is the decision. The story has one speaking character and one
writing one; typing both slots at once reads as two people talking over each
other, and typing the reply reads as the story putting words in the player's
mouth at Cam's pace. What the player reads in the reply bar is their own
choice, so it appears at once, when it is their turn.

## Why the numbers are these

Tuned by ear on the built story, in a throwaway prototype that carried every
knob on a panel (see `docs/research/animalese-typewriter.md` and its §7
addendum): 16 ms per character, pitch 0.8, volume 0.25, a 10.5 ms fade on each
letter, one compressor on the summed letters, sequential order, and a held
reply. The investigation that led there — what animalese is, what
SugarCube's built-in `<<type>>` does — is recorded in that research file rather
than here; this record holds the outcome.

`<<type>>` is not used. It was measured, not assumed: `NodeTyper` wikifies up
front and defers to `:passageend`, which has already fired by the time the
stage writes a slot, so calling it from the flush renders an empty
`div.macro-type` into the bubble. The reveal instead grows the text nodes the
flush has just wikified, which keeps every link bound and clickable.

Rejected, each measured: typing both slots (reads as two speakers); hiding the
reply's text but leaving its paper up (an empty green bar for the length of
Cam's line); the full 0.15 s letter slices (animalese only ever plays the first
0.075 s, so half the payload was inaudible); CSS-only animation (the text has
to arrive in the accessibility tree as it is spoken, not be clipped into it).

## Consequences

**`data-state` is published twice for one line.** `stage.js` still decides what
a slot holds and publishes it in the flush, but the reveal owns the attribute
until the line lands: a queued reply is set back to `empty` and blanked for the
length of Cam's line. That is an exception to "one writer", and it is the only
one — the reveal is the single other writer of the attribute, and it restores
the value it was given.

**A revealing or held slot is `inert`.** Blanking the text of a held reply
leaves its anchors in the DOM, and anchors are focusable: tab-then-enter could
have followed a link the player had seen for one frame. `inert` covers the
pointer, the keyboard and the accessibility tree at once, which is why there is
no CSS pointer-events rule for this. The skip listener is on the document in
the capture phase, so clicking inert content still skips.

**A link costs no time.** A link's text is one step of the reveal and does not
advance its clock: a link-heavy line reveals as fast as a plain one, and the
line does not stall while the link sits on screen.

**Space, enter or escape skips; other keys do not.** Tab and the arrow keys
belong to the menu, and a keystroke there should not land a line the player has
not read.

**A catching-up frame speaks at most two letters.** A stalled frame, or a tab
returning from the background, can owe a hundred characters at once; starting
a hundred letters in one instant would sum into the clipped burst the
compressor exists to prevent. The text still catches up in full — only the
voice skips.

**The reply's links are live before its text is.** A held reply is blanked and
inert, so there is nothing to press until it lands; skipping lands Cam's line
and the reply together.

**Click or key skips.** Skipping lands Cam's line in full and lands the reply
with it, so a fast reader is never made to wait. Nothing announces this; it is
the same "keep clicking" the rest of the story asks for.

**`prefers-reduced-motion` declines the reveal, and with it the sound.** The
flush has already put both lines on screen in full when the reveal declines, so
the mode costs nothing but the voice. There is no separate mute control yet;
the voice is off in that mode and nowhere else.

**The story grew by ~232 KB.** The letter library is 86 KB of 8-bit PCM,
base64'd, and Tweego embeds `src/js` twice — once in `<head>`, once in the
story's `twine-user-script` — so the payload is paid for twice. That is the
pre-existing double-evaluation, not this feature; a `[script]` passage would
halve it, and the payload is the only thing currently large enough to matter.

**The bubble still re-centres when the third line wraps.** Measured at 34 px on
the longest line, two-thirds of the way in (`justify-content: center` in a
fixed box). A reveal makes that motion visible where silent text did not. It is
untouched here: the fix is a layout decision for the stage, not for the reveal.

**The letter sounds are CC BY 4.0.** `src/js/voice-letters.js` carries the
licence in its header, and the title screen carries a credit line, because the
licence asks for attribution where a player can see it — not only in a source
comment. The animalese wrapper code is MIT.
