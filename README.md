# paper-intro-video

A skill for [Claude Code](https://claude.com/claude-code) that makes narrated, animated intro videos
for research papers and projects — and the harness it uses.

A film is a web page: a 1920×1080 stage whose every frame is a function of time. A headless browser
renders it frame by frame, a voice is laid over it, and captions and pictures are timed to the words
of that voice, so the voice can be swapped or re-paced and everything follows.
[`examples/template-demo.mp4`](examples/template-demo.mp4) shows 30 seconds of it.

## Install

```bash
npx skills add 0xclaw-ai/paper-intro-video
```

installs it for any agent the [skills CLI](https://github.com/vercel-labs/skills) supports; it was
built and tested with Claude Code, where it also installs as a plugin:

```bash
claude plugin marketplace add 0xclaw-ai/paper-intro-video
claude plugin install paper-intro-video@0xclaw
```

Then ask for a video: *"Make an intro video for our paper. PDF: …, repo: …, site: …"*.
More prompts, in Chinese and English: [`prompts.md`](skills/paper-intro-video/references/prompts.md).

## Without an assistant

```bash
git clone https://github.com/0xclaw-ai/paper-intro-video
cp -r paper-intro-video/skills/paper-intro-video/template my-film && cd my-film
node tools/doctor.mjs     # what this machine has; installs nothing
node tools/make.mjs       # voice → timing → sound → render → checks  →  out/
```

Needs Node 22+, Chrome/Chromium/Edge, and Python with `av numpy pillow scipy`. A natural voice
(Kokoro-82M, about 400 MB) is an optional one-time download; a built-in Windows voice or your own
recording work too.

## What is here

| | |
| --- | --- |
| `skills/paper-intro-video/` | the skill: `SKILL.md` (the workflow: facts → script → voice first → scenes → sound, render, checks → handover), `references/` (story, design, motion, the harness, voice, sound, checks, pitfalls, prompts) and `template/` (the harness and a 30-second demo film; copy it to start) |
| `examples/0xclaw/` | a complete five-minute film (EMNLP 2026) built on it |
| `examples/chat/` | ECCV 2026 teaching adaptation; source and narration, with placeholders instead of demo footage |
| `.claude-plugin/` | what makes the repository installable as a Claude Code plugin |

## Credits

Bundled: Rough.js (MIT), Phosphor Icons (MIT), Simple Icons (CC0). Typefaces load from Google Fonts
(SIL OFL). The narration clips were synthesized with Kokoro-82M (Apache-2.0); the sound bed is
synthesized by the tools. The logo, wordmark and screenshots under `examples/0xclaw/assets/` belong
to the 0xClaw authors, the ACL logo to the ACL — they are there so the example renders.

## CHAT (ECCV 2026)

[Watch the 3:47 CHAT film](https://youtu.be/9C436tP0OEA) · [Source example](examples/chat/)
· [Paper](https://arxiv.org/abs/2607.02799) · [Project](https://junhaosong.com/chat/)

The second example shows a different visual identity: clean geometric marks, word-timed method diagrams,
clip playback and a synthesised piano bed. The source package includes narration and labelled plates in
place of demo footage. It is a teaching adaptation, not a frame-identical rebuild of the published film.
Its README records provenance and the known limitation of the published opening caption.
