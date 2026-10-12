---
name: paper-intro-video
description: "Make or revise a narrated, animated intro video (MP4) for a research paper or project from its PDF, code and website. Use when someone wants a paper, conference, explainer or launch video, even if they only say 'make a video for our paper' or send a PDF and a repo link, or wants to change one made this way: voice, wording, pacing, look, captions."
---

# Paper intro video

If you were sent https://github.com/0xclaw-ai/paper-intro-video, follow this file.

A film here is a web page: a 1920×1080 stage whose every frame is a pure function of time. A
headless browser renders it frame by frame, a voice is laid over it, and captions and pictures
are timed to the words of that voice — so the voice can be swapped, re-paced or re-recorded and
everything follows.

The skill has two parts, and worked examples in its repository:

| | |
| --- | --- |
| `template/` | The harness. Copy it to start a film: engine, stagecraft, tools, and a 30-second demo film that explains itself ([rendered](https://github.com/0xclaw-ai/paper-intro-video/blob/main/examples/template-demo.mp4)). |
| `references/` | How to do each part well. Read the one you need when you get there (list at the end). |
| `examples/0xclaw/` | A complete five-minute EMNLP 2026 film on an earlier version of the harness: a typed prompt, a baton passed along a pipeline, counting numbers, bars that race, a project wall, an end card. The references call it "the example". |
| `examples/chat/` | A 3:47 ECCV 2026 film ([published](https://youtu.be/9C436tP0OEA)): clean geometric marks, word-timed diagrams, frame-sequence clips and a claims ledger, with labelled placeholders for the demo footage. |

The examples are not installed with the skill: read them at
https://github.com/0xclaw-ai/paper-intro-video/tree/main/examples, or at `../../examples/` from this file
when the whole repository is on disk. Every film starts from a copy of `template/`, the default finished
look; examples show structure and scale, and each project keeps its own colours, type and marks. A
failing gate is fixed, never switched off.

## The shape of the work

The order matters, and the first three steps are where films are won or lost. Resist starting
with visuals.

1. **Look at the machine.** Copy `template/` into a new, empty folder (for example `video/` beside
   the paper's files): that folder is now the film, and every command below runs in it. No copy of
   the skill on disk? Fetch the repository first (a download; about 50 MB on disk):
   `git clone --depth 1 https://github.com/0xclaw-ai/paper-intro-video`. Run `node tools/doctor.mjs`;
   it must exit 0. Node 22+, a Chromium, Python with `av numpy pillow scipy` (the doctor prints one
   command for a `.venv` in the film folder) and the page's typefaces are required; Kokoro is
   optional. Then `node tools/make.mjs` builds the bundled 30-second demo as it is, with its own
   narration clips: proof that the pipeline works on this machine before any of it is replaced.
   Anything that needs a download — a Python package, a speech model, a browser — is the user's
   decision: say exactly what, from where and how large, and wait for a yes. Use project-local
   environments and explicit interpreter paths; leave existing environments, global skills and caches alone.
   → `references/pitfalls.md` for what to do when something is missing or a tool fails.
2. **Read the sources and write down the facts.** The paper, the repository, the website. Every
   number that will be on screen goes into `js/data.js` with the table it comes from; anything the
   sources do not say is not claimed. Keep a `CLAIMS.md` ledger for narration, on-screen labels and
   demo provenance. Separate paper results from public-release results; unresolved claims stay qualified.
3. **Write the talk before the pictures.** `js/script.js`: the narration, line by line, structured
   like a good talk — a promise up front, one slogan that returns, the idea fenced off from what
   others do, a question to the audience, a surprise, and at the end the contributions and one
   sentence that says what the work is. Short lines that can be said in one breath.
   → `references/story.md`
4. **Voice first.** Synthesise the narration and make its pacing the plan
   (`node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render`). From here on a line lasts
   as long as it is really spoken and `S.w('cue', 'word')` knows when each word is said. Timing
   pictures against guessed durations and adding a voice later is how films end up with dead air
   or pictures that trail the words. → `references/voice.md`
5. **Decide the look, then build the scenes.** One idea per screen, a dozen words at most, the
   point of each screen visibly marked (hand-drawn or clean geometry); every narrated phrase acted
   out on its words; a camera that never parks. `index.html` (markup), `css/film.css` (where things
   sit), `js/scenes.js` (what happens). Look at stills and contact sheets constantly — you cannot
   watch the film, but you can read frames.
   → `references/design.md`, `references/motion.md`, `references/engine.md`
6. **Sound, render, check.** `node tools/make.mjs` stops on a broken scene contract, a missing
   typeface, a glyph drawn by a system font, a one-pixel seam, clipped audio, or loudness away
   from −16 LUFS. It also lists flat frames and jumps. Read every one: a fade can be flat, a blank
   frame in the middle cannot. These gates are generic. They do not prove that a sentence is true
   or that the voice sounds right. → `references/sound.md`, `references/qa.md`
7. **Hand over honestly.** The files, what was verified and how, what could not be (you cannot
   hear the voice or the mix — give the user voice samples and ask them to listen with
   headphones), and the decisions that are theirs. For YouTube, site embeds or README cards, read
   `references/publishing.md`. Publishing and pushing need separate approval; a rendered file is not an upload.
8. **Iterate in rounds.** Users review with screenshots. Before a revision, copy the current state
   to `versions/vN/`. Apply the round, re-render, report what changed. Once the film is frozen, edit
   only the requested cover or metadata and keep the approved MP4 and narration. Keep the durable
   feedback (see below): it applies to the next film too.

## What the feedback taught

These came from review rounds on real films and from people using the skill. They are the default
taste of this skill; a user's explicit wish overrides them.

- **It must not look machine-made.** Dark gradient + glowing rounded cards + pill chips + generic
  line icons reads as "AI" and viewers leave. Pick a deliberate art direction (the template's is an
  annotated paper: warm stock, ink, one accent, a highlighter, hand-drawn marks). Icons and
  templates come from real open-source sets that genuinely fit; generated imagery only supports.
- **Few words.** A dense panel was rejected; a concrete product moment (a terminal, a chat) was
  praised. If a screen needs more than about a dozen words, it is two screens.
- **The point of each screen is visibly marked** — underline, highlighter, circle — not explained
  by more text.
- **It is a film, not slides.** Stills that fade in are not enough; measure it
  (`node tools/stillness.mjs`: a good film is still for about 6 % of its time, never longer than
  2 s). No chapter labels above headlines that repeat the progress bar.
- **Numbers count up.** A number that is said runs to its value on its word (`S.count`), as bars
  grow and points land on theirs; one that simply appears reads as a slide. The build lists said
  numbers that stay still.
- **Narration is not optional.** People cannot read captions and follow pictures at once; the
  voice carries the words. Captions and pictures follow the voice.
- **Captions are words only** — no box — readable on every ground (an outline in the ground colour).
- **No black, no mixed grounds.** Dark cards use a dark tone of the paper's own hue, and no strip
  of another ground may show at any camera position.
- **Names in full** on title and end cards (the venue written out, the abbreviation in brackets),
  large enough to read; no footnote marks (asterisks, daggers) when there is nowhere to explain them
  — the audience is not only academics.
- **The last card says what the work is in one sentence**, then where to find it. Not "thank you".
- **Align by eye, not by box.** When someone says a thing looks off and the geometry says it is
  fine, measure the visual centres (`tools/measure_lockup.py`) before answering: a mascot's crown
  once lifted a lockup's box.
- **Do not drop content to hit a length you chose.** Say whether a limit is the venue's or yours,
  and keep the complete version.
- **Offer few variants.** One cut, with and without burned-in captions, is what was wanted in the end.

## Commands

```bash
node tools/doctor.mjs                                    # required tools; exit 0 before replacing the demo
node tools/preflight.mjs                                 # scene contract and reproducible motion
node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render   # first voice: it becomes the plan
node tools/still.mjs --t 12,21.5                         # full-size frames  -> build/stills/
node tools/sheet.mjs --step 2.5                          # contact sheets    -> build/sheets/
node tools/when.mjs s-how/steps                          # when each word of a line is said (film time)
node tools/make.mjs                                      # sound, render, verify, posters, 720p copies -> out/
node tools/make.mjs --voice kokoro:bm_george             # another voice: the film follows
node tools/make.mjs --voice kokoro:af_heart --only 4,17  # two lines changed: redo only those
node tools/make.mjs --samples af_bella,am_michael        # audition files for the user to choose a voice
node tools/stillness.mjs                                 # where does nothing move?
node tools/audit_fonts.mjs                               # glyph-level font fallback
node tools/audit_frames.mjs                              # layout spans to inspect
python tools/audit_video.py out/<slug>.mp4                # encoded seams, flat frames, jumps
node tools/chapters.mjs                                  # scene youtube: fields -> chapters.txt
```

`make.mjs` only runs the ordinary tools in `tools/` in the right order with the right Python
(`node tools/make.mjs --help` lists its options); each tool can be run alone, as its header says.
`python` above is the film's Python: `.venv/bin/python` (Windows `.venv\Scripts\python`), or the
one `node tools/doctor.mjs` names.

## Reference files

| read | when |
| --- | --- |
| `references/story.md` | writing or revising the script: the structure of the talk, how to write lines for a voice |
| `references/design.md` | choosing the look, laying out a screen, title and end cards, captions, icons |
| `references/motion.md` | making a scene move: beats on words, the camera, kinetic type, marks, the stillness check |
| `references/engine.md` | the harness itself: files, the timeline and stage functions, the two clocks, cue sheet, adding icons and fonts |
| `references/voice.md` | synthesising or recording the narration, pacing, pronunciation, swapping voices |
| `references/sound.md` | the sound bed, cues, the mix, using other music |
| `references/qa.md` | every check to run before handing over, and how to report what could not be checked |
| `references/publishing.md` | uploading to YouTube, chapters, honest covers, website embeds and GitHub README links |
| `references/pitfalls.md` | when a tool fails or the machine surprises you |
| `references/prompts.md` | the prompts a user can start and steer a film with, and how to read their feedback |

Reply to the user in their language. Give file links relative to the folder the session was
opened in, not to the film's folder — a link that the app cannot resolve looks like a missing file.
