# Checking a film you cannot watch or hear

You see frames, not motion; you measure sound, you do not hear it. So every claim in the handover
has to rest on something you ran. `node tools/make.mjs` runs the first block; the rest are single
commands. Report results as numbers, and say plainly what no tool can tell you.

## What `make.mjs` runs

| step | tool | what it proves |
| --- | --- | --- |
| clips | `check_clips.py voice/full/<name>` | every line present and made for the current words; speaking rate per line within ±20 % of the median (an outlier is usually a garbled or mispronounced line); no pause over 1 s inside a line; no clipping |
| voice | `narration.py` (its report) | each line has room before the next; word times from the engine agree with heard pauses (expect ≥ 90 % of sentence starts) |
| picture | `verify.py` | stream facts (duration, 1920×1080, 30 fps, frame count, audio present) and two frames per scene compared with the page: mean difference about 1 on a 0–255 scale is encoder noise; above 4 it flags a mismatch |
| sound | `check_audio.py` | −16 LUFS (±1.5), peak under −1 dBFS, voice 12–18 dB above the bed, left ear 200 Hz / right ear 240 Hz still separate after AAC |

## What you run yourself, every time

1. **Contact sheets, with captions** — `node tools/sheet.mjs --step 2.5` — and read every frame:
   - nothing cut at a frame edge; no figure pushed into the headline; no strip of the wrong ground
     around a dark card (first and last frame of each dark card especially);
   - captions never over content that matters, and in the right contrast on each ground;
   - the first frame is a composed frame, not an empty ground; the last one is the complete end card;
   - no leftover placeholder, no overlapping text, no orphaned mark.
2. **Frames just after key words** — the thing that belongs to a word is arriving 0.3 s after
   the word starts:
   ```bash
   node tools/when.mjs s-how/steps                                   # every word of the line, with its film time
   node tools/still.mjs --t $(node tools/when.mjs s-how/steps voice. --plus 0.3)
   ```
3. **Stillness** — `node tools/stillness.mjs`: about 6 % still, no hold over 2 s. A long hold
   means a line with nothing acted out on it.
4. **Phonemes** — read `voice/full/<name>/phonemes.txt` for names, acronyms and numbers.
5. **After changing shared code or styles** — `tools/compare.py` on contact-sheet thumbnails from
   before and after: only what you meant to change may differ.
6. **A lockup someone calls crooked** — `tools/measure_lockup.py` on a still: tilt, box centres,
   visual centres. Align on the visual centres.
7. **The numbers** — every figure on screen against `js/data.js`, and `js/data.js` against the
   paper. One pass, at the end, after all edits.

## Before a long render

A five-minute film takes about ten minutes to render. Before starting one: contact sheet looked
at, cue sheet exported, bed made for the current timing (the renderer refuses a bed of the wrong
length), no page-console errors from `tools/still.mjs`. Render in the background and use the time
(documentation, samples); do not edit `js/`, `css/`, `index.html`, `build/full/narration.wav` or
`audio/` until it has finished.

## The handover

Say, in the user's language:

- **What is in `out/`**, with links that resolve from the folder the session was opened in, the
  length, and that nothing was cut if the length changed.
- **What you verified and how**, in numbers: "20 frames compared with the page (mean difference
  1.1); −16.0 LUFS, peak −1.0 dBFS; voice 15 dB above the bed; word times agree with pauses at
  48 of 50 sentence starts; 6 % of the film is still, longest hold 2.0 s."
- **What you could not verify**: how the voice sounds, whether names are pronounced the way the
  authors say them, whether the mix is comfortable, whether the binaural bed works for them
  (headphones). Ask them to listen once, and give voice samples if a choice is open.
- **What is theirs to decide**: any claim beyond the sources, the voice, venue rules you could not
  find (length, format, logo use), anything you changed that they did not ask for.
- **What you downloaded or installed**, where, and how large — if anything.

Do not write "done and verified" for something a tool did not check.
