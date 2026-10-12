# When something surprises you

Each of these cost time once. `node tools/doctor.mjs` catches the environment ones.
Keep notes about your own machine (interpreter paths, where the speech model is) outside this
folder — in your assistant's memory or a private file — not in the skill.

## Environment

- **One Python environment covers every job but the voice**: `av numpy pillow scipy` in a `.venv`
  inside the film folder, which the tools use by themselves (`node tools/doctor.mjs` prints the
  command). A Python elsewhere works too: point `OX_PYTHON` (and `OX_PYTHON_SCI`) at it. Kokoro has
  its own (`OX_PYTHON_TTS`). Leave the user's existing environments as they are.
- **`python` on Windows may be the Store stub**: it exists, prints nothing and does nothing. If a
  Python step "succeeds" silently with no output, call the interpreter by its full path.
- **Normal rendering needs no ffmpeg executable** (PyAV carries the libraries). Optional
  `prep_media.py` needs ffmpeg on PATH; check before preparing source clips.
- **A `package.json` with `"type": "module"` anywhere above the film** makes Node read `js/*.js`
  as ES modules and the builder fails with "js/script.js has to define the film". The film's own
  `package.json` (`"type": "commonjs"`) prevents it — keep that file when copying the template.
- **Fonts come from Google Fonts** at render time. Offline, the page falls back to local fonts and
  marks are measured against those; `doctor.mjs` and the first line of every render say whether
  each face loaded. A plain HTTP check from Node can fail behind a proxy while the browser works —
  trust the browser's answer.

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
- **A film folder that iCloud syncs** collects conflict copies named "… 2"; `doctor.mjs` says when
  it is one. Work outside a synced `~/Documents` or `~/Desktop`.
- **Updating the skill does not migrate an existing film.** For an unfinished film, back up first,
  then compare and merge `template/tools/`, `template/js/lib/` and `template/js/media.js`. Preserve
  custom tools, script, scenes, data and styles; run `doctor.mjs` and `make.mjs` before accepting
  the migration. Do not rebuild or overwrite frozen deliverables.

## The page

- **Two renders of the same moment differ**: something animates by itself (a CSS transition, a
  timer) or keeps state between frames. Everything goes through the timeline (`engine.md`).
- **`S.w` throws**: the word is not in the line. Check it against the `en` text (punctuation and
  case are ignored).

## Voice

- **`System.Speech` reports word positions as if the audio were 16 kHz**; `narration.py` detects
  and corrects that (it checks the times against the pauses it hears).
- **espeak mispronounces some ordinary words** ("hackathon" with a swallowed last syllable).
  Read `phonemes.txt`; fix in the `SAY` table of `tools/voice_kokoro.py`.
