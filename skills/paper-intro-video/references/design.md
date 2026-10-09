# The look

The first version of the first film was rejected on sight: a dark purple gradient, glowing
rounded cards, pill chips, Inter, generic line icons. "People see it is AI and stop watching."
Everything below follows from taking that seriously.

## Pick an art direction, then stay inside it

The template's direction is **an annotated paper**: warm paper stock, ink, one accent colour and
a marigold highlighter; a serif for statements, a quiet tracked sans for labels, a mono for code,
a hand for notes; hand-drawn marks for emphasis; real product windows (terminal, chat, browser)
as the props. It suits research work and was approved as "much better". Keep it unless the
project has a strong identity of its own — then derive the tokens from that identity (its logo
colours, its website type) instead of from a generic palette.

The tokens are the top of `css/base.css`:

| token | default | role |
| --- | --- | --- |
| `--paper` | `#F3F0E7` | the ground of every content scene |
| `--ink`, `--ink-2`, `--ink-3` | `#191713`, `#57534A`, `#9A9588` | text, secondary text, quiet labels |
| `--night` | `#4A3A18` | dark cards (cold open, title, end): **a dark tone of the paper's own hue, never black** |
| `--cream`, `--cream-2` | `#F3F0E7`, 62 % of it | text on dark cards |
| `--violet` | `#5A33D6` | the one accent: "ours", the idea, live things |
| `--gold` | `#F2B32C` | the highlighter, and the accent on dark cards |
| `--red` | `#CF4326` | pen marks, warnings, what goes wrong |
| type | Newsreader / DM Sans / JetBrains Mono / Caveat | statements / labels / code / handwritten notes (SIL OFL, loaded from Google Fonts) |

To find a dark card colour for another paper tone: keep the hue, drop lightness to about 19 %,
raise saturation — and check the contrast of cream text on it.

## Rules a screen has to pass

- **One idea, a dozen words.** Count them. Labels and numbers on figures do not count; sentences do.
- **The point is visibly marked.** `<span class="mk" data-mark="underline|highlight|circle|…">`.
  One or two marks per screen; a screen where everything is marked has no point.
- **A big number stands alone.** `.hero-n` at 240 px, a small tracked kicker under it, nothing
  competing. It counts up while it is said.
- **Real things over diagrams of things.** A terminal with the real command, the real file names,
  the real prompt text, a screenshot of the real output. Schematic figures are labelled "schematic"
  on screen when they are not measured data.
- **No slide furniture.** No "(3) chapter name" label above a headline (the bar at the bottom says
  where we are), no agenda, no logos in corners except the brand and the venue, no page numbers.
- **Readable at a glance, on a laptop.** Body statements 54–100 px, labels never under 20 px,
  names and affiliations 28–34 px on title and end cards.

## Title card and end card

- Paper title in full; authors without footnote marks (no asterisks or daggers unless there is a
  line that explains them); affiliations; the venue **written out with the abbreviation in
  brackets** — "The 2026 Conference on Empirical Methods in Natural Language Processing (EMNLP
  2026)" — and the venue's logo if there is an official one (say where it came from and that the
  organisers decide whether it may be used).
- The end card: the brand, **one sentence that says what the work is** in the statement type
  (cream, about 100 px, three lines at most, each word coming up as it is spoken), then links,
  authors, affiliations, venue. It sits in the middle while it is being said and moves up when the
  rest arrives, so the card is never half empty.
- Both are dark cards; so is a cold open before the title.

## Captions

Words only: 37 px DM Sans 600, ink on paper and cream on dark cards, with an 8 px outline in the
ground colour so they hold on any background. No box, no bar. 78 px from the bottom, above the
chapter bar. Tell `ST.captions({ dark: [[from, to], …] })` where the ground is dark. Keep the
bottom 170 px of every station free of content that matters.

## Icons, logos, images

- Icons: Phosphor (MIT), bundled in `assets/icons/phosphor/` with weights available in the local bundle; `light` for large
  icons, `regular` for small ones. `<i data-ph="funnel" data-w="light"></i>`. To add one, put its
  SVG in the folder and run `node tools/build_icons.mjs` (getting a new SVG is a download: ask).
  Brand marks: Simple Icons (CC0) in `assets/icons/simple-icons/`.
- Use the project's own logo and wordmark as they are. **Align a lockup by eye:** set the lettering
  on the mark's visual centre (centre of mass), not on its box — a crown, a tail or a shadow moves
  the box but not the eye. Measure both and nudge with `position: relative; top: Npx`.
- Screenshots of real outputs go into window frames (`.win` in base.css; the example's browser
  `.frame` in its film.css), never raw.
- No stock illustration, no generated pictures as content.

## Grounds and edges

- A dark card inside a paper scene reaches past the frame (`.station.dark` has a 240 px
  box-shadow in its own colour): no camera position may show a strip of paper around it. Check the
  first and last frame of every dark card on a contact sheet.
- The film starts on its first composed frame (no fade from black) and ends by fading to the dark
  card colour.
- A camera key must never cut a headline or a figure at the frame edge, and must never push a
  figure into the headline that stays put. Scales between 1.0 and 1.15 are almost always enough;
  2× only for a deliberate macro shot of one detail.

## Clean marks for a different identity

For a crisp, technical look, set `window.OXCLEAN = true` before `js/lib/annotate.js`. Marks become straight
underlines, flat highlights, ellipses and chevron arrows; the stage helper suppresses their pen sound.
`window.OXROUGH` scales roughness when clean mode is off. The template stays hand-drawn by default.
Choose deliberately; CHAT uses clean marks rather than imposing the annotated-paper look on its brand.

The underline's text-coloured ground stroke in `base.css` clears descenders. Match it to the actual ground
if a marked word sits on a custom-coloured panel. Scenes bleed 3 px in their own ground to hide fractional
pixel seams during page turns. Check the encoded frames, not just the browser preview.
