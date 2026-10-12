# Checking a film you cannot watch or hear

You see frames, not motion; you measure sound, you do not hear it. So every claim in the handover
has to rest on something you ran. `node tools/make.mjs` runs the first block; the rest are single
commands. Report results as numbers, and say plainly what no tool can tell you.

## What `make.mjs` runs

| step | tool | what it proves |
| --- | --- | --- |
| clips | `check_clips.py` | when a voice is laid in or restored: a clip that is missing, made for other words, clipped or empty fails; a rate more than ±20 % off the median or a pause over 1 s inside a line is listed |
| contract | `preflight.mjs` | scene ids agree, no self-running animation or `<video>`, a strong claim has `CLAIMS.md` |
| glyphs | `audit_fonts.mjs` | no unexplained system-font glyph (the build fails on one); said numbers that never count up are listed |
| voice | `narration.py` (its report) | each line has room before the next; word times from the engine agree with heard pauses (expect ≥ 90 % of sentence starts) |
| picture | `verify.py` | both films exist, with sound, the film's length and frame rate; two frames per scene compared with the page (mean difference about 1 on a 0–255 scale is encoder noise). Anything else fails, a difference above 4 included |
| sound | `check_audio.py --strict` | −16 LUFS (±1.5), sample peak and estimated true peak under −1 dB; missing scipy fails rather than passing as unchecked |

The build then runs `audit_video.py --fail seams`. A seam fails the build. Flat frames and jumps are
printed and must be inspected; a fade can be flat, a blank frame in the middle cannot. Voice level
above the bed is printed, not enforced: read it, and say when it is outside 12–18 dB.

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

A full `make.mjs` takes about three times the film's length on an Apple M1, half of it the render,
and longer on a slower or busy machine. So check each change with stills, contact sheets and
`make.mjs --range a-b` (those seconds, silent), and build the whole film once per review round.
Before a full build:
contact sheet looked at, cue sheet exported, bed made for the current timing (the renderer refuses a
bed of the wrong length), no page-console errors from `tools/still.mjs`. Render in the background
and use the time (documentation, samples); do not edit `js/`, `css/`, `index.html`,
`build/full/narration.wav` or `audio/` until it has finished.

## The handover

Say, in the user's language:

- **What is in `out/`**, with links that resolve from the folder the session was opened in: the
  1080p films to upload (YouTube, the venue) and their 720p copies to send. Give the length, and say
  that nothing was cut if the length changed.
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

## Three audits, three different questions

```bash
node tools/audit_fonts.mjs --step 0.25
node tools/audit_frames.mjs --fps 30
python tools/audit_video.py out/<slug>.mp4 --json build/audit/video.json
```

- **Fonts:** which font actually drew each glyph, including captions and changing counters? Uses
  Chromium's platform-font report. Unexplained system-font fallback fails the command. `--allow`
  accepts named families only when intentional; the 0.25 s default samples time, not every frame.
- **Page:** text clipping, masked descenders, text overlap, text under images, missing images. Outputs
  `frames.json` and `spans.json`. Add `data-block` to an opaque panel that should occlude text; use
  `--blocks` to override the selector. The tool reports findings, not a pass/fail design verdict. Line
  boxes are not ink boxes: a large numeral beside a label can count as an overlap although the glyphs
  do not touch, so look at the span at full size.
- **Encode:** one-pixel seams, flat frames and sudden jumps. Exits nonzero for seams or flat frames
  unless `--no-fail`. Intended page turns and final fades can trigger it; inspect their timestamps.

A screenshot sample cannot establish that every encoded frame is clean. Conversely, these heuristics
cannot certify taste, factual accuracy or the sound of a voice. Record inspected exceptions and any
skipped measurement. After technical checks, audit the claims ledger and cover separately. Scan the
files intended for sharing for keys, private paths, excluded footage and assets without clear rights.
