# Published film and chapter example

Published film: **https://youtu.be/9C436tP0OEA**, uploaded 2026-10-09, 3:47.

This file documents the public film, not the owner's YouTube Studio settings. The uploaded MP4 is
frozen. The source example in this folder is a labelled, footage-free adaptation; its renders are not
replacement uploads.

## Chapters used for the published film

```text
0:00 One sentence in
0:28 The problem
0:42 What other methods need
1:03 Three stages
1:25 Marking up the script
1:41 The listener
2:15 Does it work?
2:31 Remove one module
2:44 Stylised faces
2:56 CHAT-AVD-50k
3:15 The public release
3:26 Summary and links
```

These timestamps belong to the published film. For a rebuilt or re-voiced example, generate timestamps
from its own timing instead:

```bash
node tools/export_script.mjs
node tools/chapters.mjs
```

Selected scenes in `js/script.js` carry `youtube:` titles. The tool checks zero start, chapter count,
minimum duration and speech boundaries. Inspect any merged or shifted chapter before using it.

## Disclosure and claims

Narration is synthetic (Kokoro-82M). The release footage in the published film was generated with the
public CHAT code using identities from HDTF; that footage is not included in this repository. The
paper's reported results and the release implementation are separate evidence sources.

The film's opening caption has a documented limitation: the displayed prompt does not establish every
source identity's provenance. See [CLAIMS.md](CLAIMS.md). It is omitted from this teaching copy and must
not be used as a cover claim.

For upload approval, disclosures, captions, honest covers, website embeds and README links, use the
[publication checklist](../../skills/paper-intro-video/references/publishing.md).
