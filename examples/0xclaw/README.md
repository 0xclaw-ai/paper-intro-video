# Example: the 0xClaw film

A complete five-minute film on this harness — the intro video for *0xClaw: Autonomous Open-ended
Agents with Phase-aware Budget Allocation and Temporal Pressure* (EMNLP 2026). It went through
five review rounds with its authors; `../../SKILL.md` and `../../references/` are what those
rounds taught. Frame for frame and sample for sample it rebuilds the delivered film (checked when
this example was made).

```bash
node tools/make.mjs --no-render        # voice laid in again, cue sheet, sound bed (2 minutes)
node tools/sheet.mjs --step 3          # look at it
node tools/make.mjs                    # the full render (about 10 minutes) → out/
```

The narration clips (`voice/full/af_heart/`, Kokoro-82M) are included, so no speech model is
needed to rebuild it. `js/pacing.js` is the plan the scenes were timed to (a Windows voice; the
film was built before the natural voice existed, which is why the plan and the film differ in
length — 5:26 against 5:08 — and why the map between them is a real test of the two clocks).

## Where to look for what

| pattern | scene (in `js/scenes.js`) |
| --- | --- |
| a cold open before the title: typed command, macro shot of a key, a list ticking off, a stamp | S1 |
| title card with a slogan whose two halves each get a small figure | S2 |
| a chart with points landing; a list on its words; two questions acted out; a three-row "fence" | S3 |
| one object handed along a pipeline on each spoken name, a second chart growing in step | S4 |
| numbers that count while squares fill and fly; a ticket printing with a selector per field; a question with a cursor that cannot decide; a bar chart with one bar that is "ours" | S5 |
| a gauge with a needle, a prompt being typed, a loop that speeds up | S6 |
| swapping headlines per finding; bars racing; a scatter with hand-drawn circles; a 2×2 table filling in; two stopwatches | S7 |
| tabs with a sliding pill over browser frames, then a wall of all of them | S8 |
| a terminal and a chat side by side; three contributions with a miniature each; the end card | S9 |

`js/script.js` shows the talk's structure (promise, slogan twice, fence, question, surprise,
contributions, one closing sentence), `say:` spellings for a voice, `caps: 'each'` and `breath`.
`js/data.js` shows numbers kept in one place with their tables. `css/film.css` is the layout.

The project's logo, wordmark and screenshots in `assets/` belong to the 0xClaw authors; the ACL
logo (`assets/acl-logo.svg`) is the ACL's. They are here so the example renders — do not reuse
them in another film.
