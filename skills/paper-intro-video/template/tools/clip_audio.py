#!/usr/bin/env python
"""Lay a clip's own sound on the film, where js/scenes.js plays that clip, and say where the music ducks.

    python tools/clip_audio.py [--cut full]   ->  audio/<cut>/clips.wav  (the film's length, silent elsewhere)
                                                   build/<cut>/duck.json (narration and these sounds)

js/scenes.js sets a mark where an audible clip starts, at the same time it plays the clip:

    S.mark('demoSound', c.result);  OXMEDIA.play(S, img, 'demo', { at: c.result, from: 1.5 });

and SOUND_MARKS below names, for each such mark, the clip and the `from` passed to OXMEDIA.play. The cue
sheet (node tools/export_sfx.mjs) carries the marks in film time and media/manifest.js says which source
seconds each clip shows, so picture and sound stay in sync whatever voice paces the film. Then render with
the clip sound under the narration and the music ducked under both:

    node tools/render.mjs --audio audio/<cut>/bed.wav,-1 --audio build/<cut>/narration.wav,0 \\
        --audio audio/<cut>/clips.wav,-1 --duck build/<cut>/duck.json,-8
"""
import argparse, json, os, re, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
# mark set in js/scenes.js -> (clip in media/manifest.js, the `from` that js/scenes.js passes to OXMEDIA.play)
SOUND_MARKS = {
    # 'demoSound': ('demo', 1.5),
}


def read(path):
    with wave.open(path, 'rb') as w:
        assert w.getframerate() == SR and w.getsampwidth() == 2, path
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels())
    return x if x.shape[1] == 2 else np.repeat(x, 2, axis=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    a = ap.parse_args()
    if not SOUND_MARKS:
        raise SystemExit('No clip sounds: fill SOUND_MARKS at the top of tools/clip_audio.py first.')
    cues = json.load(open(os.path.join(ROOT, 'build', a.cut, 'sfx.json')))
    man = json.loads(re.search(r'=\s*(\{.*\});', open(os.path.join(ROOT, 'media', 'manifest.js')).read(), re.S).group(1))
    out = np.zeros((int(round(cues['duration'] * SR)), 2), np.int16)
    windows = []
    for mark, (clip, start_in_clip) in SOUND_MARKS.items():
        if mark not in cues['marks']:
            raise SystemExit(f'no mark "{mark}" in build/{a.cut}/sfx.json: set it in js/scenes.js, then run node tools/export_sfx.mjs')
        snd = man[clip]['sound']
        x = read(os.path.join(ROOT, snd['wav']))
        lead = snd['start'] - man[clip]['start']           # seconds into the clip where its sound begins
        t0 = cues['marks'][mark] + (lead - start_in_clip)   # the picture shows clip second `start_in_clip` at the mark
        i0 = max(0, int(round(t0 * SR)))
        n = max(0, min(len(x), len(out) - i0))
        out[i0:i0 + n] = x[:n]
        windows.append({'start': round(t0, 3), 'end': round(t0 + len(x) / SR, 3)})
        print(f'{mark}: {clip} sound {len(x) / SR:.2f}s at film {t0:.3f}s')
    os.makedirs(os.path.join(ROOT, 'audio', a.cut), exist_ok=True)
    with wave.open(os.path.join(ROOT, 'audio', a.cut, 'clips.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
    print(f'audio/{a.cut}/clips.wav  {len(out) / SR:.2f}s')
    voice = json.load(open(os.path.join(ROOT, 'build', a.cut, 'voice.json')))
    windows += [{'start': c['start'], 'end': c['end']} for c in voice['cues']]
    json.dump({'cues': sorted(windows, key=lambda w: w['start'])}, open(os.path.join(ROOT, 'build', a.cut, 'duck.json'), 'w'), indent=1)
    print(f'build/{a.cut}/duck.json: {len(windows)} windows (narration and clip sounds)')


if __name__ == '__main__':
    main()
