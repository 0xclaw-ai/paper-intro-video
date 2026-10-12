# Prompts

Paste one of these to start or steer a film. The notes below say how to read the reply.

## Start a film

```text
Research and use this skill: https://github.com/0xclaw-ai/paper-intro-video
Make an intro video for our paper, for the conference and the project site.
Sources: the PDF at <path>; the repository at <path or link>; the website <link>.
About five minutes. English narration and English captions, plus a copy without captions.
Use the skill's default look. The project name is pronounced "<…>".
Check this machine first, and ask before any download.
```

## A review round

```text
(Screenshots attached.) Figure 1: <problem>. Figure 2: <problem>. Leave the rest unchanged.
Re-render, and say what changed and whether the length changed.
```

## Another voice

```text
Change the narration to am_michael. Or give me short samples of a few voices and let me choose.
Captions and pictures must follow the new voice.
```

## Change a line

```text
Change line 17 to: "<new sentence>". Re-synthesise only that line.
```

## Fix a pronunciation

```text
"<Name>" is pronounced "<…>", not "<…>". Change it everywhere.
```

## Use a recording

```text
I recorded each line in script/full/narration.md and put the files in voice/full/me/.
Rebuild the film with that recording.
```

## Check the facts

```text
Check every number in the film against the paper. List the source of each one.
Mark any claim the paper does not make.
```

## Reading feedback

Ask only for what the sources cannot tell you: audience, length and who set it, pronunciation, and venue rules you cannot find. State every other assumption and continue.

A screenshot note names a rule, not only a pixel. "This looks generated" means the whole art direction. "Too many words" means one idea per screen. "Not enough animation" means act out each line. "The numbers are static" means count each one up on its word. "This seam must not appear" means check every camera position. "Write the venue in full" means the name, then the abbreviation in brackets. "This is not slides" means remove slide labels. "The narration is required" means captions follow the voice. "It looks crooked" means measure the visual centre before answering.

When a note says the rest is fine, change only what was asked. If a fix is extended, say so. Answer a question without starting an edit. Keep a rule that applies to the next film; do not keep a one-off wording change.
