# A film made from a web page

This folder is a film. `index.html` is its 1920×1080 stage; every frame is a function of time, so
a headless browser can render it frame by frame. A voice is laid over it, and captions and
pictures are timed to the words of that voice.

What is here is a 30-second demo that explains itself. To make your film: keep the machinery,
replace the content.

## Start

```bash
node tools/doctor.mjs                    # what this machine has; installs nothing
node tools/make.mjs                      # the demo, end to end → out/demo.mp4, out/demo_captions_en.mp4, their 720p copies
```

Open `index.html` in a browser for a live preview (space = play, arrows = ±1 s, `,` `.` = ±1 frame).

Needs Node 22+, a Chromium (Playwright's, Chrome or Edge) and Python with `av numpy pillow scipy`:
`node tools/doctor.mjs` prints the command for a `.venv` in this folder, which the tools then use. A
natural voice needs Kokoro once (about 400 MB; see `tools/voice_kokoro.py` — it is a download, decide first).

## Make it yours

| file | put there |
| --- | --- |
| `js/script.js` | the narration, line by line; the film's name and title |
| `js/data.js` | every number the film shows, with its source |
| `index.html` | one `<section class="scene">` per scene |
| `css/film.css` | where things sit |
| `js/scenes.js` | what happens, on which word |

Work in this order:

1. Write the script. Then let a voice read it and make that the plan:
   `node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render`
   (or `--voice sapi:zira` with a built-in Windows voice while you have no Kokoro).
2. Build the scenes against the words: `c.<cue>` is when a line starts,
   `S.w('<cue>', 'word', 1.2)` when a word is said.
3. Look at frames all the time: `node tools/sheet.mjs --step 2.5`, `node tools/still.mjs --t 12.4`,
   `node tools/when.mjs s-how/steps`.
4. `node tools/make.mjs` — sound, render, checks, poster frames.

Another voice later: `node tools/make.mjs --voice kokoro:bm_george` — the film follows it.

## What the tools do

| tool | |
| --- | --- |
| `make.mjs` | runs the tools below in order; a failing gate stops the build |
| `preflight.mjs` | scene contract, reproducible motion, claim ledger; `make.mjs` runs it first |
| `doctor.mjs`, `env.mjs` | what the machine has; where the Pythons and the voice are |
| `export_script.mjs` | `js/script.js` (+ voice) → `build/full/timing.json`, subtitles (`script/full/*.srt`, `.vtt`), `narration.md` |
| `voice_kokoro.py`, `voice_sapi.ps1` | narration clips → `voice/full/<name>/` |
| `narration.py` | lays the clips on the film → `js/voice.js`, `build/full/narration.wav` (`--as-plan`: also `js/pacing.js`) |
| `check_clips.py`, `check_audio.py` | checks on the voice and on the finished sound that need no ears |
| `export_sfx.mjs`, `music.py` | the cue sheet the scenes declare → the sound bed (`audio/full/`) |
| `render.mjs` (+ `encode.py`, `mux.py`, `cdp.mjs`) | frames → MP4, without and with captions, voice over the bed at −16 LUFS |
| `verify.py` | the encoded film against the page |
| `still.mjs`, `sheet.mjs`, `when.mjs`, `stillness.mjs`, `compare.py`, `measure_lockup.py` | looking at it |
| `poster.mjs`, `transcode.py`, `probe.py`, `audio_report.py`, `build_icons.mjs` | cover frames, 720p copies, stream facts, a spectrogram, the icon bundle |

`js/lib/` is the machinery (timeline, stagecraft, the builder that turns script and voice into
timing); `css/base.css` the shared look. Each file's header says what it does.

## Licences of what is bundled

Rough.js (MIT) in `vendor/`; Phosphor Icons (MIT) and Simple Icons (CC0) in `assets/icons/`; the
typefaces are loaded from Google Fonts (SIL OFL). The demo's narration clips were synthesised with
Kokoro-82M (Apache-2.0). The sound bed is synthesised here from sine waves and noise.

## Optional clips and final audits

`js/media.js` plays JPEG sequences prepared by `tools/prep_media.py` (ffmpeg required only for extraction).
Enable the manifest tag in `index.html`; configure `tools/clip_audio.py` for sound aligned to scene marks.
Missing clips show labelled plates; failed decodes stop capture. Keep source footage outside `media/`.

Before delivery run `audit_fonts.mjs`, `audit_frames.mjs` and `audit_video.py`; inspect findings rather
than equating a completed build with clean frames. `check_audio.py` reports a 4× true-peak estimate when
scipy is available. `chapters.mjs` validates scene `youtube:` titles for YouTube. Detailed workflows live
in the skill's `references/engine.md`, `qa.md` and `publishing.md`.
