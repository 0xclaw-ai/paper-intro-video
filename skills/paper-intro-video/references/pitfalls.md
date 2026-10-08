# When something surprises you

Each of these cost time once. `node tools/doctor.mjs` catches the environment ones.
Keep notes about your own machine (interpreter paths, where the speech model is) outside this
folder — in your assistant's memory or a private file — not in the skill.

## Environment

- **Three Pythons may be needed, and they need not be the same one**: one with `av numpy pillow`
  (encode, mux, verify), one with `numpy scipy` (narration, sound bed), one with `kokoro-onnx`
  (the voice). `tools/env.mjs` finds them: the variables `OX_PYTHON`, `OX_PYTHON_SCI`,
  `OX_PYTHON_TTS` first, then the PATH, then the user's conda environments. Do not install into
  the user's existing environments; a venv inside the project or the TTS folder is fine once they agree.
- **`python` on Windows may be the Store stub**: it exists, prints nothing and does nothing. If a
  Python step "succeeds" silently with no output, call the interpreter by its full path.
- **No ffmpeg is needed** (PyAV carries its own); do not assume one exists.
- **A `package.json` with `"type": "module"` anywhere above the film** makes Node read `js/*.js`
  as ES modules and the builder fails with "js/script.js has to define the film". The film's own
  `package.json` (`"type": "commonjs"`) prevents it — keep that file when copying the template.
- **Downloads need a yes**: Python packages, the Kokoro model (about 400 MB), a browser, an icon
  SVG. Say what, from where, how large; install inside the project; report afterwards what was
  fetched. A Kokoro install elsewhere on the machine can be reused with `OX_TTS=<folder>`.
- **Fonts come from Google Fonts** at render time. Offline, the page falls back to local fonts and
  marks are measured against those; `doctor.mjs` and the first line of every render say whether
  the four faces loaded. A plain HTTP check from Node can fail behind a proxy while the browser
  works — trust the browser's answer.

## Shell and files

- **Here-documents with quotes, backticks or backslashes break** (`unexpected EOF`, or `\n`
  silently turning into a newline in generated code). Write patch scripts and code with the file
  tool and run them; do not paste code through a heredoc.
- **Long command lines fail on Windows** (about 32 000 characters): hundreds of file names cannot
  be passed as arguments. `sheet.mjs` hands its list over in a file for that reason.
- **Foreground waiting is not available** in some harnesses: start long renders in the background
  and work on something else until the completion notice.
- **Links in the reply** resolve from the folder the session was opened in. A link relative to
  the film's own folder opens as "file not found".

## The page

- **Nothing may animate by itself** (CSS transitions, timers): frames are rendered in parallel and
  in any order. If two renders of the same time differ, something is stateful.
- **Measure after layout and fonts**: marks, arrows and `boxIn` need every scene laid out
  (`player.js` does that while building) and the real fonts. DOM added after `MK.prepare` has no marks.
- **`<svg class="ink">` must be a direct child of its station**, or arrow coordinates are off.
- **A word that is not in the line makes `S.w` throw** — by design. Check the spelling against the
  `en` text (punctuation is ignored, case is ignored).
- **A callback that watches the clock** must compare `S.now(t)` with plan times, not `t` itself.
- **Camera keys can cut things**: after every change to keys or layout, look at a contact sheet.

## Voice and sound

- **`System.Speech` reports word positions as if the audio were 16 kHz**; `narration.py` detects
  and corrects that (it checks the times against the pauses it hears).
- **espeak mispronounces some ordinary words** ("hackathon" with a swallowed last syllable).
  Read `phonemes.txt`; fix in the `SAY` table of `tools/voice_kokoro.py`.
- **The bed must match the timing.** After any change of voice or script: cue sheet, then bed,
  then render (`make.mjs` does it in that order; `render.mjs` refuses a bed of the wrong length).
- **Do not touch `build/full/narration.wav`, `js/voice.js` or `audio/` while a render runs** — the
  mux at the end reads them.

## Process

- **Archive before a revision**: copy source, audio and outputs to `versions/vN/`. Users compare.
- **Say where a limit comes from.** A length you chose is not a venue rule.
- **Do not fix what was not reported without saying so**, and say when you extended a fix to
  similar places (the logo lockup was aligned in three places although only one was mentioned).
- **Facts**: dates, prizes, "first" — only from the sources, or flagged as the user's claim.
