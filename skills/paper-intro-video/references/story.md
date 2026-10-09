# The talk: structure and script

The film is a talk with pictures, not a paper with motion. Write the narration first
(`js/script.js`), read it aloud in your head, and only then think about what is on screen.

## Structure — Patrick Winston's "How to Speak", applied

The user who commissioned the first film pointed at Winston's MIT talk; the structure has held up
through every review round. Decide these before writing a line:

| Winston | in the film | in the 0xClaw example |
| --- | --- | --- |
| **Start with a promise** — say what the audience will have at the end | cold open: one sentence, with the time it really takes | "In five minutes: how it finishes an open-ended project on time and on budget." + a live countdown |
| **A story** — something concrete that happened | the first ten seconds, before the title | a hackathon link is typed, Enter is pressed, the phases tick off, "1st place" |
| **A slogan** — a phrase that carries the idea, cycled | on the title card and again when the idea has been explained | "A budget for every phase. A deadline it can feel." — each half with a small figure that acts it out |
| **A salient idea** — the one thing that sticks out | its own screen, early | two small controllers, two questions: *How much?* and *How to behave?* |
| **Build a fence** — say what the idea is not | one screen, three rows: what others do, what this does | budget methods cap one call · multi-agent systems split roles · this budgets the whole project |
| **Ask a question, and wait** | a question to the viewer, then a real pause (the sound stops) | "Which phase should get the most?" — 2 s — "Research, the least. Coding, the most." |
| **A surprise** — a result people do not expect | the big number, alone on screen, counting up | 93 % exact where larger prompted models stay under 24 %; same quality at −59 % tokens |
| **A symbol** — a picture that stands for the idea | one or two recurring objects | the control token as a ticket; the pressure gauge; the seven-phase track |
| **End on contributions** — never "thank you", never "questions?" | the last thing said is what was contributed; the last card is one sentence that says what the work is, then where to find it | "0xClaw is the first to quantify open-ended hackathons and to compete in them autonomously." + links, authors, venue |

A slogan has to say what the work *does*. "Route the budget. Frame the deadline." was rejected: it
only named the two components. "A budget for every phase. A deadline it can feel." says what happens.

## A shape that works for a five-minute paper film

| scene | seconds | what it does |
| --- | --- | --- |
| Cold open | 15 | the story and the promise, on a dark card, before any title |
| Title card | 9 | title, authors, affiliation, venue in full, the slogan |
| 1 · Problem | 35–40 | why this is hard, in the audience's terms; the fence |
| 2 · The setup / pipeline | 15–20 | the minimum of mechanism needed to follow the idea |
| 3 · Idea, part one | 60–70 | the first contribution, acted out; the question; the surprise |
| 4 · Idea, part two | 35 | the second contribution; then the slogan again |
| 5 · Results | 70–80 | "Does it work?" — setup, two or three findings, what it costs, limits |
| 6 · Showcase | 25 | what it produces: real outputs, quickly |
| Use it · contributions · end card | 30 | how to run it, the three contributions, one sentence, links |

About 600 words of narration make five minutes. If the venue has a length rule, that is the
limit; if the limit is yours, say so, and do not cut content to meet it without being asked —
a "tighter four-minute version" was built once and then dropped in favour of the complete one.

## Writing lines for a voice

A cue in `js/script.js` is one narration line: a sentence or two that belong to one picture.

- **One breath.** 8–20 words. A line that needs a comma splice is two lines.
- **Sentences that end.** Voices (and listeners) need full stops. Lists are fine when each item
  gets its own picture: "Twenty real hackathons. Ten other agents. One shared model underneath."
- **Say numbers the way a person would.** "about two and a half times slower", "nine out of ten" —
  and keep the exact figure on screen. Put what a voice would stumble over into `say`:
  `en: '… right 93% of the time.'`, `say: '… right ninety-three percent of the time.'`,
  `0xClaw` → `Zero X Claw`, `MVP` → `M V P`, `0.91` → `zero point nine one`. Captions show `en`.
- **Ask the user how names are pronounced** (the project's name, baselines, people). You cannot
  hear the result; a wrong name is the first thing they will.
- **No claim beyond the sources.** "First", "best", "state of the art", dates, prizes: only what
  the paper or repository says, in its wording ("second-best baseline", not "runner-up"). When the
  user asks for a stronger claim, identify the missing evidence and agree on a qualified version.
- **Leave room for the picture.** A line that describes exactly what is on screen is wasted; say
  the meaning, show the thing.
- **Mark lines whose sentences each bring a picture** with `breath: 1.0` — the voice then pauses at
  least that long between them (see the project list in the example).
- **`caps: 'each'`** shows one caption per sentence for such lists.

```js
{ id: 'setup', dur: 7.6, gap: 0.5, caps: 'each',
  en: 'Does it work? Twenty real hackathons. Ten other agents. One shared model underneath.' },
{ id: 'acc', dur: 7.0,
  en: 'It gets the whole token right 93% of the time. Prompting bigger models does not come close.',
  say: 'It gets the whole token right ninety-three percent of the time. Prompting bigger models does not come close.' },
```

`dur` is only your guess (about 0.4 s per word); the first voice replaces it. `gap` is the pause
before the next line (0.4 s by default) — make it longer where the viewer has to think (after the
question: 1.2 s).

## Before moving on

Read the whole script top to bottom once more and check: does the first line make a promise?
Could a person outside the field follow the problem scene? Is each line one idea? Does anything
claim more than the sources? Is the last sentence about the work rather than about gratitude?
Then show the user the storyline in a few lines (not the whole script) and keep going — they
steer by reviewing versions, not by approving outlines.

## A claims ledger, including the pictures

Keep `CLAIMS.md`: wording, source (paper section/table or public URL), and status. Audit narration,
on-screen labels, captions, title, description and cover separately. Correct narration does not excuse an
unsupported caption. A shared prompt shown beside several pairs does not establish how their identities
were made. State what the footage establishes, not what the arrangement suggests.

Distinguish the paper system, the released implementation, real source identities and generated behaviour.
Keep that qualifier visible for the whole clip. A schematic is not a measured trace. Rounded narration
("nearly 1,400 hours") may accompany an exact on-screen value (1,388.9), but keep the same unit and scope.
Use digits in `en` and pronunciation in `say`; changing captions need not regenerate the approved voice.
The CHAT example's ledger shows how to retain a known limitation without presenting it as verified.
