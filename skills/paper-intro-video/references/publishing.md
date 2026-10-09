# Publishing a film

Treat the approved MP4, its captions and the recorded narration as frozen once the user closes the film.
A cover or link update is not permission to rebuild it. Prepare files locally; obtain approval before an
upload, push or public post. An example in a skill repository is a separate publication boundary.

## YouTube

- YouTube cannot replace a video's file while retaining its URL. A revised film needs a new upload;
  metadata and thumbnails can be edited on the existing video. Keep the old upload until the owner
  decides its visibility. Do not delete it as part of updating links.
- Deliver the caption-free MP4 plus timed SRT/VTT. Ask the owner to verify the uploaded caption track,
  especially names and numbers, and review the platform's altered/synthetic-content disclosure. A
  note about synthetic narration does not replace a required disclosure for realistic generated people.
- Update links deliberately: project page, README, venue portal and any existing posts. Confirm each
  public change separately. Keep the current video ID in one place per site where possible.

### Chapters

Give selected scenes a `youtube: 'Title'` in `js/script.js`, then run:

```bash
node tools/export_script.mjs
node tools/chapters.mjs
```

Paste `build/full/chapters.txt` into the description. Requirements: first timestamp at 0:00, at least
three ascending timestamps, every chapter at least 10 seconds (including the last, to the film's end).
The tool starts at the first spoken line of a marked scene, rounded down, except for the first chapter
at zero. It may shift a short boundary by a few seconds into a speech gap, or merge a short chapter into
its neighbour. Review the printed durations and titles after these adjustments; a valid timestamp is not
necessarily a good editorial boundary. Rebuild after a timing change.

These are necessary rules, not a guarantee of display: channel access and platform eligibility also
matter. Check chapters on the published watch page. [YouTube's chapter requirements](https://support.google.com/youtube/answer/9884579?hl=en).

## Website: a poster first, a player on request

Use a local, optimised poster with explicit 16:9 dimensions and an accessible play button. On click or
keyboard activation, replace it with an iframe. This avoids loading the third-party player before the
visitor chooses to watch. Keep a normal YouTube link beside it for blocked embeds.

```html
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID?autoplay=1&rel=0"
  title="Watch the project film" width="1280" height="720"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
```

Keep the outer container at `aspect-ratio: 16 / 9`; set iframe width and height to 100%, border to 0.
Use a button rather than a clickable div. Move keyboard focus into the replacement player and give the
button an explicit accessible name. The privacy-enhanced domain does not mean the player sends no data
once loaded. Avoid loading a remote thumbnail before consent when a local cover is available.

Error 153 means missing Referer or equivalent client identification. Test on the intended HTTPS site,
not `file://`; check that site headers and iframe attributes do not impose `no-referrer`. The
`strict-origin-when-cross-origin` policy sends only the site's origin cross-origin, not its full path.
If using the IFrame API, also configure its `origin` parameter. [YouTube player errors](https://developers.google.com/youtube/iframe_api_reference#onError).

## GitHub README: linked image, not an iframe

GitHub README rendering does not provide a YouTube iframe player. Use a local cover linked to the watch page:

```markdown
[![Watch the project film (3:47)](assets/video.jpg)](https://youtu.be/VIDEO_ID)
```

Use the actual duration. Verify the image path on the intended branch, link destination, mobile crop,
keyboard access, console/network failures on the website, and playback on the live origin.

## Covers and examples must tell the truth

A cover is a new claim surface, not an exempt crop of the film. Use high-quality images with clear
provenance; keep generated behaviour separate from real source identities, and paper results separate
from released-code results. A pleasing picture is not evidence for a caption. Leave a known misleading
frame out of covers even if the approved film still contains it.

When sharing source examples, inventory assets and rights before copying. Preserve third-party notices;
link to the published film rather than redistributing footage whose rights are unclear. Label missing
footage as placeholders and document how the teaching copy differs from the film. Never present a
placeholder render as a reproduction of the paper's results.
