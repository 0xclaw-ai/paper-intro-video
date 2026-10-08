# The voice

A narrated film is the default: "people cannot take in captions and pictures at the same time".
You cannot hear, so this part is built around things you *can* check — and around asking the user
to listen at the right moments.

## Where the clips come from

One WAV per narration line in `voice/full/<name>/` (`01.wav`, `02.wav`, … in script order), plus
`NN.json` when the engine knows when each word starts.

| source | command | notes |
| --- | --- | --- |
| **Kokoro-82M** (neural, natural) | `node tools/make.mjs --voice kokoro:af_heart` | Needs a one-time setup of about 400 MB (packages + two model files; the top of `tools/voice_kokoro.py` lists the exact commands). **It is a download: ask first**, naming the files, the sources and the sizes. Model weights Apache-2.0, runtime MIT; runs offline on the CPU, about 2 minutes for a five-minute script. Reports phoneme durations, so word times are exact. |
| **A Windows voice** (SAPI) | `node tools/make.mjs --voice sapi:zira` | Nothing to install, exact word times, but it sounds synthetic. Good for a first pass and for testing; say so if it ends up in a deliverable. |
| **A recording** | `node tools/make.mjs --voice clips:voice/full/me` | The user reads `script/full/narration.md`, one file per line. Word times are worked out from the pauses (exact after punctuation, about 0.1 s inside a clause). |

`node tools/doctor.mjs` shows which of these the machine has. If Kokoro is installed somewhere
else on the machine, point `OX_TTS` at that folder instead of downloading again.

**Kokoro voices** (American `a*`, British `b*`; female `*f_`, male `*m_`): `af_heart` is the best
all-round (the default); `af_bella`, `am_michael`, `am_fenrir`, `bf_emma`, `bm_george` are solid
alternatives. Write short samples for the user to choose from — you cannot judge them:

```bash
node tools/make.mjs --samples af_bella,am_michael,bm_george --lines 4,21,29    # → out/extras/voice_samples/
```

## The first voice makes the plan

```bash
node tools/make.mjs --voice kokoro:af_heart --as-plan --no-render
```

`--as-plan` stores this voice's pacing as the plan (`js/pacing.js`): the length of each line and
the moment of each word. Scenes are then timed against real words (`S.w`). Later voices are laid
in *without* `--as-plan`; the film maps itself onto them. If the words of the script change while
you are still building scenes, run it again with `--as-plan`.

`tools/narration.py` prints one row per line — start, planned window, spoken length, room before
the next line, how the word times were found — and ends with how many sentence starts sit where
a pause is heard to end (it should be nearly all of them; the tool falls back to the pauses for a
line where the engine's times disagree with the audio).

## Pace

- `--pause 0.8` (the default in `make.mjs`): pauses between sentences are lengthened to at least
  0.8 s (0.7× after a colon or dash; commas are left alone). A synthetic voice hurries from one
  sentence into the next; the pictures need the beat. `--max-pause` shortens pauses that are too long.
- A line whose sentences each bring a new picture asks for more with `breath: 1.0` in the script.
- `--speed` (Kokoro): 1.0 is about 160 words a minute including pauses, comfortable for an
  international audience. 0.9 is calmer, 1.1 brisker.
- The film's length follows from the voice. Tell the user the new length when it changes, and that
  nothing was cut.

## Pronunciation — check it on paper

Kokoro speaks from phonemes, and `voice/full/<name>/phonemes.txt` lists them for every line. Read
it. Names, acronyms, numbers and coined words are where it goes wrong:

- Spell things out in the cue's `say` field: `Zero X Claw`, `Hack Rep`, `M V P`,
  `ninety-three percent`, `zero point nine one`.
- When the phonemizer gets an ordinary word wrong, fix the phonemes in the `SAY` table at the top
  of `tools/voice_kokoro.py` (it already turns espeak's "hack-a-thun" into "hackathon").
- Ask the user how the project's name and the people's names are said.

Then re-synthesize only the changed lines: `node tools/make.mjs --voice kokoro:af_heart --only 4,17`.

## What can be checked without ears

`tools/narration.py` and the sanity checks in `references/qa.md` cover: every line present and
made for the current words; speaking rate per line within ±20 % of the median (an outlier is
usually a mispronounced or garbled line); no clipping; no pause over a second inside a line; word
times agreeing with heard pauses; voice level even across lines (−20 dBFS RMS while speaking).

What cannot: whether the voice is pleasant, whether a name sounds right, whether the mix is
comfortable. Say so, and ask the user to listen once with headphones.

## Changing things later

| change | do |
| --- | --- |
| a few words | edit `en`/`say` in `js/script.js` → `--voice kokoro:<v> --only <lines>` → render |
| another voice | `node tools/make.mjs --voice kokoro:<other>` (a full render: the picture follows the voice) |
| slower / faster | `--speed`, `--pause`, `--max-pause` |
| the user's own voice | they record; `--voice clips:voice/full/me` |
| no voice | `--voice none` |
| only the mix | `tools/mux.py` — no render needed (see `references/sound.md`) |

A clip that was made for different words is reported and left out rather than played over the
wrong caption — fix it before rendering.
