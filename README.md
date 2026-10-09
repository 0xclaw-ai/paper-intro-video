# paper-intro-video

A skill that makes a narrated intro video for a paper or project. The film is a web page, rendered frame by frame and timed to its voice.
[`examples/template-demo.mp4`](examples/template-demo.mp4) is 30 seconds of it.

## Quick start

Copy this to an agent:

```text
Research and use this skill: https://github.com/0xclaw-ai/paper-intro-video
```

The agent reads this repository and follows the skill. You do not install anything first.

## Install it yourself

```bash
npx skills add 0xclaw-ai/paper-intro-video
```

This works with any agent the [skills CLI](https://github.com/vercel-labs/skills) supports. It was
built and tested with Claude Code, where it also installs as a plugin:

```bash
claude plugin marketplace add 0xclaw-ai/paper-intro-video
claude plugin install paper-intro-video@0xclaw
```

Then ask for a video: *"Make an intro video for our paper. PDF: …, repo: …, site: …"*.
More prompts: [`prompts.md`](skills/paper-intro-video/references/prompts.md).

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
| `skills/paper-intro-video/` | the skill, its references (including publishing) and `template/` |
| `examples/0xclaw/` | a complete five-minute EMNLP 2026 film |
| `examples/chat/` | an ECCV 2026 teaching adaptation: narration and placeholders, no demo footage |
| `tests/` | checks for clip timing, chapters and the scene contract |
| `.claude-plugin/` | Claude Code plugin manifest |

## Licence

The skill and template are [MIT](LICENSE), copyright 0xClaw Team.
Bundled libraries, fonts, names and example images keep their own terms: [NOTICE](NOTICE.md).

## CHAT (ECCV 2026)

[Watch the 3:47 CHAT film](https://youtu.be/9C436tP0OEA) · [Source example](examples/chat/)
· [Paper](https://arxiv.org/abs/2607.02799) · [Project](https://junhaosong.com/chat/)

The second example shows a different visual identity: clean geometric marks, word-timed method diagrams,
clip playback and a synthesised piano bed. The source package includes narration and labelled plates in
place of demo footage. It is a teaching adaptation, not a frame-identical rebuild of the published film.
Its README records provenance and the known limitation of the published opening caption.
