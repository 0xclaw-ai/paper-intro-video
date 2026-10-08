#!/usr/bin/env python
"""Checks on a finished film's sound that need no ears.

    python tools/check_audio.py [out/<film>.mp4] [--cut full]

Decodes the AAC track of the MP4 and reports: loudness (target -16 LUFS) and peak (below -1 dBFS);
the level while somebody speaks and between lines; how far the voice sits above the bed (the voice
is centred, so the side signal while speaking is the bed alone); and whether the binaural pair
survived the encode — 200 Hz in the left ear only, 240 Hz in the right only — measured in the
longest stretch without speech. Needs: av (PyAV), numpy — the same Python as tools/mux.py.
"""
import argparse, json, os, sys
import av
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import mux


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video', nargs='?')
    ap.add_argument('--cut', default='full')
    args = ap.parse_args()
    timing = json.load(open(os.path.join(ROOT, 'build', args.cut, 'timing.json'), encoding='utf-8'))
    path = args.video or os.path.join(ROOT, 'out', timing.get('slug', 'film') + (f'_{args.cut}' if len(timing.get('cuts', [args.cut])) > 1 else '') + '.mp4')
    c = av.open(path)
    if not c.streams.audio:
        raise SystemExit(f'{path}: no audio track')
    a = c.streams.audio[0]
    sr = a.codec_context.sample_rate
    chunks = []
    for f in c.decode(a):
        x = f.to_ndarray()
        chunks.append((x.reshape(1, -1) if x.ndim == 1 else x).astype(np.float64))
    x = np.concatenate(chunks, axis=1).T                             # (n, channels)
    if np.abs(x).max() > 2:
        x = x / 32768.0
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    n = len(x)
    rms = lambda y: 20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-12)
    loud, peak = mux.lufs(x.astype(np.float32)), 20 * np.log10(np.abs(x).max() + 1e-12)
    print(f'{os.path.basename(path)}: {a.codec_context.name} {sr} Hz, {n / sr:.2f}s · loudness {loud:.1f} LUFS'
          + ('' if abs(loud + 16) < 1.5 else '  <-- the mix aims at -16') + f' · peak {peak:.1f} dBFS' + ('' if peak <= -0.9 else '  <-- above -1 dBFS'))

    vpath = os.path.join(ROOT, 'build', args.cut, 'voice.json')
    cues = json.load(open(vpath, encoding='utf-8'))['cues'] if timing.get('voice') and os.path.exists(vpath) else []
    if cues:
        speak = np.zeros(n, bool)
        for q in cues:
            speak[int(q['start'] * sr):int(q['end'] * sr)] = True
        quiet = ~speak
        quiet[:sr] = False
        quiet[-sr:] = False
        mid, side = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2
        gap = rms(mid[speak]) - rms(side[speak])
        print(f'  while speaking {rms(x[speak]):.1f} dBFS rms · between lines {rms(x[quiet]):.1f} dBFS rms · speech covers {100 * speak.mean():.0f}% of the film')
        print(f'  voice about {gap:.0f} dB above the bed while speaking' + ('' if 10 <= gap <= 20 else '  <-- usually 12-18 dB: check the mix'))
    # the binaural pair, in the longest stretch without speech
    gaps, prev = [], 0.0
    for q in cues + [{'start': n / sr - 0.8, 'end': n / sr}]:
        gaps.append((q['start'] - prev, prev))
        prev = q['end']
    length, g0 = max(gaps)
    N = 1 << int(np.floor(np.log2(max(4096.0, (length - 0.6) * sr))))
    seg = x[int((g0 + 0.3) * sr):int((g0 + 0.3) * sr) + N]
    if len(seg) >= 4096:
        win = np.hanning(len(seg))
        fr = np.fft.rfftfreq(len(seg), 1 / sr)
        level = {}
        for ch, name in ((0, 'left'), (1, 'right')):
            S = 20 * np.log10(np.abs(np.fft.rfft(seg[:, ch] * win)) / (win.sum() / 2) + 1e-12)
            level[name] = {hz: float(S[(fr > hz - 6) & (fr < hz + 6)].max()) for hz in (200, 240)}
        ok = level['left'][200] - level['left'][240] > 30 and level['right'][240] - level['right'][200] > 30
        print(f"  binaural pair ({length:.1f}s without speech at {g0:.1f}s): left 200 Hz {level['left'][200]:.1f} dB / 240 Hz {level['left'][240]:.1f} dB · "
              f"right 200 Hz {level['right'][200]:.1f} dB / 240 Hz {level['right'][240]:.1f} dB" + ('  — separate' if ok else '  <-- the two ears are not separate (another bed, or a mono fold-down?)'))


if __name__ == '__main__':
    main()
