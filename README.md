# paper-intro-video

A skill that makes a narrated intro video for a paper or project. The film is a web page, rendered frame by frame and timed to its voice.
[`examples/template-demo.mp4`](examples/template-demo.mp4) is 30 seconds of it.

## Quick start

Copy this to an agent:

```text
Research and use this skill: https://github.com/0xclaw-ai/paper-intro-video
```

The agent reads this repository, follows the skill, checks your machine and asks before it downloads anything.

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

## Update

| installed with | update with |
| --- | --- |
| `npx skills add` | `npx skills update paper-intro-video` (`-p` for project scope, `-g` for global) |
| the Claude Code plugin | `claude plugin update paper-intro-video@0xclaw`, or `/plugin` → Installed → Update now; then `/reload-plugins` or start a new session |
| `git clone` | `git pull --ff-only` in that clone; keep local edits backed up |
| a manual copy | back up the installed folder, then replace it with the current `skills/paper-intro-video/`; CLI updates need an installation recorded by that CLI |
| the Quick start prompt | ask the agent to fetch the current repository again; refresh any local clone or installed copy as above |

The third-party plugin marketplace has automatic updates off by default. Enable them at `/plugin` →
Marketplaces → 0xclaw → Enable auto-update. Commands: [skills CLI](https://github.com/vercel-labs/skills#skills-update),
[Claude Code plugins](https://code.claude.com/docs/en/plugins/install#keep-plugins-updated).

**Updating the skill does not migrate an existing film.** For an unfinished film, make a backup first,
then compare `template/tools/`, `template/js/lib/` and `template/js/media.js` with the film's copies.
Merge the changes, preserving custom tools, script, scenes, data and styles; run `doctor.mjs` and
`make.mjs` before accepting the migration. Do not rebuild or overwrite frozen deliverables.

## Without an assistant

```bash
git clone https://github.com/0xclaw-ai/paper-intro-video
cp -r paper-intro-video/skills/paper-intro-video/template my-film && cd my-film
node tools/doctor.mjs     # what this machine has; installs nothing
node tools/make.mjs       # voice → timing → sound → render → checks  →  out/
```

Needs Node 22+, Chrome/Chromium/Edge, and Python with `av numpy pillow scipy` (the doctor prints the
command for a `.venv` inside `my-film`). A natural voice
(Kokoro-82M, about 400 MB) is an optional one-time download; a built-in Windows voice or your own
recording work too.

## What is here

| | |
| --- | --- |
| `skills/paper-intro-video/` | the skill, its references (including publishing) and `template/` |
| `examples/0xclaw/` | a complete five-minute EMNLP 2026 film |
| `examples/chat/` | an ECCV 2026 teaching adaptation: narration and placeholders, no demo footage |
| `tests/` | the harness's own checks: `node --test tests/harness.test.mjs`, `python tests/test_media.py` |
| `.claude-plugin/` | Claude Code plugin manifest |

## Licence

The skill and template are [MIT](LICENSE), copyright 0xClaw Team.
Bundled libraries, fonts, names and example images keep their own terms: [NOTICE](NOTICE.md).

## CHAT (ECCV 2026)

[Watch the 3:47 CHAT film](https://youtu.be/9C436tP0OEA), made with this skill. [Its source](examples/chat/)
is a teaching adaptation, with labelled plates in place of the demo footage.
