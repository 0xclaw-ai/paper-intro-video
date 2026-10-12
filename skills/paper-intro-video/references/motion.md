# Motion: a performed explainer

The second version of the first film was a set of well-composed stills that faded in. Measured,
the picture did not change for 51 % of its running time. The user's verdict: "not enough
animation". The third version was still for 7 % and was accepted. The difference is a contract:

1. **Every narrated phrase is acted out on its words.** Not "the bullet appears", but the thing the
   sentence says, happening while it is said.
2. **Something meaningful moves every second.** Not decoration — the next step of the action.
3. **The camera never parks.** It leans, pushes in and travels; scenes change with a page turn,
   not a cross-fade.

`node tools/stillness.mjs` measures it: aim for about 6 % still and no hold longer than 2 s.

## Turn a line into a performance

For each narration line ask: *what would a person at a whiteboard do while saying this?*

| the line says | the screen does (from the example) |
| --- | --- |
| "Give this agent a hackathon link." | the link is typed into a prompt, the camera goes close on the Enter key, the key is pressed |
| "…as seven fixed phases: research, idea, selection, …" | a baton frame hops from artefact to artefact, landing on each name as it is said |
| "…writes one control token: tokens, time, thinking, and repairs." | a ticket prints line by line; on each word a selector runs along the options and stops |
| "fine-tuned on fifty thousand real hackathon projects" | a counter runs to 50,669 while 51 squares fill, then stream into the model |
| "The same quality as Claude Code, with 59 % fewer tokens." | two bars grow at the same speed; one simply stops; a brace marks the missing length |
| "about two and a half times slower" | two stopwatches; one keeps running |
| "Which phase should get the most?" | a cursor that cannot make up its mind hops between the options until the answer |
| a list of eight projects | a tab per project, a pill sliding to the one on screen, each page scrolling slightly |

Patterns worth reusing: **type it** (`S.type`), **count it** (`S.count`, `counter`), **race it**
(two bars, one `S.call` driving both), **tick it off** (`mark` with `data-mark="tick"`), **hand it
on** (one frame element tweened between measured boxes), **stamp it** (scale 1.9 → 1 with `inQuad`,
a `low` thump), **scan it** (a highlight bar stepping down rows), **dim the rest** (opacity 0.35 on
everything that is not the point).

## Words that belong to pictures

Whatever belongs to a word starts on that word: `S.w('cue', 'word', fallback)` is the time it is
said. Entrances start about 0.2–0.3 s before the word (so the thing is there when the word lands),
ticks and selections on the word, marks slightly after.

```js
[['words.', 1.1], ['voice.', 2.6], ['pictures,', 3.9]].forEach(([word, fb], i) => {
  const tt = S.w('steps', word, fb) - 0.3;
  S.fromTo(steps[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: tt, dur: 0.5 });
  S.sfx('pop', tt, { n: i, g: 0.5 });
});
```

**Numbers count up on their word.** A result runs to its value while it is said, as a bar grows or a
point lands; a number that simply appears reads as a slide. Start just before the word (`decimals`,
`prefix`, `suffix` and `sep` format the number):

```js
const tN = S.w('result', '93', 2.0) - 0.2;
S.count('.result .n', 0, 93, { at: tN, dur: 1.0, suffix: ' %' });
```

Between words, plain offsets from the line's start are fine (`c.token + 2.9`).

## The camera

A scene is a strip of 1920-wide **stations**; `camera(S, lay, keys)` looks at a point of a station
at a zoom, and after arriving keeps pushing in slowly (0.45 % per second), so nothing is ever
frozen.

- Give each idea of a scene its own station and travel between them (0.9 s, a soft whoosh is added
  automatically). Stations are 2400 px apart, so a neighbour never shows.
- Within a station, lean towards what is being talked about: `{ x: 800, y: 470, s: 1.16 }`. Keep
  scales between 1.0 and 1.15; one macro shot (2×) per film at most.
- After every camera pass, render a contact sheet and look for cut headlines, figures at the
  frame edge, figures pushed into the headline that stays put, and strips of the wrong ground.
- The headline of a chapter starts centred and large, then settles top-left (`chapter()`); it is
  chrome — it does not move with the camera.

## Type and marks

- Statements rise word by word out of a mask (`words()`); 0.07–0.12 s per word. A sentence that
  is spoken on screen (the end card) takes one time per word from `S.ws('cue')`.
- Hand-drawn marks are drawn, not faded: `mark(S, el, at)` tweens the pen along each stroke and
  adds a pen sound. Use them like a presenter uses a marker: after the word, once.
- Handwritten notes (`.hand`) land slightly askew with `jot()`.

## Rhythm

- A scene opens with its headline alone for about a second, then the first beat.
- Sentence pauses of the voice are about 0.8 s: enough for one entrance, not for three. Spread
  entrances over the words rather than stacking them in the pause.
- After a question, wait (a 1.2 s `gap`); the sound bed can hold its breath there.
- The end card holds for about five seconds after the last element arrives, then fades to the
  card colour.

## What not to do

- No CSS transitions or animations, no `setTimeout`, no `requestAnimationFrame` loops: a frame
  must be reproducible from the time alone, or the parallel renderer produces garbage. Everything
  goes through the timeline (`references/engine.md`).
- No motion for its own sake: floating particles, breathing gradients, parallax backgrounds.
  The stillness number can be gamed that way and the film gets worse.

## Clips are motion too

Use `OXMEDIA.play` for video material, not a self-playing `<video>`; see `engine.md`. Clip frames run in
film time so their own audio remains synchronised even when narration re-times the surrounding scene.
In clean-mark mode (`OXCLEAN`), geometric marks still reveal on cue, but without a pen scratch.
A stillness target is a diagnostic, not a reason to add movement while viewers are reading a result.
