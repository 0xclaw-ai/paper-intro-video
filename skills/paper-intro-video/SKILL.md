---
name: paper-intro-video
description: "Make a narrated, animated intro or explainer video (MP4) for a research paper, project or product from its PDF, code and website. The film is an HTML page rendered frame by frame; a synthesized or recorded voice-over drives captions and pictures word by word; the sound bed is synthesized; every step has a check. Use this skill whenever the user wants an intro video, explainer video, paper video, conference presentation video (ACL, EMNLP, NeurIPS, CVPR and the like), video abstract, project trailer or launch video (in Chinese, 介绍视频, 论文视频, 讲解视频, 宣传视频, 参会视频), or wants to revise one made this way (another voice, new wording, pacing, look, captions), even if they only say 'make a video for our paper' or send a PDF and a repo link and ask for 'something to show at the conference'."
---

# Paper intro video

A film here is a web page: a 1920×1080 stage whose every frame is a pure function of time. A
headless browser renders it frame by frame, a voice is laid over it, and captions and pictures
are timed to the words of that voice — so the voice can be swapped, re-paced or re-recorded and
everything follows. No video editor, no timeline dragged by hand, nothing that cannot be rebuilt
from text.

The skill has two parts, and a worked example in its repository:

| | |
| --- | --- |
| `template/` | The harness. Copy it to start a film: engine, stagecraft, tools, and a 30-second demo film that explains itself. |
| `references/` | How to do each part well. Read the one you need when you get there (list at the end). |
| the example | A complete five-minute film on the same harness (an EMNLP 2026 paper). It is not installed with the skill: it is `examples/0xclaw/` in the skill's repository — https://github.com/0xclaw-ai/paper-intro-video/tree/main/examples/0xclaw, or `../../examples/0xclaw/` from this file when the whole repository is on disk. Read it for patterns at full scale: a typed prompt, a baton passed along a pipeline, counting numbers, bars that race, a project wall, an end card. The reference files call it "the example". The template's demo, rendered, is in the same repository: `examples/template-demo.mp4` (https://github.com/0xclaw-ai/paper-intro-video/blob/main/examples/template-demo.mp4). |

## The shape of the work

The order matters, and the first three steps are where films are won or lost. Resist starting
with visuals.

1. **Look at the machine.** Copy the contents of `template/` into the project folder — that folder
   is now the film, and every command below runs in it — and run `node tools/doctor.mjs`.
   It reports what is there (Node 22+, a Chromium, Pythons, a voice) and installs nothing.
   `node tools/make.mjs` then builds the bundled 30-second demo as it is (about a minute; its
   narration clips are included, so it needs no speech model) — a quick proof that the pipeline
   works on this machine before any of it is replaced.
   Anything that needs a download — a Python package, a speech model, a browser — is the user's
   decision: say exactly what, from where and how large, and wait for a yes.
   → `references/pitfalls.md` for what to do when something is missing or a tool fails.
2. **Read the sources and write down the facts.** The paper, the repository, the website. Every
   number that will be on screen goes into `js/data.js` with the table it comes from; anything the
   sources do not say is not claimed (if the user wants a stronger claim — "the first to …" — use
   their words and tell them it goes beyond the paper).
3. **Write the talk before the pictures.** `js/script.js`: the narration, line by line, structured
   like a good talk — a promise up front, one slogan that returns, the idea fenced off from what
   others do, a question to the audience, a surprise, and at the end the contributions and one
   sentence that says what the work is. Short lines that can be said in one breath.
   → `references/story.md`
4. **Voice first.** Synthesize the narration and make its pacing the plan
   (`node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render`). From here on a line lasts
   as long as it is really spoken and `S.w('cue', 'word')` knows when each word is said. Timing
   pictures against guessed durations and adding a voice later is how films end up with dead air
   or pictures that trail the words. → `references/voice.md`
5. **Decide the look, then build the scenes.** One idea per screen, a dozen words at most, the
   point of each screen marked by hand; every narrated phrase acted out on its words; a camera
   that never parks. `index.html` (markup), `css/film.css` (where things sit), `js/scenes.js`
   (what happens). Look at stills and contact sheets constantly — you cannot watch the film, but
   you can read frames. → `references/design.md`, `references/motion.md`, `references/engine.md`
6. **Sound, render, check.** `node tools/make.mjs` does the rest: cue sheet, sound bed, reference
   stills, render (no captions + English captions from one capture pass), mix at −16 LUFS, frame
   comparison against the page, poster frames. Then the checks that need no eyes or ears.
   → `references/sound.md`, `references/qa.md`
7. **Hand over honestly.** The files, what was verified and how, what could not be (you cannot
   hear the voice or the mix — give the user voice samples and ask them to listen with
   headphones), and the decisions that are theirs.
8. **Iterate in rounds.** Users review with screenshots. Before a revision, copy the current state
   to `versions/vN/`. Apply the round, re-render, report what changed. Keep the durable feedback
   (see below) — it applies to the next film too.

## What the feedback taught

These came from review rounds on a real film. They are the default taste of this skill; a user's
explicit wish overrides them.

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
- **Narration is not optional.** People cannot read captions and follow pictures at once; the
  voice carries the words. Captions and pictures follow the voice.
- **Captions are words only** — no box — readable on every ground (an outline in the ground colour).
- **No black, no mixed grounds.** Dark cards use a dark tone of the paper's own hue, and no strip
  of another ground may show at any camera position.
- **Names in full** on title and end cards (the venue written out, the abbreviation in brackets),
  large enough to read; no footnote marks (asterisks, daggers) when there is nowhere to explain them
  — the audience is not only academics.
- **The last card says what the work is in one sentence**, then where to find it. Not "thank you".
- **Align by eye, not by box.** A logo lockup centred on bounding boxes looked crooked because the
  mascot's crown lifted its box; aligning on the visual centre fixed it. When someone says a thing
  looks off and the geometry says it is fine, measure the visual centres before answering.
- **Do not drop content to hit a length you chose.** Say whether a limit is the venue's or yours,
  and keep the complete version.
- **Offer few variants.** One cut, with and without burned-in captions, is what was wanted in the end.

## Commands

```bash
node tools/doctor.mjs                                    # what is on this machine
node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render   # first voice: it becomes the plan
node tools/still.mjs --t 12,21.5                         # full-size frames  -> build/stills/
node tools/sheet.mjs --step 2.5                          # contact sheets    -> build/sheets/
node tools/when.mjs s-how/steps                          # when each word of a line is said (film time)
node tools/make.mjs                                      # sound, render, verify, posters -> out/
node tools/make.mjs --voice kokoro:bm_george             # another voice: the film follows
node tools/make.mjs --voice kokoro:af_heart --only 4,17  # two lines changed: redo only those
node tools/make.mjs --samples af_bella,am_michael        # audition files for the user to choose a voice
node tools/stillness.mjs                                 # where does nothing move?
```

`make.mjs` only runs the ordinary tools in `tools/` in the right order with the right Python;
each of them can be run alone (their headers say how).

## Reference files

| read | when |
| --- | --- |
| `references/story.md` | writing or revising the script: the structure of the talk, how to write lines for a voice |
| `references/design.md` | choosing the look, laying out a screen, title and end cards, captions, icons |
| `references/motion.md` | making a scene move: beats on words, the camera, kinetic type, marks, the stillness check |
| `references/engine.md` | the harness itself: files, the timeline and stage functions, the two clocks, cue sheet, adding icons and fonts |
| `references/voice.md` | synthesizing or recording the narration, pacing, pronunciation, swapping voices |
| `references/sound.md` | the sound bed, cues, the mix, using other music |
| `references/qa.md` | every check to run before handing over, and how to report what could not be checked |
| `references/pitfalls.md` | when a tool fails or the machine surprises you |
| `references/prompts.md` | the prompts a user can start and steer a film with (中文 / English), and how to read their feedback |

Reply to the user in their language. Give file links relative to the folder the session was
opened in, not to the film's folder — a link that the app cannot resolve looks like a missing file.
