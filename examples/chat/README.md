# CHAT · ECCV 2026

**[Watch the published film (3:47)](https://youtu.be/9C436tP0OEA)**

[Paper](https://arxiv.org/abs/2607.02799) · [Project page](https://junhaosong.com/chat/)
· [Code and weights](https://github.com/Rqcker/chat)

*CHAT: Conversational Human Audio-visual Talking Dialogue Generation*, European Conference on Computer
Vision 2026. The published film was made with this harness and a project-specific visual identity.

## What this example contains

A **teaching adaptation**, not a frame-identical copy of the uploaded film:

- The 13 scenes, script, paper-reported numbers, word timings and 34 Kokoro `af_heart` narration clips.
- CHAT typography and colours; clean geometric marks (`OXCLEAN`); the shared-timeline diagram,
  listening behaviour, ablation and dataset scenes; title and end cards. The icon folder keeps only the five icons this film draws.
- A synthesised piano score (`tools/piano.py`), built from the harness's sound bed.
- [CLAIMS.md](CLAIMS.md), including the published opening caption's known limitation, and
  [YOUTUBE.md](YOUTUBE.md), with the published film link and chapter workflow.

**No demo video, frame sequence, demo audio, HDTF face crop, source dataset, checkpoint or paper source is
included.** `media/manifest.js` is deliberately empty. Every absent clip becomes a labelled plate. The
opening caption explicitly says footage is omitted. Narration is retained as a timing example; plates
are not model output. Do not publish this preview as the CHAT research demonstration.

The uploaded film is unchanged. Its disputed opening caption is not reused here or in a cover.

## Run without downloading a speech model

Use Node 22+, a local Chromium and Python with `av numpy pillow scipy`. Reuse an existing suitable
interpreter via `OX_PYTHON` and `OX_PYTHON_SCI`, or obtain approval for a project-local environment.
Nothing here needs installation into global Python, conda or the assistant's skill directory.

```bash
node tools/doctor.mjs
node tools/make.mjs
```

`make.mjs` restores the voice track from included clips, then builds the placeholder film with the
standard sound bed. It writes `out/chat_intro.mp4`, a burned-caption copy, SRT/VTT, posters, checks and
`build/full/chapters.txt`. Typeface files load from Google Fonts; check font results on your machine.

For the example's piano rather than the standard bed, run this sequence instead (`python` must be the
interpreter selected above):

```bash
node tools/make.mjs --no-render
python tools/piano.py
node tools/render.mjs --audio audio/full/bed.wav,-1 --audio build/full/narration.wav,0 --lufs -16
python tools/check_audio.py out/chat_intro.mp4
```

There is no demo-audio layer in this package. The piano tool skips missing demo sound windows. To study
clip integration with your own cleared footage, configure `tools/prep_media.py` and `tools/clip_audio.py`;
see [the engine reference](../../skills/paper-intro-video/references/engine.md#frame-accurate-clips-and-their-sound).
The empty manifest already exists, so inspect it before running `prep_media.py --replace`.

## Inspect before sharing

```bash
node tools/sheet.mjs --step 2.5
node tools/audit_fonts.mjs
node tools/audit_frames.mjs
python tools/audit_video.py out/chat_intro.mp4
node tools/chapters.mjs
```

Expected: missing-media warnings and labelled plates. Audit findings at page turns and the final fade
need inspection, not blanket suppression. Listening quality and pronunciation still need human review.
[QA reference](../../skills/paper-intro-video/references/qa.md).

## Provenance and rights

CHAT source material and project branding are attributed to the paper's authors, listed on the title
and end cards. Paper figures and numbers retain source references in `js/data.js`; these are not new
measurements of the public implementation. ECCV logo paths derive from the conference's own artwork;
conference organisers retain rights to their marks. `tools/make_logos.py --source <official.svg>` is an
optional regeneration tool, not part of the build; the input SVG is obtained separately.

Rough.js and Phosphor notices are bundled with their assets. Simple Icons uses CC0. Typeface families
are Archivo and IBM Plex Mono, loaded from Google Fonts under their respective SIL Open Font Licences.
Narration was synthesised with Kokoro-82M; no model weights are included. The piano is synthesised by
code rather than sampled from a recording. These credits do not grant rights to third-party footage,
people's identities or conference branding. Check the repository's licence and the relevant owners'
terms before reusing assets elsewhere.
