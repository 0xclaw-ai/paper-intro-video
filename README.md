# paper-intro-video

A skill for [Claude Code](https://claude.com/claude-code) that makes narrated, animated intro videos
for research papers and projects — and the harness it uses.

A film is a web page: a 1920×1080 stage whose every frame is a function of time. A headless browser
renders it frame by frame, a voice is laid over it, and captions and pictures are timed to the words
of that voice, so the voice can be swapped or re-paced and everything follows.
[`examples/template-demo.mp4`](examples/template-demo.mp4) shows 30 seconds of it.

## Install

```bash
git clone https://github.com/0xclaw-ai/paper-intro-video ~/.claude/skills/paper-intro-video
```

Then ask for a video: *"Make an intro video for our paper. PDF: …, repo: …, site: …"*.
More prompts, in Chinese and English: [`references/prompts.md`](references/prompts.md).

## Without an assistant

```bash
cp -r template my-film && cd my-film
node tools/doctor.mjs     # what this machine has; installs nothing
node tools/make.mjs       # voice → timing → sound → render → checks  →  out/
```

Needs Node 22+, Chrome/Chromium/Edge, and Python with `av numpy pillow scipy`. A natural voice
(Kokoro-82M, about 400 MB) is an optional one-time download; a built-in Windows voice or your own
recording work too.

## What is here

| | |
| --- | --- |
| `SKILL.md` | the workflow: facts → script → voice first → scenes → sound, render, checks → handover |
| `references/` | story, design, motion, the harness, voice, sound, checks, pitfalls, prompts |
| `template/` | the harness and a 30-second demo film; copy it to start |
| `examples/0xclaw/` | a complete five-minute film (EMNLP 2026) built on it |

## Credits

Bundled: Rough.js (MIT), Phosphor Icons (MIT), Simple Icons (CC0). Typefaces load from Google Fonts
(SIL OFL). The narration clips were synthesized with Kokoro-82M (Apache-2.0); the sound bed is
synthesized by the tools. The logo, wordmark and screenshots under `examples/0xclaw/assets/` belong
to the 0xClaw authors, the ACL logo to the ACL — they are there so the example renders.
