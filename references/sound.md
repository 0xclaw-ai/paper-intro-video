# Sound: the bed, the cues, the mix

Everything is synthesized by `tools/music.py` from two files that are exported from the film
(`build/full/timing.json`, `build/full/sfx.json`), so the sound follows the edit and the voice.
Nothing is sampled: there is nothing to license.

## The bed: 40 Hz binaural beats

The user asked for copyright-free 40 Hz binaural beats instead of a composed score. A 200 Hz sine
in the left ear, 240 Hz in the right; the 40 Hz difference only exists once the brain puts the two
ears together. Underneath, a quieter pair at 80 / 120 Hz and a little decorrelated air that lifts
at each scene change.

- **Headphones only.** On loudspeakers the tones mix in the air into an ordinary 40 Hz flutter.
  Say this to the user every time the bed is delivered.
- Keep the pair dry and hard-panned: no reverb, no stereo widening, no mono fold-down. The voice
  sits in the middle and does not disturb it.
- Made at −20 LUFS (pure tones read louder than music).

## The cues

Declared next to the pictures in `js/scenes.js` with `S.sfx(kind, at, opts)`; `mark`, `jot`,
`draw`, the page turn and camera travel add theirs automatically. They are soft and tuned to the
same 40 Hz series; under a voice they are support, not effects. If a scene sounds busy on paper
(more than about one cue a second), pass `quiet: true` to marks or lower `g`.

`node tools/export_sfx.mjs` writes the cue sheet (it prints how many cues there are);
`python tools/music.py` writes `audio/full/soundtrack.wav` plus `stem_music.wav` and `stem_sfx.wav`.
`--no-bed` gives the cues alone, `--no-sfx` the bed alone.

## The mix

`tools/render.mjs` (and so `make.mjs`) mixes automatically:

- voice at 0 dB over the bed at −3 dB;
- the bed lowered by a further 8 dB while somebody speaks, staying down across pauses shorter
  than 1.4 s (no pumping between lines);
- the result brought to **−16 LUFS** with peaks under −1 dBFS.

Measured on the example: the voice sits about 15 dB above the bed while speaking. To change the
mix without rendering the picture again:

```bash
python tools/mux.py --video build/full/video_en.mp4 --out out/myfilm_captions_en.mp4 \
  --audio audio/full/soundtrack.wav,-3 --audio build/full/narration.wav,0 \
  --duck build/full/voice.json,-8 --lufs -16
```

The first `--audio` is the bed (the one that is ducked). To use the user's own music, pass it
there instead (and `python tools/music.py --no-bed` if the cues should stay); check its licence
with them.

## Checks (no ears needed)

`python tools/audio_report.py audio/full/soundtrack.wav build/full/spectrogram.png` prints band
balance and level over time and draws a spectrogram with the scene starts. After a render,
`references/qa.md` lists what to confirm in the encoded file: loudness, peak, voice-to-bed
distance, and that the left ear still carries 200 Hz and the right 240 Hz after AAC encoding.
