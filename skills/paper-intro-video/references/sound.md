# Sound: the bed, the cues, the mix

Everything is synthesised by `tools/music.py` from two files that are exported from the film
(`build/full/timing.json`, `build/full/sfx.json`), so the sound follows the edit and the voice.
Nothing is sampled: there is nothing to license.

## The bed: a piano

The default bed is a soft synthesised piano: I, vi, IV, V on a 160 Hz root, one chord every four
beats of the film's grid, arpeggiated; single notes under the first scene, and the last sentence
lands on I and rings out. The notes and cues share a just-intonation tuning based on 40 Hz.
The piano works on headphones or loudspeakers, without relying on separated tones at each ear.
The soundtrack is made at −20 LUFS.

`--bed binaural` (on `make.mjs` or `music.py`) puts 40 Hz binaural beats there instead: 200 Hz in
the left ear, 240 Hz in the right. The beat exists only on headphones; on loudspeakers it is an
ordinary 40 Hz flutter, so say so whenever such a film is delivered, and keep the pair dry and
hard-panned (no reverb, widening or mono fold-down).

## The cues

Declared next to the pictures in `js/scenes.js` with `S.sfx(kind, at, opts)`; `mark`, `jot`,
`draw`, the page turn and camera travel add theirs automatically. They are soft and tuned to the
same 40 Hz series; under a voice they are support, not effects. If a scene sounds busy on paper
(more than about one cue a second), pass `quiet: true` to marks or lower `g`.

`node tools/export_sfx.mjs` writes the cue sheet (it prints how many cues there are);
`python tools/music.py` writes `audio/full/soundtrack.wav` plus `stem_music.wav` and `stem_sfx.wav`.
`--no-bed` gives the cues alone, `--no-sfx` the bed alone; `soundtrack.json` records which bed it is.

## The mix

`tools/render.mjs` (and so `make.mjs`) mixes automatically:

- voice at 0 dB over the bed at −3 dB;
- the bed lowered by a further 8 dB while somebody speaks, staying down across pauses shorter
  than 1.4 s (no pumping between lines);
- the result brought to **−16 LUFS** with peaks under −1 dBFS.

Aim for the voice to sit 12–18 dB above the bed while speaking. The mux report measures the source
stems after gain and ducking, before mastering and AAC encoding; listen once to judge the mix.
To change the mix without rendering the picture again:

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
`references/qa.md` lists the checks. Confirm loudness and true peak in the encoded file, and read
the pre-master voice-to-bed ratio in the mux report. With the binaural bed, also check that the left
ear still carries 200 Hz and the right 240 Hz after AAC encoding.
